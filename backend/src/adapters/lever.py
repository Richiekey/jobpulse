from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from src.adapters.base import BaseAdapter
from src.models.enums import ATSPlatform, RemoteType, EmploymentType, JobStatus
from src.models.job import NormalizedJob
from src.core.normalizer import (
    normalize_employment_type,
    normalize_remote_type,
    parse_location,
    parse_salary
)

class LeverAdapter(BaseAdapter):
    platform = ATSPlatform.LEVER

    async def fetch_jobs(self, company_identifier: str) -> List[Dict[str, Any]]:
        url = f"https://api.lever.co/v0/postings/{company_identifier}?mode=json"
        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                return []
            data = response.json()
            if isinstance(data, list):
                return data
            return []
        except Exception:
            return []

    async def fetch_job_details(self, company_identifier: str, job_id: str) -> Optional[Dict[str, Any]]:
        url = f"https://api.lever.co/v0/postings/{company_identifier}/{job_id}"
        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                return None
            return response.json()
        except Exception:
            return None

    def normalize(self, raw_job: Dict[str, Any], company_name: str, company_identifier: str) -> NormalizedJob:
        job_id = str(raw_job.get("id"))
        title = (raw_job.get("text") or "").strip()

        categories = raw_job.get("categories") or {}
        raw_location_str = categories.get("location")
        parsed_loc = parse_location(raw_location_str)

        # Department / Team
        department = categories.get("department")
        team = categories.get("team")

        # Employment type
        raw_commitment = categories.get("commitment")
        employment_type = normalize_employment_type(raw_commitment) or normalize_employment_type(title)

        # Description construction from main description + lists
        desc_parts = []
        if raw_job.get("description"):
            desc_parts.append(raw_job["description"])

        lists = raw_job.get("lists") or []
        for lst in lists:
            header = lst.get("text", "")
            content = lst.get("content", "")
            if header or content:
                desc_parts.append(f"<h3>{header}</h3>{content}")

        description = "\n".join(desc_parts)

        # Created date (Lever uses Unix milliseconds timestamp)
        created_at_ms = raw_job.get("createdAt")
        posted_at = None
        if created_at_ms:
            try:
                posted_at = datetime.fromtimestamp(created_at_ms / 1000.0, tz=timezone.utc)
            except Exception:
                posted_at = None

        # Salary & Compensation
        salary_info = {"min": None, "max": None, "currency": None, "period": None}
        salary_range = raw_job.get("salaryRange") or {}
        if salary_range and (salary_range.get("min") or salary_range.get("max")):
            salary_info["min"] = salary_range.get("min")
            salary_info["max"] = salary_range.get("max")
            salary_info["currency"] = salary_range.get("currency")
            salary_info["period"] = salary_range.get("interval")
        elif description:
            salary_info = parse_salary(description)

        # URLs
        hosted_url = raw_job.get("hostedUrl") or f"https://jobs.lever.co/{company_identifier}/{job_id}"
        apply_url = raw_job.get("applyUrl") or f"{hosted_url}/apply"

        return NormalizedJob(
            source=self.platform,
            source_job_id=job_id,
            source_company_id=company_identifier,
            title=title,
            company_name=company_name,
            company_url=f"https://jobs.lever.co/{company_identifier}",
            location=parsed_loc["location"],
            country=parsed_loc["country"],
            city=parsed_loc["city"],
            remote_type=parsed_loc["remote_type"],
            employment_type=employment_type,
            department=department,
            team=team,
            description=description,
            salary_min=salary_info["min"],
            salary_max=salary_info["max"],
            salary_currency=salary_info["currency"],
            salary_period=salary_info["period"],
            job_url=hosted_url,
            apply_url=apply_url,
            posted_at=posted_at,
            status=JobStatus.ACTIVE
        )
