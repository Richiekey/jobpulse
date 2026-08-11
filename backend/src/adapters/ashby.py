from typing import List, Dict, Any, Optional
from datetime import datetime

from src.adapters.base import BaseAdapter
from src.models.enums import ATSPlatform, RemoteType, EmploymentType, JobStatus
from src.models.job import NormalizedJob, LocationDetail
from src.core.normalizer import (
    normalize_employment_type,
    normalize_remote_type,
    parse_location,
    parse_salary
)

class AshbyAdapter(BaseAdapter):
    platform = ATSPlatform.ASHBY

    async def fetch_jobs(self, company_identifier: str) -> List[Dict[str, Any]]:
        url = f"https://api.ashbyhq.com/posting-api/job-board/{company_identifier}?includeCompensation=true"
        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                return []
            data = response.json()
            return data.get("jobs", [])
        except Exception:
            return []

    async def fetch_job_details(self, company_identifier: str, job_id: str) -> Optional[Dict[str, Any]]:
        jobs = await self.fetch_jobs(company_identifier)
        for job in jobs:
            if str(job.get("id")) == job_id:
                return job
        return None

    def normalize(self, raw_job: Dict[str, Any], company_name: str, company_identifier: str) -> NormalizedJob:
        job_id = str(raw_job.get("id"))
        title = raw_job.get("title", "").strip()

        raw_location_str = raw_job.get("location")
        workplace_type_str = raw_job.get("workplaceType") or ("Remote" if raw_job.get("isRemote") else None)
        
        parsed_loc = parse_location(raw_location_str, workplace_hint=workplace_type_str)

        address = raw_job.get("address", {}).get("postalAddress", {}) if raw_job.get("address") else {}
        city = address.get("addressLocality") or parsed_loc.get("city")
        country = address.get("addressCountry") or parsed_loc.get("country")

        locations_list = []
        sec_locs = raw_job.get("secondaryLocations", []) or []
        for sec in sec_locs:
            sec_name = sec.get("location")
            if sec_name:
                p = parse_location(sec_name)
                locations_list.append(LocationDetail(city=p.get("city"), country=p.get("country")))

        raw_emp_type = raw_job.get("employmentType")
        employment_type = normalize_employment_type(raw_emp_type)

        department = raw_job.get("department")
        team = raw_job.get("team")

        description = raw_job.get("descriptionHtml") or raw_job.get("descriptionPlain") or ""

        published_at_str = raw_job.get("publishedAt")
        posted_at = None
        if published_at_str:
            try:
                posted_at = datetime.fromisoformat(published_at_str)
            except Exception:
                posted_at = None

        salary_info = {"min": None, "max": None, "currency": None, "period": None}
        comp = raw_job.get("compensation") or {}
        comp_summary = comp.get("compensationTierSummary")
        if comp_summary:
            salary_info = parse_salary(comp_summary)
        
        if not salary_info["min"] and comp.get("compensationTiers"):
            tiers = comp["compensationTiers"]
            if tiers and isinstance(tiers, list):
                t0 = tiers[0]
                salary_info["min"] = t0.get("min")
                salary_info["max"] = t0.get("max")
                salary_info["currency"] = t0.get("currency")

        if not salary_info["min"] and description:
            salary_info = parse_salary(description)

        job_url = raw_job.get("jobUrl") or f"https://jobs.ashbyhq.com/{company_identifier}/{job_id}"
        apply_url = raw_job.get("applyUrl") or f"{job_url}/application"

        return NormalizedJob(
            source=self.platform,
            source_job_id=job_id,
            source_company_id=company_identifier,
            title=title,
            company_name=company_name,
            company_url=f"https://jobs.ashbyhq.com/{company_identifier}",
            location=parsed_loc["location"],
            locations=locations_list,
            country=country,
            city=city,
            remote_type=parsed_loc["remote_type"],
            employment_type=employment_type,
            department=department,
            team=team,
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
