from typing import List, Dict, Any, Optional
from datetime import datetime

from src.adapters.base import BaseAdapter
from src.models.enums import ATSPlatform, RemoteType, EmploymentType, JobStatus
from src.models.job import NormalizedJob
from src.core.normalizer import (
    normalize_employment_type,
    normalize_remote_type,
    parse_location,
    parse_salary
)
from src.utils.logger import logger

class RecruiteeAdapter(BaseAdapter):
    platform = ATSPlatform.RECRUITEE

    async def fetch_jobs(self, company_identifier: str) -> List[Dict[str, Any]]:
        """Fetch all public job postings for a company from Recruitee API."""
        url = f"https://{company_identifier}.recruitee.com/api/offers"
        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                return []
            data = response.json()
            return data.get("offers", [])
        except Exception as e:
            logger.warn("recruitee_fetch_jobs_error", company=company_identifier, error=str(e))
            return []

    async def fetch_job_details(self, company_identifier: str, job_id: str) -> Optional[Dict[str, Any]]:
        url = f"https://{company_identifier}.recruitee.com/api/offers/{job_id}"
        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                return None
            data = response.json()
            return data.get("offer")
        except Exception:
            return None

    def normalize(self, raw_job: Dict[str, Any], company_name: str, company_identifier: str) -> NormalizedJob:
        job_id = str(raw_job.get("id", ""))
        title = (raw_job.get("title") or "").strip()

        city = raw_job.get("city")
        country = raw_job.get("country")
        raw_loc = raw_job.get("location") or ", ".join(filter(None, [city, country]))
        parsed_loc = parse_location(raw_loc)

        if raw_job.get("remote") is True:
            parsed_loc["remote_type"] = RemoteType.REMOTE

        dept = raw_job.get("department")
        desc = raw_job.get("description") or ""
        reqs = raw_job.get("requirements") or ""
        full_description = f"{desc}\n{reqs}".strip() or f"<p>{title} at {company_name}</p>"

        emp_type = normalize_employment_type(title) or normalize_employment_type(full_description)
        salary_info = parse_salary(full_description) if full_description else {"min": None, "max": None, "currency": None, "period": None}

        job_url = raw_job.get("careers_url") or f"https://{company_identifier}.recruitee.com/o/{raw_job.get('slug', job_id)}"

        posted_at = None
        created_str = raw_job.get("created_at") or raw_job.get("published_at")
        if created_str:
            try:
                posted_at = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
            except Exception:
                posted_at = None

        return NormalizedJob(
            source=self.platform,
            source_job_id=job_id,
            source_company_id=company_identifier,
            title=title,
            company_name=company_name,
            company_url=f"https://{company_identifier}.recruitee.com",
            location=parsed_loc["location"],
            country=country or parsed_loc.get("country"),
            city=city or parsed_loc.get("city"),
            remote_type=parsed_loc["remote_type"],
            employment_type=emp_type,
            department=dept,
            description=full_description,
            salary_min=salary_info.get("min"),
            salary_max=salary_info.get("max"),
            salary_currency=salary_info.get("currency"),
            salary_period=salary_info.get("period"),
            job_url=job_url,
            apply_url=job_url,
            posted_at=posted_at,
            status=JobStatus.ACTIVE
        )
