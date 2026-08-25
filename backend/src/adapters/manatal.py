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

class ManatalAdapter(BaseAdapter):
    platform = ATSPlatform.MANATAL

    async def fetch_jobs(self, company_identifier: str) -> List[Dict[str, Any]]:
        """Fetch jobs from Manatal / open.careers-page.com API."""
        url = f"https://open.careers-page.com/api/v1/companies/{company_identifier}/jobs"
        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                return []
            data = response.json()
            if isinstance(data, list):
                return data
            return data.get("results", data.get("jobs", []))
        except Exception as e:
            logger.warn("manatal_fetch_jobs_error", company=company_identifier, error=str(e))
            return []

    async def fetch_job_details(self, company_identifier: str, job_id: str) -> Optional[Dict[str, Any]]:
        url = f"https://open.careers-page.com/api/v1/companies/{company_identifier}/jobs/{job_id}"
        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                return None
            return response.json()
        except Exception:
            return None

    def normalize(self, raw_job: Dict[str, Any], company_name: str, company_identifier: str) -> NormalizedJob:
        job_id = str(raw_job.get("id") or raw_job.get("hash_id") or "")
        title = (raw_job.get("title") or raw_job.get("name") or "").strip()

        city = raw_job.get("city")
        country = raw_job.get("country")
        loc_str = ", ".join(filter(None, [city, country])) or raw_job.get("location")
        parsed_loc = parse_location(loc_str)

        if raw_job.get("is_remote") or raw_job.get("remote"):
            parsed_loc["remote_type"] = RemoteType.REMOTE

        dept = raw_job.get("department") or raw_job.get("category")
        description = raw_job.get("description") or f"<p>{title} at {company_name}</p>"

        emp_type = normalize_employment_type(raw_job.get("contract_type") or title) or normalize_employment_type(description)
        salary_info = parse_salary(description) if description else {"min": None, "max": None, "currency": None, "period": None}

        job_url = raw_job.get("canonical_url") or f"https://careers-page.com/{company_identifier}/job/{job_id}"

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
            company_url=f"https://careers-page.com/{company_identifier}",
            location=parsed_loc["location"],
            country=country or parsed_loc.get("country"),
            city=city or parsed_loc.get("city"),
            remote_type=parsed_loc["remote_type"],
            employment_type=emp_type,
            department=dept,
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
