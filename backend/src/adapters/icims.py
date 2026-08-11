from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import json
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


class ICIMSAdapter(BaseAdapter):
    """
    iCIMS adapter.
    Uses sitemap.xml to discover job URLs, then scrapes each page.
    Falls back to JSON-LD structured data when available.
    """
    platform = ATSPlatform.ICIMS

    async def fetch_jobs(self, company_identifier: str) -> List[Dict[str, Any]]:
        """Parse sitemap.xml to get all job page URLs."""
        sitemap_url = f"https://{company_identifier}.icims.com/sitemap.xml"
        try:
            response = await self.client.get(sitemap_url)
            if response.status_code != 200:
                logger.warn("icims_sitemap_failed", company=company_identifier, status=response.status_code)
                return []

            root = ET.fromstring(response.text)
            ns = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
            jobs = []

            for url_el in root.findall('.//sm:url', ns):
                loc = url_el.find('sm:loc', ns)
                if loc is None or loc.text is None:
                    continue
                url = loc.text.strip()
                # Filter for job URLs only
                if '/jobs/' not in url and '/job/' not in url:
                    continue
                # Extract job ID from URL
                match = re.search(r'/jobs?/(\d+)', url)
                if match:
                    job_id = match.group(1)
                    jobs.append({"id": job_id, "url": url})

            logger.info("icims_sitemap_parsed", company=company_identifier, count=len(jobs))
            return jobs

        except Exception as e:
            logger.error("icims_sitemap_error", company=company_identifier, error=str(e))
            return []

    async def fetch_job_details(self, company_identifier: str, job_id: str) -> Optional[Dict[str, Any]]:
        """Fetch job page and extract data from JSON-LD or HTML."""
        url = f"https://{company_identifier}.icims.com/jobs/{job_id}/job"
        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                return None

            soup = BeautifulSoup(response.text, "lxml")

            # Try JSON-LD first (most reliable)
            json_ld = soup.find('script', type='application/ld+json')
            if json_ld and json_ld.string:
                try:
                    data = json.loads(json_ld.string)
                    if isinstance(data, list):
                        data = next((d for d in data if d.get('@type') == 'JobPosting'), data[0])
                    if data.get('@type') == 'JobPosting':
                        return self._parse_json_ld(data, job_id, url)
                except (json.JSONDecodeError, StopIteration):
                    pass

            # Fallback to HTML parsing
            title_el = soup.select_one('h1.iCIMS_Header, h1, .job-title')
            title = title_el.get_text(strip=True) if title_el else ""

            location = ""
            loc_el = soup.select_one('.iCIMS_JobHeaderField:contains("Location"), .job-location, [class*="location"]')
            if not loc_el:
                loc_el = soup.find(string=re.compile(r'Location', re.I))
                if loc_el:
                    loc_el = loc_el.find_next('span') or loc_el.find_next('div')
            if loc_el:
                location = loc_el.get_text(strip=True)

            desc_el = soup.select_one('.iCIMS_InfoMsg_Job, .job-description, .iCIMS_Expandable_Text')
            description = str(desc_el) if desc_el else ""

            return {
                "id": job_id,
                "title": title,
                "location": location,
                "description": description,
                "department": None,
                "url": url,
                "posted_at": None,
                "employment_type": None,
            }

        except Exception as e:
            logger.error("icims_detail_error", job_id=job_id, error=str(e))
            return None

    def _parse_json_ld(self, data: Dict, job_id: str, url: str) -> Dict[str, Any]:
        """Parse JSON-LD JobPosting schema."""
        location_parts = []
        job_location = data.get("jobLocation", {})
        if isinstance(job_location, dict):
            address = job_location.get("address", {})
            if isinstance(address, dict):
                if address.get("addressLocality"):
                    location_parts.append(address["addressLocality"])
                if address.get("addressRegion"):
                    location_parts.append(address["addressRegion"])
                if address.get("addressCountry"):
                    country = address["addressCountry"]
                    if isinstance(country, dict):
                        country = country.get("name", "")
                    location_parts.append(country)

        posted_at = None
        date_str = data.get("datePosted")
        if date_str:
            try:
                posted_at = datetime.fromisoformat(date_str.replace("Z", "+00:00")).isoformat()
            except Exception:
                pass

        return {
            "id": job_id,
            "title": data.get("title", ""),
            "location": ", ".join(location_parts),
            "description": data.get("description", ""),
            "department": data.get("industry"),
            "url": url,
            "posted_at": posted_at,
            "employment_type": data.get("employmentType"),
        }

    def normalize(self, raw_job: Dict[str, Any], company_name: str, company_identifier: str) -> NormalizedJob:
        job_id = str(raw_job.get("id", ""))
        title = (raw_job.get("title") or "").strip()
        raw_location = raw_job.get("location", "")
        parsed_loc = parse_location(raw_location)

        description = raw_job.get("description", "")
        department = raw_job.get("department")

        raw_emp_type = raw_job.get("employment_type")
        employment_type = normalize_employment_type(raw_emp_type) or normalize_employment_type(title)

        salary_info = parse_salary(description) if description else {
            "min": None, "max": None, "currency": None, "period": None
        }

        posted_at = None
        if raw_job.get("posted_at"):
            try:
                posted_at = datetime.fromisoformat(raw_job["posted_at"])
            except Exception:
                pass

        job_url = raw_job.get("url", f"https://{company_identifier}.icims.com/jobs/{job_id}/job")

        return NormalizedJob(
            source=self.platform,
            source_job_id=job_id,
            source_company_id=company_identifier,
            title=title,
            company_name=company_name,
            company_url=f"https://{company_identifier}.icims.com",
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
            posted_at=posted_at,
            status=JobStatus.ACTIVE
        )
