from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import re

from src.adapters.base import BaseAdapter
from src.models.enums import ATSPlatform, RemoteType, EmploymentType, JobStatus
from src.models.job import NormalizedJob
from src.core.normalizer import (
    normalize_employment_type,
    normalize_remote_type,
    parse_location,
    parse_salary
)


class WorkdayAdapter(BaseAdapter):
    """Adapter for Workday myworkdayjobs.com career sites.
    
    Workday uses a POST-based internal API:
    POST https://{tenant}.{wdN}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs
    
    company_identifier format: "tenant/site" (e.g. "nvidia/NVIDIAExternalCareerSite")
    The 'wdN' subdomain (wd1-wd5) is also needed, stored as part of the identifier:
    "nvidia/wd5/NVIDIAExternalCareerSite"
    """
    platform = ATSPlatform.WORKDAY

    def _parse_identifier(self, company_identifier: str):
        """Parse 'tenant/wdN/site' into components."""
        parts = company_identifier.split("/")
        if len(parts) == 3:
            return parts[0], parts[1], parts[2]
        elif len(parts) == 2:
            # Default to wd5 if not specified
            return parts[0], "wd5", parts[1]
        raise ValueError(f"Invalid Workday identifier: {company_identifier}. Expected 'tenant/wdN/site'")

    async def fetch_jobs(self, company_identifier: str) -> List[Dict[str, Any]]:
        tenant, wd_num, site = self._parse_identifier(company_identifier)
        base_url = f"https://{tenant}.{wd_num}.myworkdayjobs.com"
        api_url = f"{base_url}/wday/cxs/{tenant}/{site}/jobs"

        all_jobs = []
        offset = 0
        limit = 20  # Workday default page size

        while True:
            payload = {
                "limit": limit,
                "offset": offset,
                "appliedFacets": {},
                "searchText": "",
            }

            try:
                response = await self.client.post(
                    api_url,
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                if response.status_code != 200:
                    break

                data = response.json()
                job_postings = data.get("jobPostings", [])
                if not job_postings:
                    break

                # Attach base_url and site info to each job for detail fetching
                for job in job_postings:
                    job["_base_url"] = base_url
                    job["_tenant"] = tenant
                    job["_wd_num"] = wd_num
                    job["_site"] = site

                all_jobs.extend(job_postings)
                total = data.get("total", 0)

                offset += limit
                if offset >= total or offset >= 500:  # Cap at 500 to avoid excessive requests
                    break

            except Exception:
                break

        return all_jobs

    async def fetch_job_details(self, company_identifier: str, job_id: str) -> Optional[Dict[str, Any]]:
        tenant, wd_num, site = self._parse_identifier(company_identifier)
        url = f"https://{tenant}.{wd_num}.myworkdayjobs.com/wday/cxs/{tenant}/{site}{job_id}"

        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                return None
            return response.json()
        except Exception:
            return None

    def normalize(self, raw_job: Dict[str, Any], company_name: str, company_identifier: str) -> NormalizedJob:
        title = (raw_job.get("title") or "").strip()
        external_path = raw_job.get("externalPath", "")
        bullet_fields = raw_job.get("bulletFields", [])

        # Job ID from externalPath (e.g., "/job/India-Pune/Title_JR2021957")
        job_id = external_path.split("/")[-1] if external_path else str(hash(title))

        # Location from locationsText (bulletFields contains requisition ID, not location)
        raw_location = raw_job.get("locationsText", "")
        
        parsed_loc = parse_location(raw_location)

        # Posted date
        posted_on = raw_job.get("postedOn")
        posted_at = None
        if posted_on:
            try:
                # Workday formats: "Posted 2 Days Ago", "Posted Today", "Posted 30+ Days Ago"
                if "today" in posted_on.lower():
                    posted_at = datetime.now(timezone.utc)
                elif "yesterday" in posted_on.lower():
                    from datetime import timedelta
                    posted_at = datetime.now(timezone.utc) - timedelta(days=1)
                else:
                    days_match = re.search(r"(\d+)", posted_on)
                    if days_match:
                        from datetime import timedelta
                        days = int(days_match.group(1))
                        posted_at = datetime.now(timezone.utc) - timedelta(days=days)
            except Exception:
                posted_at = None

        # Employment type from bulletFields
        employment_type = None
        for field in bullet_fields:
            if isinstance(field, str):
                et = normalize_employment_type(field)
                if et:
                    employment_type = et
                    break
        if not employment_type:
            employment_type = normalize_employment_type(title)

        # Remote type
        remote_type = parsed_loc.get("remote_type")
        if not remote_type or remote_type == RemoteType.UNKNOWN:
            title_lower = title.lower()
            loc_lower = raw_location.lower()
            if "remote" in title_lower or "remote" in loc_lower:
                remote_type = RemoteType.REMOTE
            elif "hybrid" in title_lower or "hybrid" in loc_lower:
                remote_type = RemoteType.HYBRID

        # Build URLs
        base_url = raw_job.get("_base_url", "")
        tenant = raw_job.get("_tenant", "")
        wd_num = raw_job.get("_wd_num", "wd5")
        site = raw_job.get("_site", "")
        
        job_url = f"{base_url}/en-US{external_path}" if external_path else ""
        apply_url = job_url  # Workday apply is on the same page

        # Salary — Workday rarely exposes salary in the listing API,
        # but we can try to parse from description if we have it
        salary_info = {"min": None, "max": None, "currency": None, "period": None}

        return NormalizedJob(
            source=self.platform,
            source_job_id=job_id,
            source_company_id=company_identifier,
            title=title,
            company_name=company_name,
            company_url=f"https://{tenant}.{wd_num}.myworkdayjobs.com/en-US/{site}",
            location=parsed_loc["location"],
            country=parsed_loc["country"],
            city=parsed_loc["city"],
            remote_type=remote_type,
            employment_type=employment_type,
            department=None,
            team=None,
            description="",  # Description requires a separate detail fetch
            salary_min=salary_info["min"],
            salary_max=salary_info["max"],
            salary_currency=salary_info["currency"],
            salary_period=salary_info["period"],
            job_url=job_url,
            apply_url=apply_url,
            posted_at=posted_at,
            status=JobStatus.ACTIVE,
        )
