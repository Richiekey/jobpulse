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

class ADPAdapter(BaseAdapter):
    platform = ATSPlatform.ADP

    async def fetch_jobs(self, company_identifier: str) -> List[Dict[str, Any]]:
        """Fetch jobs from ADP Workforce Now public portal."""
        url = f"https://workforcenow.adp.com/mascsr/default/careercenter/public/events/staffing/v1/job-requisitions?cid={company_identifier}"
        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                return []
            data = response.json()
            return data.get("jobRequisitions", [])
        except Exception as e:
            logger.warn("adp_fetch_jobs_error", company=company_identifier, error=str(e))
            return []

    async def fetch_job_details(self, company_identifier: str, job_id: str) -> Optional[Dict[str, Any]]:
        return None

    def normalize(self, raw_job: Dict[str, Any], company_name: str, company_identifier: str) -> NormalizedJob:
        job_id = str(raw_job.get("customJobID") or raw_job.get("itemID") or "")
        title = (raw_job.get("requisitionTitle") or "").strip()
        desc = raw_job.get("requisitionDescription") or f"<p>{title} at {company_name}</p>"

        loc_data = raw_job.get("requisitionLocations", [{}])[0] if raw_job.get("requisitionLocations") else {}
        city = loc_data.get("address", {}).get("cityName")
        country = loc_data.get("address", {}).get("countrySubdivisionLevel1", {}).get("codeValue")
        parsed_loc = parse_location(", ".join(filter(None, [city, country])))

        emp_type = normalize_employment_type(title) or normalize_employment_type(desc)
        salary_info = parse_salary(desc) if desc else {"min": None, "max": None, "currency": None, "period": None}
        job_url = f"https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid={company_identifier}&jobId={job_id}"

        return NormalizedJob(
            source=self.platform,
            source_job_id=job_id,
            source_company_id=company_identifier,
            title=title,
            company_name=company_name,
            company_url=f"https://workforcenow.adp.com",
            location=parsed_loc["location"],
            country=country or parsed_loc.get("country"),
            city=city or parsed_loc.get("city"),
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
