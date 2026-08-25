from typing import List, Dict, Any, Optional

from src.adapters.base import BaseAdapter
from src.models.enums import ATSPlatform, JobStatus
from src.models.job import NormalizedJob
from src.core.normalizer import (
    normalize_employment_type,
    normalize_remote_type,
    parse_location,
    parse_salary
)
from src.utils.logger import logger

class TeamtailorAdapter(BaseAdapter):
    platform = ATSPlatform.TEAMTAILOR

    async def fetch_jobs(self, company_identifier: str) -> List[Dict[str, Any]]:
        """Fetch jobs from Teamtailor career site."""
        url = f"https://{company_identifier}.teamtailor.com/jobs"
        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                return []
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(response.text, "lxml")
            jobs = []
            links = soup.select("a[href*='/jobs/']")
            for link in links:
                title = link.get_text(strip=True)
                href = link.get("href", "")
                if title and "/jobs/" in href:
                    jobs.append({"id": href.split("/")[-1], "title": title, "url": href if href.startswith("http") else f"https://{company_identifier}.teamtailor.com{href}"})
            return jobs
        except Exception as e:
            logger.warn("teamtailor_fetch_error", company=company_identifier, error=str(e))
            return []

    async def fetch_job_details(self, company_identifier: str, job_id: str) -> Optional[Dict[str, Any]]:
        return None

    def normalize(self, raw_job: Dict[str, Any], company_name: str, company_identifier: str) -> NormalizedJob:
        job_id = str(raw_job.get("id") or "")
        title = (raw_job.get("title") or "").strip()
        desc = raw_job.get("description") or f"<p>{title} at {company_name}</p>"
        parsed_loc = parse_location(raw_job.get("location"))

        emp_type = normalize_employment_type(title) or normalize_employment_type(desc)
        salary_info = parse_salary(desc) if desc else {"min": None, "max": None, "currency": None, "period": None}
        job_url = raw_job.get("url") or f"https://{company_identifier}.teamtailor.com/jobs/{job_id}"

        return NormalizedJob(
            source=self.platform,
            source_job_id=job_id,
            source_company_id=company_identifier,
            title=title,
            company_name=company_name,
            company_url=f"https://{company_identifier}.teamtailor.com",
            location=parsed_loc["location"],
            country=parsed_loc.get("country"),
            city=parsed_loc.get("city"),
            remote_type=parsed_loc["remote_type"],
            employment_type=emp_type,
            department=None,
            description=desc,
            salary_min=salary_info.get("min"),
            salary_max=salary_info.get("max"),
            salary_currency=salary_info.get("currency"),
            salary_period=salary_info.get("period"),
            job_url=job_url,
            apply_url=job_url,
            posted_at=None,
            status=JobStatus.ACTIVE
        )
