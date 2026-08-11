from typing import List, Dict, Any, Optional
from datetime import datetime
import html

from src.adapters.base import BaseAdapter
from src.models.enums import ATSPlatform, RemoteType, EmploymentType, JobStatus
from src.models.job import NormalizedJob, LocationDetail
from src.core.normalizer import (
    normalize_employment_type,
    normalize_remote_type,
    parse_location,
    parse_salary
)

class GreenhouseAdapter(BaseAdapter):
    platform = ATSPlatform.GREENHOUSE

    async def fetch_jobs(self, company_identifier: str) -> List[Dict[str, Any]]:
        url = f"https://boards-api.greenhouse.io/v1/boards/{company_identifier}/jobs?content=true"
        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                return []
            data = response.json()
            return data.get("jobs", [])
        except Exception:
            return []

    async def fetch_job_details(self, company_identifier: str, job_id: str) -> Optional[Dict[str, Any]]:
        url = f"https://boards-api.greenhouse.io/v1/boards/{company_identifier}/jobs/{job_id}?questions=true"
        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                return None
            return response.json()
        except Exception:
            return None

    def normalize(self, raw_job: Dict[str, Any], company_name: str, company_identifier: str) -> NormalizedJob:
        job_id = str(raw_job.get("id"))
        title = raw_job.get("title", "").strip()

        raw_location_str = None
        if raw_job.get("location"):
            raw_location_str = raw_job["location"].get("name")
        
        parsed_loc = parse_location(raw_location_str)

        locations_list = []
        offices = raw_job.get("offices", [])
        for office in offices:
            off_loc = office.get("location") or office.get("name")
            if off_loc:
                p = parse_location(off_loc)
                locations_list.append(LocationDetail(
                    city=p.get("city"),
                    country=p.get("country")
                ))

        departments = raw_job.get("departments", [])
        dept_name = departments[0].get("name") if departments else None

        raw_content = raw_job.get("content") or ""
        description = html.unescape(raw_content)

        updated_at_str = raw_job.get("updated_at")
        posted_at = None
        if updated_at_str:
            try:
                posted_at = datetime.fromisoformat(updated_at_str)
            except Exception:
                posted_at = None

        absolute_url = raw_job.get("absolute_url")
        apply_url = f"{absolute_url}#app" if absolute_url else None

        salary_info = {"min": None, "max": None, "currency": None, "period": None}
        employment_type = None

        metadata = raw_job.get("metadata", []) or []
        for meta in metadata:
            name = (meta.get("name") or "").lower()
            val = str(meta.get("value") or "")
            if "salary" in name or "pay" in name or "compensation" in name:
                s = parse_salary(val)
                if s["min"] or s["max"]:
                    salary_info = s
            if "employment" in name or "job type" in name or "commitment" in name:
                employment_type = normalize_employment_type(val)

        if not salary_info["min"] and description:
            salary_info = parse_salary(description)

        if not employment_type:
            employment_type = normalize_employment_type(title) or normalize_employment_type(description)

        return NormalizedJob(
            source=self.platform,
            source_job_id=job_id,
            source_company_id=company_identifier,
            title=title,
            company_name=company_name,
            company_url=f"https://boards.greenhouse.io/{company_identifier}",
            location=parsed_loc["location"],
            locations=locations_list,
            country=parsed_loc["country"],
            city=parsed_loc["city"],
            remote_type=parsed_loc["remote_type"],
            employment_type=employment_type,
            department=dept_name,
            description=description,
            salary_min=salary_info["min"],
            salary_max=salary_info["max"],
            salary_currency=salary_info["currency"],
            salary_period=salary_info["period"],
            job_url=absolute_url,
            apply_url=apply_url,
            posted_at=posted_at,
            status=JobStatus.ACTIVE
        )
