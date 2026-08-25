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
from src.utils.logger import logger

class SmartRecruitersAdapter(BaseAdapter):
    platform = ATSPlatform.SMARTRECRUITERS

    async def fetch_jobs(self, company_identifier: str) -> List[Dict[str, Any]]:
        """Fetch all public job postings for a company from SmartRecruiters API with pagination."""
        all_postings = []
        offset = 0
        limit = 100
        max_pages = 10

        for _ in range(max_pages):
            url = f"https://api.smartrecruiters.com/v1/companies/{company_identifier}/postings?limit={limit}&offset={offset}"
            try:
                response = await self.client.get(url)
                if response.status_code != 200:
                    break
                data = response.json()
                content = data.get("content", [])
                if not content:
                    break
                all_postings.extend(content)
                total_found = data.get("totalFound", len(all_postings))
                offset += len(content)
                if offset >= total_found or len(content) < limit:
                    break
            except Exception as e:
                logger.error("smartrecruiters_fetch_jobs_error", company=company_identifier, error=str(e))
                break

        return all_postings

    async def fetch_job_details(self, company_identifier: str, job_id: str) -> Optional[Dict[str, Any]]:
        """Fetch full job details including description and qualifications."""
        url = f"https://api.smartrecruiters.com/v1/companies/{company_identifier}/postings/{job_id}"
        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                return None
            return response.json()
        except Exception:
            return None

    def normalize(self, raw_job: Dict[str, Any], company_name: str, company_identifier: str) -> NormalizedJob:
        job_id = str(raw_job.get("id"))
        title = (raw_job.get("name") or "").strip()

        # Location extraction
        loc_data = raw_job.get("location") or {}
        city = loc_data.get("city")
        region = loc_data.get("region")
        country = loc_data.get("country")
        is_remote_flag = loc_data.get("remote", False)

        loc_parts = [p for p in [city, region, country] if p]
        raw_location_str = ", ".join(loc_parts) if loc_parts else None

        parsed_loc = parse_location(raw_location_str)
        if is_remote_flag:
            parsed_loc["remote_type"] = RemoteType.REMOTE

        # Department
        dept_data = raw_job.get("department") or {}
        dept_name = dept_data.get("label")

        # Employment Type
        emp_type_data = raw_job.get("typeOfEmployment") or {}
        emp_type_label = emp_type_data.get("label") or ""
        employment_type = normalize_employment_type(emp_type_label) or normalize_employment_type(title)

        # Description & sections
        job_ad = raw_job.get("jobAd") or {}
        sections = job_ad.get("sections") or {}
        
        desc_parts = []
        company_desc = sections.get("companyDescription", {}).get("text")
        job_desc = sections.get("jobDescription", {}).get("text")
        qualifications = sections.get("qualifications", {}).get("text")
        additional_info = sections.get("additionalInformation", {}).get("text")

        if job_desc:
            desc_parts.append(f"<div>{job_desc}</div>")
        if qualifications:
            desc_parts.append(f"<div><h3>Qualifications</h3>{qualifications}</div>")
        if additional_info:
            desc_parts.append(f"<div><h3>Additional Information</h3>{additional_info}</div>")
        if company_desc and not desc_parts:
            desc_parts.append(f"<div>{company_desc}</div>")

        description = html.unescape("\n".join(desc_parts)) if desc_parts else f"<p>{title} at {company_name}</p>"

        # Date posted / released
        released_str = raw_job.get("releasedDate") or raw_job.get("createdOn")
        posted_at = None
        if released_str:
            try:
                posted_at = datetime.fromisoformat(released_str.replace("Z", "+00:00"))
            except Exception:
                posted_at = None

        # Compensation / Salary
        salary_info = {"min": None, "max": None, "currency": None, "period": None}
        comp = raw_job.get("compensation") or {}
        if comp.get("min") or comp.get("max"):
            salary_info["min"] = float(comp["min"]) if comp.get("min") else None
            salary_info["max"] = float(comp["max"]) if comp.get("max") else None
            salary_info["currency"] = comp.get("currency") or "USD"
            salary_info["period"] = "YEARLY"
        elif description:
            salary_info = parse_salary(description)

        job_url = f"https://jobs.smartrecruiters.com/{company_identifier}/{job_id}"
        apply_url = f"https://jobs.smartrecruiters.com/oneclick-ui/company/{company_identifier}/publication/{job_id}"

        return NormalizedJob(
            source=self.platform,
            source_job_id=job_id,
            source_company_id=company_identifier,
            title=title,
            company_name=company_name,
            company_url=f"https://jobs.smartrecruiters.com/{company_identifier}",
            location=parsed_loc["location"],
            country=country or parsed_loc.get("country"),
            city=city or parsed_loc.get("city"),
            remote_type=parsed_loc["remote_type"],
            employment_type=employment_type,
            department=dept_name,
            description=description,
            salary_min=salary_info.get("min"),
            salary_max=salary_info.get("max"),
            salary_currency=salary_info.get("currency"),
            salary_period=salary_info.get("period"),
            job_url=job_url,
            apply_url=apply_url,
            posted_at=posted_at,
            status=JobStatus.ACTIVE
        )
