from typing import List, Dict, Any, Optional
from datetime import datetime
import re
import json
import html
from bs4 import BeautifulSoup

from src.adapters.base import BaseAdapter
from src.models.enums import ATSPlatform, RemoteType, EmploymentType, JobStatus
from src.models.job import NormalizedJob, LocationDetail
from src.core.normalizer import (
    normalize_employment_type,
    normalize_remote_type,
    parse_location,
    parse_salary
)
from src.utils.logger import logger

class RecruiterflowAdapter(BaseAdapter):
    platform = ATSPlatform.RECRUITERFLOW

    async def fetch_jobs(self, company_identifier: str) -> List[Dict[str, Any]]:
        """Fetch job postings for a company by parsing window.jobsList from Recruiterflow career page."""
        url = f"https://recruiterflow.com/{company_identifier}/jobs"
        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                logger.warn("recruiterflow_fetch_failed", company=company_identifier, status=response.status_code)
                return []

            # Look for window.jobsList in script
            match = re.search(r"window\.jobsList\s*=\s*(\{.*?\});\s*(?:window|\n|<)", response.text, re.DOTALL)
            if not match:
                return []

            data = json.loads(match.group(1))
            all_jobs = []
            seen_ids = set()

            for dept_name, jobs in data.get("department", []):
                for j in jobs:
                    jid = str(j.get("job_id") or j.get("id"))
                    if jid and jid not in seen_ids:
                        seen_ids.add(jid)
                        j["_department"] = dept_name
                        all_jobs.append(j)

            return all_jobs
        except Exception as e:
            logger.error("recruiterflow_fetch_error", company=company_identifier, error=str(e))
            return []

    async def fetch_job_details(self, company_identifier: str, job_id: str) -> Optional[Dict[str, Any]]:
        """Fetch individual job detail page."""
        url = f"https://recruiterflow.com/{company_identifier}/jobs/{job_id}"
        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                return None

            soup = BeautifulSoup(response.text, "lxml")
            desc_el = soup.select_one(".job-description, .description, #job-description, .job-details")
            desc_html = str(desc_el) if desc_el else ""

            return {
                "id": job_id,
                "description": desc_html,
            }
        except Exception:
            return None

    def normalize(self, raw_job: Dict[str, Any], company_name: str, company_identifier: str) -> NormalizedJob:
        job_id = str(raw_job.get("job_id") or raw_job.get("id") or "")
        title = (raw_job.get("job_name") or raw_job.get("title") or "").strip()

        raw_location = raw_job.get("details") or raw_job.get("location") or ""
        parsed_loc = parse_location(raw_location)

        # Check explicit remote_type
        rt_raw = (raw_job.get("remote_type") or "").lower()
        if "remote" in rt_raw:
            parsed_loc["remote_type"] = RemoteType.REMOTE
        elif "hybrid" in rt_raw:
            parsed_loc["remote_type"] = RemoteType.HYBRID

        dept_name = raw_job.get("_department")

        emp_raw = raw_job.get("employment_type") or ""
        emp_type = normalize_employment_type(emp_raw) or normalize_employment_type(title)

        description = raw_job.get("description") or f"<p>{title} at {company_name}</p>"

        salary_info = parse_salary(description) if description else {"min": None, "max": None, "currency": None, "period": None}

        posted_at = None
        last_opened = raw_job.get("last_opened")
        if last_opened:
            try:
                posted_at = datetime.fromisoformat(last_opened.replace("+0000", "+00:00"))
            except Exception:
                posted_at = None

        apply_link = raw_job.get("apply_link")
        job_url = f"https://recruiterflow.com/{apply_link}" if apply_link else f"https://recruiterflow.com/{company_identifier}/jobs/{job_id}"

        return NormalizedJob(
            source=self.platform,
            source_job_id=job_id,
            source_company_id=company_identifier,
            title=title,
            company_name=company_name,
            company_url=f"https://recruiterflow.com/{company_identifier}/jobs",
            location=parsed_loc["location"],
            country=parsed_loc.get("country"),
            city=parsed_loc.get("city"),
            remote_type=parsed_loc["remote_type"],
            employment_type=emp_type,
            department=dept_name,
            description=description,
            salary_min=salary_info.get("min"),
            salary_max=salary_info.get("max"),
            salary_currency=salary_info.get("currency"),
            salary_period=salary_info.get("period"),
            job_url=job_url,
            apply_url=job_url,
            posted_at=posted_at,
            status=JobStatus.ACTIVE
        )
