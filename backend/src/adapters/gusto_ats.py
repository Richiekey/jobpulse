from typing import List, Dict, Any, Optional
from bs4 import BeautifulSoup
import re

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

class GustoATSAdapter(BaseAdapter):
    platform = ATSPlatform.GUSTO_ATS

    async def fetch_jobs(self, company_identifier: str) -> List[Dict[str, Any]]:
        """Fetch job postings for a company from Gusto embedded career page."""
        # Clean company identifier
        clean_slug = company_identifier.strip()
        url = f"https://jobs.gusto.com/boards/{clean_slug}"
        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                # If specific posting slug passed
                if "-" in clean_slug:
                    return [{"id": clean_slug, "url": f"https://jobs.gusto.com/postings/{clean_slug}"}]
                return []

            soup = BeautifulSoup(response.text, "lxml")
            jobs = []
            links = soup.find_all("a", href=True)
            for link in links:
                href = link["href"]
                if "/postings/" in href:
                    posting_id = href.split("/postings/")[-1].strip("/")
                    title = link.get_text(strip=True)
                    full_url = href if href.startswith("http") else f"https://jobs.gusto.com{href}"
                    jobs.append({
                        "id": posting_id,
                        "title": title,
                        "url": full_url
                    })

            return jobs
        except Exception as e:
            logger.warn("gusto_ats_fetch_jobs_error", company=company_identifier, error=str(e))
            return []

    async def fetch_job_details(self, company_identifier: str, job_id: str) -> Optional[Dict[str, Any]]:
        url = f"https://jobs.gusto.com/postings/{job_id}"
        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                return None
            soup = BeautifulSoup(response.text, "lxml")
            title_el = soup.find("h1")
            desc_el = soup.select_one("article, .job-description, .description, main")
            return {
                "id": job_id,
                "title": title_el.get_text(strip=True) if title_el else None,
                "description": str(desc_el) if desc_el else "",
                "url": url,
            }
        except Exception:
            return None

    def normalize(self, raw_job: Dict[str, Any], company_name: str, company_identifier: str) -> NormalizedJob:
        job_id = str(raw_job.get("id", ""))
        title = (raw_job.get("title") or "").strip()
        if not title and "-" in job_id:
            # Reconstruct title from posting slug if missing
            parts = job_id.split("-")
            title = " ".join(parts[1:-5]).title() if len(parts) > 6 else job_id.replace("-", " ").title()

        description = raw_job.get("description") or f"<p>{title} at {company_name}</p>"
        parsed_loc = parse_location(raw_job.get("location"))

        emp_type = normalize_employment_type(title) or normalize_employment_type(description)
        salary_info = parse_salary(description) if description else {"min": None, "max": None, "currency": None, "period": None}

        job_url = raw_job.get("url") or f"https://jobs.gusto.com/postings/{job_id}"

        return NormalizedJob(
            source=self.platform,
            source_job_id=job_id,
            source_company_id=company_identifier,
            title=title,
            company_name=company_name,
            company_url=f"https://jobs.gusto.com/boards/{company_identifier}",
            location=parsed_loc["location"],
            country=parsed_loc.get("country"),
            city=parsed_loc.get("city"),
            remote_type=parsed_loc["remote_type"],
            employment_type=emp_type,
            department=None,
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
