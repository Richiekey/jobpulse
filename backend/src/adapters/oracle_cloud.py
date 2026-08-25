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

class OracleCloudAdapter(BaseAdapter):
    platform = ATSPlatform.ORACLE_CLOUD

    async def fetch_jobs(self, company_identifier: str) -> List[Dict[str, Any]]:
        """Fetch jobs from Oracle Cloud HCM public REST API if available."""
        # Generic Oracle Cloud HCM endpoint pattern
        url = f"https://{company_identifier}.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions"
        try:
            response = await self.client.get(f"{url}?limit=50")
            if response.status_code != 200:
                return []
            data = response.json()
            return data.get("items", [])
        except Exception as e:
            logger.warn("oracle_cloud_fetch_jobs_error", company=company_identifier, error=str(e))
            return []

    async def fetch_job_details(self, company_identifier: str, job_id: str) -> Optional[Dict[str, Any]]:
        return None

    def normalize(self, raw_job: Dict[str, Any], company_name: str, company_identifier: str) -> NormalizedJob:
        job_id = str(raw_job.get("Id") or raw_job.get("id") or "")
        title = (raw_job.get("Title") or raw_job.get("title") or "").strip()
        desc = raw_job.get("ShortDescriptionStr") or raw_job.get("description") or f"<p>{title} at {company_name}</p>"
        parsed_loc = parse_location(raw_job.get("PrimaryLocation"))

        emp_type = normalize_employment_type(title) or normalize_employment_type(desc)
        salary_info = parse_salary(desc) if desc else {"min": None, "max": None, "currency": None, "period": None}
        job_url = f"https://{company_identifier}.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/job/{job_id}"

        return NormalizedJob(
            source=self.platform,
            source_job_id=job_id,
            source_company_id=company_identifier,
            title=title,
            company_name=company_name,
            company_url=f"https://{company_identifier}.oraclecloud.com",
            location=parsed_loc["location"],
            country=parsed_loc.get("country"),
            city=parsed_loc.get("city"),
            remote_type=parsed_loc["remote_type"],
            employment_type=emp_type,
            department=raw_job.get("Department"),
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
