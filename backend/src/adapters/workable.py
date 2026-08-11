from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from src.adapters.base import BaseAdapter
from src.models.enums import ATSPlatform, JobStatus
from src.models.job import NormalizedJob
from src.core.normalizer import (
    normalize_employment_type,
    normalize_remote_type,
    parse_location,
    parse_salary
)


class WorkableAdapter(BaseAdapter):
    """
    Workable ATS adapter.
    Uses the public widget API: GET /api/v1/widget/accounts/{slug}
    Returns all published jobs in a single response (no pagination needed).
    """
    platform = ATSPlatform.WORKABLE

    async def fetch_jobs(self, company_identifier: str) -> List[Dict[str, Any]]:
        url = f"https://apply.workable.com/api/v1/widget/accounts/{company_identifier}"
        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                return []
            data = response.json()
            return data.get("jobs", [])
        except Exception:
            return []

    async def fetch_job_details(self, company_identifier: str, job_id: str) -> Optional[Dict[str, Any]]:
        """Fetch full job details from the Workable job page."""
        url = f"https://apply.workable.com/api/v1/widget/accounts/{company_identifier}/jobs/{job_id}"
        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                return None
            return response.json()
        except Exception:
            return None

    def normalize(self, raw_job: Dict[str, Any], company_name: str, company_identifier: str) -> NormalizedJob:
        job_id = str(raw_job.get("shortcode") or raw_job.get("id", ""))
        title = (raw_job.get("title") or "").strip()

        # Location
        location_obj = raw_job.get("location") or {}
        location_parts = []
        if location_obj.get("city"):
            location_parts.append(location_obj["city"])
        if location_obj.get("region"):
            location_parts.append(location_obj["region"])
        if location_obj.get("country"):
            location_parts.append(location_obj["country"])
        raw_location = ", ".join(location_parts) if location_parts else raw_job.get("location_name")
        parsed_loc = parse_location(raw_location)

        # Remote type
        is_remote = raw_job.get("telecommuting", False)
        if is_remote:
            remote_type = normalize_remote_type("remote")
        else:
            remote_type = parsed_loc["remote_type"]

        # Department
        department = raw_job.get("department")

        # Employment type
        raw_type = raw_job.get("employment_type") or raw_job.get("type")
        employment_type = normalize_employment_type(raw_type) or normalize_employment_type(title)

        # Description
        description = raw_job.get("description") or raw_job.get("full_description") or ""
        requirements = raw_job.get("requirements") or ""
        benefits = raw_job.get("benefits") or ""
        if requirements:
            description += f"\n<h3>Requirements</h3>\n{requirements}"
        if benefits:
            description += f"\n<h3>Benefits</h3>\n{benefits}"

        # Salary
        salary_info = parse_salary(description) if description else {
            "min": None, "max": None, "currency": None, "period": None
        }

        # Date
        created_str = raw_job.get("created_at") or raw_job.get("published_on")
        posted_at = None
        if created_str:
            try:
                posted_at = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
            except Exception:
                pass

        # URLs
        job_url = raw_job.get("url") or f"https://apply.workable.com/{company_identifier}/j/{job_id}/"
        apply_url = raw_job.get("application_url") or f"{job_url}apply/"

        return NormalizedJob(
            source=self.platform,
            source_job_id=job_id,
            source_company_id=company_identifier,
            title=title,
            company_name=company_name,
            company_url=f"https://apply.workable.com/{company_identifier}",
            location=parsed_loc["location"],
            country=parsed_loc.get("country"),
            city=parsed_loc.get("city"),
            remote_type=remote_type,
            employment_type=employment_type,
            department=department,
            description=description,
            salary_min=salary_info["min"],
            salary_max=salary_info["max"],
            salary_currency=salary_info["currency"],
            salary_period=salary_info["period"],
            job_url=job_url,
            apply_url=apply_url,
            posted_at=posted_at,
            status=JobStatus.ACTIVE
        )
