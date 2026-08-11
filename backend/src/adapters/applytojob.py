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


class ApplyToJobAdapter(BaseAdapter):
    """
    ApplyToJob / JazzHR adapter.
    HTML scraping: fetches the job listing page, parses job links,
    then fetches each job detail page for full info.
    """
    platform = ATSPlatform.APPLYTOJOB

    async def fetch_jobs(self, company_identifier: str) -> List[Dict[str, Any]]:
        """Fetch job listing page and extract job links."""
        base_url = f"https://{company_identifier}.applytojob.com/apply"
        try:
            response = await self.client.get(base_url)
            if response.status_code != 200:
                logger.warn("applytojob_list_failed", company=company_identifier, status=response.status_code)
                return []

            soup = BeautifulSoup(response.text, "lxml")
            jobs = []

            # Find job listing elements - JazzHR uses various patterns
            job_links = soup.select('a[href*="/apply/"]')
            if not job_links:
                job_links = soup.select('.job-listing a, .position a, .opening a, a.job-title')
            if not job_links:
                # Fallback: find all links that look like job postings
                job_links = [a for a in soup.find_all('a', href=True)
                           if '/apply/' in a['href'] and a.get_text(strip=True)]

            seen_urls = set()
            for link in job_links:
                href = link.get('href', '')
                if not href or href in seen_urls:
                    continue

                # Build full URL
                if href.startswith('/'):
                    href = f"https://{company_identifier}.applytojob.com{href}"
                elif not href.startswith('http'):
                    href = f"https://{company_identifier}.applytojob.com/apply/{href}"

                seen_urls.add(href)
                title = link.get_text(strip=True)
                if not title or len(title) < 3:
                    continue

                # Extract job ID from URL
                parts = href.rstrip('/').split('/')
                job_id = parts[-1] if parts else href

                jobs.append({
                    "id": job_id,
                    "title": title,
                    "url": href,
                })

            logger.info("applytojob_listed", company=company_identifier, count=len(jobs))
            return jobs

        except Exception as e:
            logger.error("applytojob_list_error", company=company_identifier, error=str(e))
            return []

    async def fetch_job_details(self, company_identifier: str, job_id: str) -> Optional[Dict[str, Any]]:
        """Fetch individual job detail page."""
        url = f"https://{company_identifier}.applytojob.com/apply/{job_id}"
        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                return None

            soup = BeautifulSoup(response.text, "lxml")

            # Extract title
            title_el = soup.select_one('h1, .job-title, .position-title, .posting-headline h1')
            title = title_el.get_text(strip=True) if title_el else ""

            # Extract location
            location = ""
            loc_el = soup.select_one('.location, .job-location, [class*="location"]')
            if loc_el:
                location = loc_el.get_text(strip=True)

            # Extract description
            desc_el = soup.select_one('.job-description, .description, .posting-description, article, main')
            description = str(desc_el) if desc_el else ""

            # Extract department
            dept_el = soup.select_one('.department, .job-department, [class*="department"]')
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
            logger.error("applytojob_detail_error", job_id=job_id, error=str(e))
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

        job_url = raw_job.get("url", f"https://{company_identifier}.applytojob.com/apply/{job_id}")

        return NormalizedJob(
            source=self.platform,
            source_job_id=job_id,
            source_company_id=company_identifier,
            title=title,
            company_name=company_name,
            company_url=f"https://{company_identifier}.applytojob.com",
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
