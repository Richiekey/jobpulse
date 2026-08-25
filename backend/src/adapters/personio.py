from typing import List, Dict, Any, Optional
from bs4 import BeautifulSoup

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

class PersonioAdapter(BaseAdapter):
    platform = ATSPlatform.PERSONIO

    async def fetch_jobs(self, company_identifier: str) -> List[Dict[str, Any]]:
        """Fetch all public job postings for a company from Personio XML feed."""
        urls = [
            f"https://{company_identifier}.jobs.personio.com/xml",
            f"https://{company_identifier}.jobs.personio.de/xml"
        ]
        for url in urls:
            try:
                response = await self.client.get(url)
                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, "xml")
                    positions = soup.find_all("position")
                    jobs = []
                    for pos in positions:
                        jid = pos.find("id")
                        name = pos.find("name")
                        office = pos.find("office")
                        dept = pos.find("department")
                        desc = pos.find("jobDescriptions")
                        emp_type = pos.find("employmentType")

                        jobs.append({
                            "id": jid.get_text(strip=True) if jid else "",
                            "title": name.get_text(strip=True) if name else "",
                            "office": office.get_text(strip=True) if office else "",
                            "department": dept.get_text(strip=True) if dept else "",
                            "description": str(desc) if desc else "",
                            "employmentType": emp_type.get_text(strip=True) if emp_type else "",
                        })
                    if jobs:
                        return jobs
            except Exception as e:
                logger.warn("personio_fetch_error", url=url, error=str(e))
                continue
        return []

    async def fetch_job_details(self, company_identifier: str, job_id: str) -> Optional[Dict[str, Any]]:
        return None

    def normalize(self, raw_job: Dict[str, Any], company_name: str, company_identifier: str) -> NormalizedJob:
        job_id = str(raw_job.get("id") or "")
        title = (raw_job.get("title") or "").strip()
        desc = raw_job.get("description") or f"<p>{title} at {company_name}</p>"
        parsed_loc = parse_location(raw_job.get("office"))

        emp_type = normalize_employment_type(raw_job.get("employmentType") or title) or normalize_employment_type(desc)
        salary_info = parse_salary(desc) if desc else {"min": None, "max": None, "currency": None, "period": None}
        job_url = f"https://{company_identifier}.jobs.personio.com/job/{job_id}"

        return NormalizedJob(
            source=self.platform,
            source_job_id=job_id,
            source_company_id=company_identifier,
            title=title,
            company_name=company_name,
            company_url=f"https://{company_identifier}.jobs.personio.com",
            location=parsed_loc["location"],
            country=parsed_loc.get("country"),
            city=parsed_loc.get("city"),
            remote_type=parsed_loc["remote_type"],
            employment_type=emp_type,
            department=raw_job.get("department"),
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
