from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import html
from bs4 import BeautifulSoup

from src.adapters.base import BaseAdapter
from src.models.enums import ATSPlatform, RemoteType, EmploymentType, JobStatus
from src.models.job import NormalizedJob, LocationDetail
from src.core.normalizer import (
    normalize_employment_type,
    normalize_remote_type,
    parse_location,
    parse_salary
)
from src.utils.logger import logger

class RipplingAdapter(BaseAdapter):
    platform = ATSPlatform.RIPPLING

    async def fetch_jobs(self, company_identifier: str) -> List[Dict[str, Any]]:
        """Scrape Rippling career board HTML and extract job items from __NEXT_DATA__."""
        url = f"https://ats.rippling.com/{company_identifier}/jobs"
        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                logger.warn("rippling_fetch_jobs_failed", company=company_identifier, status=response.status_code)
                return []

            soup = BeautifulSoup(response.text, "lxml")
            next_data = soup.find("script", id="__NEXT_DATA__")
            if not next_data or not next_data.string:
                return []

            data = json.loads(next_data.string)
            queries = data.get("props", {}).get("pageProps", {}).get("dehydratedState", {}).get("queries", [])
            
            jobs = []
            for q in queries:
                q_key = q.get("queryKey", [])
                if isinstance(q_key, list) and "job-posts" in q_key:
                    items = q.get("state", {}).get("data", {}).get("items", [])
                    jobs.extend(items)

            return jobs
        except Exception as e:
            logger.error("rippling_fetch_jobs_error", company=company_identifier, error=str(e))
            return []

    async def fetch_job_details(self, company_identifier: str, job_id: str) -> Optional[Dict[str, Any]]:
        """Fetch individual job posting page to extract full description from __NEXT_DATA__."""
        url = f"https://ats.rippling.com/{company_identifier}/jobs/{job_id}"
        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                return None

            soup = BeautifulSoup(response.text, "lxml")
            next_data = soup.find("script", id="__NEXT_DATA__")
            if not next_data or not next_data.string:
                return None

            data = json.loads(next_data.string)
            queries = data.get("props", {}).get("pageProps", {}).get("dehydratedState", {}).get("queries", [])
            for q in queries:
                q_key = q.get("queryKey", [])
                if isinstance(q_key, list) and ("job-post" in q_key or "job" in q_key):
                    job_data = q.get("state", {}).get("data", {})
                    if isinstance(job_data, dict) and job_data.get("id") == job_id:
                        return job_data

            return None
        except Exception as e:
            logger.error("rippling_fetch_details_error", job_id=job_id, error=str(e))
            return None

    def normalize(self, raw_job: Dict[str, Any], company_name: str, company_identifier: str) -> NormalizedJob:
        job_id = str(raw_job.get("id"))
        title = (raw_job.get("name") or raw_job.get("title") or "").strip()

        # Locations & Remote
        locations_list = []
        raw_locs = raw_job.get("locations", [])
        city = None
        country = None
        remote_type = RemoteType.UNKNOWN

        for l in raw_locs:
            if isinstance(l, dict):
                c = l.get("city")
                co = l.get("country")
                if not city and c: city = c
                if not country and co: country = co
                wp = (l.get("workplaceType") or "").upper()
                if wp == "REMOTE":
                    remote_type = RemoteType.REMOTE
                elif wp == "HYBRID":
                    remote_type = RemoteType.HYBRID
                elif wp in ["ON_SITE", "ONSITE"]:
                    remote_type = RemoteType.ONSITE
                locations_list.append(LocationDetail(city=c, country=co))

        location_str = ", ".join(filter(None, [city, country])) if (city or country) else None
        if not location_str:
            loc_parsed = parse_location(raw_job.get("location"))
            location_str = loc_parsed["location"]
            if remote_type == RemoteType.UNKNOWN:
                remote_type = loc_parsed["remote_type"]

        # Department
        dept = raw_job.get("department")
        dept_name = dept.get("name") if isinstance(dept, dict) else (dept if isinstance(dept, str) else None)

        # Description
        description = raw_job.get("description") or raw_job.get("content") or f"<p>{title} at {company_name}</p>"

        # Employment type
        emp_type = normalize_employment_type(title) or normalize_employment_type(description)

        # Salary parsing
        salary_info = parse_salary(description) if description else {"min": None, "max": None, "currency": None, "period": None}

        job_url = raw_job.get("url") or f"https://ats.rippling.com/{company_identifier}/jobs/{job_id}"

        return NormalizedJob(
            source=self.platform,
            source_job_id=job_id,
            source_company_id=company_identifier,
            title=title,
            company_name=company_name,
            company_url=f"https://ats.rippling.com/{company_identifier}/jobs",
            location=location_str,
            locations=locations_list,
            country=country,
            city=city,
            remote_type=remote_type,
            employment_type=emp_type,
            department=dept_name,
            description=description,
            salary_min=salary_info.get("min"),
            salary_max=salary_info.get("max"),
            salary_currency=salary_info.get("currency"),
            salary_period=salary_info.get("period"),
            job_url=job_url,
            apply_url=job_url,
            posted_at=None,
            status=JobStatus.ACTIVE
        )
