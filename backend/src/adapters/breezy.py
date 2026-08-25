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

class BreezyAdapter(BaseAdapter):
    platform = ATSPlatform.BREEZY

    async def fetch_jobs(self, company_identifier: str) -> List[Dict[str, Any]]:
        """Fetch all public job postings for a company from Breezy HR JSON endpoint."""
        url = f"https://{company_identifier}.breezy.hr/json"
        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                return []
            data = response.json()
            return data if isinstance(data, list) else data.get("positions", [])
        except Exception as e:
            logger.warn("breezy_fetch_jobs_error", company=company_identifier, error=str(e))
            return []

    async def fetch_job_details(self, company_identifier: str, job_id: str) -> Optional[Dict[str, Any]]:
        url = f"https://{company_identifier}.breezy.hr/p/{job_id}/json"
        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                return None
            return response.json()
        except Exception:
            return None

    def normalize(self, raw_job: Dict[str, Any], company_name: str, company_identifier: str) -> NormalizedJob:
        job_id = str(raw_job.get("id") or raw_job.get("_id") or "")
        title = (raw_job.get("name") or raw_job.get("title") or "").strip()

        loc_obj = raw_job.get("location") or {}
        city = loc_obj.get("city") if isinstance(loc_obj, dict) else None
        country = loc_obj.get("country", {}).get("name") if isinstance(loc_obj, dict) and isinstance(loc_obj.get("country"), dict) else None
        raw_loc = loc_obj.get("name") if isinstance(loc_obj, dict) else (loc_obj if isinstance(loc_obj, str) else "")
        parsed_loc = parse_location(raw_loc)

        if raw_job.get("remote") or (isinstance(loc_obj, dict) and loc_obj.get("is_remote")):
            parsed_loc["remote_type"] = RemoteType.REMOTE

        dept = raw_job.get("department")
        desc = raw_job.get("description") or f"<p>{title} at {company_name}</p>"

        type_obj = raw_job.get("type") or {}
        type_name = type_obj.get("name") if isinstance(type_obj, dict) else (type_obj if isinstance(type_obj, str) else "")
        emp_type = normalize_employment_type(type_name or title) or normalize_employment_type(desc)

        salary_info = parse_salary(desc) if desc else {"min": None, "max": None, "currency": None, "period": None}
        job_url = raw_job.get("url") or f"https://{company_identifier}.breezy.hr/p/{job_id}"

        posted_at = None
        created_str = raw_job.get("published_date") or raw_job.get("created")
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
            company_url=f"https://{company_identifier}.breezy.hr",
            location=parsed_loc["location"],
            country=country or parsed_loc.get("country"),
            city=city or parsed_loc.get("city"),
            remote_type=parsed_loc["remote_type"],
            employment_type=emp_type,
            department=dept,
            description=desc,
            salary_min=salary_info.get("min"),
            salary_max=salary_info.get("max"),
            salary_currency=salary_info.get("currency"),
            salary_period=salary_info.get("period"),
            job_url=job_url,
            apply_url=job_url,
            posted_at=posted_at,
            status=JobStatus.ACTIVE
        )
