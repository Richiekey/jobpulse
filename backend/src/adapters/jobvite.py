from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
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


class JobviteAdapter(BaseAdapter):
    """
    Jobvite adapter.
    HTML scraping: fetches job listing page at jobs.jobvite.com/{company},
    then fetches each job detail page.
    """
    platform = ATSPlatform.JOBVITE

    async def fetch_jobs(self, company_identifier: str) -> List[Dict[str, Any]]:
        base_url = f"https://jobs.jobvite.com/{company_identifier}"
        try:
            response = await self.client.get(base_url)
            if response.status_code != 200:
                logger.warn("jobvite_list_failed", company=company_identifier, status=response.status_code)
                return []

            soup = BeautifulSoup(response.text, "lxml")
            jobs = []
            seen_urls = set()

            # Jobvite uses table rows or job-listing divs
            job_rows = soup.select('table.jv-job-list tr a, .jv-job-list a, a.jv-job-link')
            if not job_rows:
                job_rows = [a for a in soup.find_all('a', href=True)
                           if '/job/' in a.get('href', '') and a.get_text(strip=True)]

            for link in job_rows:
                href = link.get('href', '')
                if not href or href in seen_urls:
                    continue

                if href.startswith('/'):
                    href = f"https://jobs.jobvite.com{href}"

                seen_urls.add(href)
                title = link.get_text(strip=True)
                if not title or len(title) < 3:
                    continue

                # Try to get location from sibling/parent
                location = ""
                parent = link.find_parent('tr') or link.find_parent('div')
                if parent:
                    loc_el = parent.select_one('.jv-job-list-location, .location, td:nth-of-type(2)')
                    if loc_el:
                        location = loc_el.get_text(strip=True)

                parts = href.rstrip('/').split('/')
                job_id = parts[-1] if parts else href

                jobs.append({
                    "id": job_id,
                    "title": title,
                    "location": location,
                    "url": href,
                })

            logger.info("jobvite_listed", company=company_identifier, count=len(jobs))
            return jobs

        except Exception as e:
            logger.error("jobvite_list_error", company=company_identifier, error=str(e))
            return []

    async def fetch_job_details(self, company_identifier: str, job_id: str) -> Optional[Dict[str, Any]]:
        url = f"https://jobs.jobvite.com/{company_identifier}/job/{job_id}"
        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                return None

            soup = BeautifulSoup(response.text, "lxml")

            title_el = soup.select_one('h2.jv-header, h1.jv-job-detail-name, h1, .job-title')
            title = title_el.get_text(strip=True) if title_el else ""

            location = ""
            loc_el = soup.select_one('.jv-job-detail-meta .location, .jv-job-detail-location, [class*="location"]')
            if loc_el:
                location = loc_el.get_text(strip=True)

            desc_el = soup.select_one('.jv-job-detail-description, .job-description, article')
            description = str(desc_el) if desc_el else ""

            dept_el = soup.select_one('.jv-job-detail-department, [class*="department"]')
            department = dept_el.get_text(strip=True) if dept_el else None

            return {
                "id": job_id,
                "title": title,
                "location": location,
                "description": description,
                "department": department,
                "url": url,
            }
        except Exception as e:
            logger.error("jobvite_detail_error", job_id=job_id, error=str(e))
            return None

    def normalize(self, raw_job: Dict[str, Any], company_name: str, company_identifier: str) -> NormalizedJob:
        job_id = str(raw_job.get("id", ""))
        title = (raw_job.get("title") or "").strip()
        raw_location = raw_job.get("location", "")
        parsed_loc = parse_location(raw_location)

        description = raw_job.get("description", "")
        department = raw_job.get("department")
        employment_type = normalize_employment_type(title) or normalize_employment_type(description)
        salary_info = parse_salary(description) if description else {
            "min": None, "max": None, "currency": None, "period": None
        }

        job_url = raw_job.get("url", f"https://jobs.jobvite.com/{company_identifier}/job/{job_id}")

        return NormalizedJob(
            source=self.platform,
            source_job_id=job_id,
            source_company_id=company_identifier,
            title=title,
            company_name=company_name,
            company_url=f"https://jobs.jobvite.com/{company_identifier}",
            location=parsed_loc["location"],
            country=parsed_loc.get("country"),
            city=parsed_loc.get("city"),
            remote_type=parsed_loc["remote_type"],
            employment_type=employment_type,
            department=department,
            description=description,
            salary_min=salary_info["min"],
            salary_max=salary_info["max"],
            salary_currency=salary_info["currency"],
            salary_period=salary_info["period"],
            job_url=job_url,
            apply_url=job_url,
            posted_at=None,
            status=JobStatus.ACTIVE
        )
