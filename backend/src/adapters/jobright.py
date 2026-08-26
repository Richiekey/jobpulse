import re
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from bs4 import BeautifulSoup

from src.adapters.base import BaseAdapter
from src.models.enums import ATSPlatform, JobStatus, RemoteType
from src.models.job import NormalizedJob
from src.core.normalizer import (
    normalize_employment_type,
    normalize_remote_type,
    parse_location,
    parse_salary
)
from src.utils.logger import logger


class JobrightAdapter(BaseAdapter):
    """
    Jobright.ai Adapter.
    Scrapes curated job collections from jobright-ai public GitHub repositories
    (e.g., Daily-H1B-Jobs-In-Tech, 2026-Software-Engineer-New-Grad),
    and enriches job details via the structured JSON-LD / helper payloads on jobright.ai/jobs/info/{id}.
    """
    platform = ATSPlatform.JOBRIGHT

    async def fetch_jobs(self, company_identifier: str) -> List[Dict[str, Any]]:
        """
        Fetches the repository's README.md from GitHub raw content and parses job table rows.
        company_identifier corresponds to the GitHub repo name (e.g., 'Daily-H1B-Jobs-In-Tech').
        """
        repo_name = company_identifier.strip()
        url = f"https://raw.githubusercontent.com/jobright-ai/{repo_name}/master/README.md"
        
        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                # Fallback to 'main' branch if 'master' is not 200
                fallback_url = f"https://raw.githubusercontent.com/jobright-ai/{repo_name}/main/README.md"
                response = await self.client.get(fallback_url)
                if response.status_code != 200:
                    logger.warn("jobright_readme_fetch_failed", repo=repo_name, status=response.status_code)
                    return []

            content = response.text
            jobs = self._parse_markdown_table(content, repo_name)
            logger.info("jobright_jobs_discovered", repo=repo_name, count=len(jobs))
            return jobs
        except Exception as e:
            logger.error("jobright_fetch_jobs_error", repo=repo_name, error=str(e))
            return []

    def _parse_markdown_table(self, markdown_text: str, repo_name: str) -> List[Dict[str, Any]]:
        """Parses job table rows from the markdown text."""
        jobs: List[Dict[str, Any]] = []
        last_company = ""

        lines = markdown_text.splitlines()
        for line in lines:
            trimmed = line.strip()
            if not trimmed.startswith("|") or not trimmed.endswith("|"):
                continue

            cells = [c.strip() for c in trimmed.split("|")[1:-1]]
            if not cells or len(cells) < 4:
                continue

            # Skip markdown table headers and divider rows
            if any(h in cells[0].lower() for h in ("company", "---", ":---", "=== ")):
                continue

            # Cell 0: Company Name (can be markdown link **[Name](url)** or **Name** or ↳)
            raw_comp = cells[0]
            if "↳" in raw_comp:
                company_name = last_company
            else:
                # Extract text inside **[...]** or plain text
                clean_comp = re.sub(r"\[(.*?)\]\(.*?\)", r"\1", raw_comp)
                clean_comp = clean_comp.replace("**", "").replace("*", "").strip()
                if clean_comp:
                    company_name = clean_comp
                    last_company = clean_comp
                else:
                    company_name = last_company

            # Look for job link cell (contains jobright.ai/jobs/info/{id})
            job_id = None
            job_url = None
            for cell in cells:
                match = re.search(r"https?://jobright\.ai/jobs/info/([a-zA-Z0-9]+)", cell)
                if match:
                    job_id = match.group(1)
                    job_url = f"https://jobright.ai/jobs/info/{job_id}"
                    break

            if not job_id:
                continue

            # Job title is typically in cell 1
            raw_title = cells[1] if len(cells) > 1 else ""
            clean_title = re.sub(r"\[(.*?)\]\(.*?\)", r"\1", raw_title).replace("**", "").replace("*", "").strip()
            if not clean_title or clean_title == "↳":
                continue

            # Level (if present)
            level = cells[2] if len(cells) > 2 else ""

            # Location (if present)
            location = cells[3] if len(cells) > 3 else ""

            # Posted date (usually in last cell or cell 6)
            posted_date = None
            date_match = re.search(r"\b(202\d-\d{2}-\d{2})\b", trimmed)
            if date_match:
                posted_date = date_match.group(1)

            jobs.append({
                "id": job_id,
                "title": clean_title,
                "company_name": company_name or "Tech Company",
                "location": location,
                "level": level,
                "url": job_url,
                "posted_date": posted_date,
                "repo": repo_name,
            })

        return jobs

    async def fetch_job_details(self, company_identifier: str, job_id: str) -> Optional[Dict[str, Any]]:
        """Fetches full job posting details and extracts structured data with direct ATS URLs."""
        url = f"https://jobright.ai/jobs/info/{job_id}"
        try:
            session_id = await self._ensure_session()
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            }
            if session_id:
                headers["Cookie"] = f"SESSION_ID={session_id}"

            response = await self.client.get(url, headers=headers)
            if response.status_code != 200:
                return None

            soup = BeautifulSoup(response.text, "lxml")

            # Try to extract jobright-helper-job-detail-info (richest, contains originalUrl & applyLink)
            helper_script = soup.find("script", id="jobright-helper-job-detail-info")
            if helper_script and helper_script.string:
                try:
                    helper_data = json.loads(helper_script.string)
                    job_res = helper_data.get("jobResult", {})
                    comp_res = helper_data.get("companyResult", {})
                    return {
                        "id": job_id,
                        "url": url,
                        "helper_data": job_res,
                        "company_data": comp_res,
                    }
                except Exception:
                    pass

            # Fallback to standard schema.org JSON-LD
            for script in soup.find_all("script", type="application/ld+json"):
                if script.string:
                    try:
                        data = json.loads(script.string)
                        if isinstance(data, dict) and data.get("@type") == "JobPosting":
                            return {
                                "id": job_id,
                                "url": url,
                                "json_ld": data,
                            }
                    except Exception:
                        continue

            return None
        except Exception as e:
            logger.error("jobright_fetch_detail_error", job_id=job_id, error=str(e))
            return None

    def normalize(self, raw_job: Dict[str, Any], company_name: str, company_identifier: str) -> NormalizedJob:
        """Normalizes job data from table summary or detailed payload."""
        job_id = str(raw_job.get("id", ""))
        title = (raw_job.get("title") or "").strip()
        comp_name = raw_job.get("company_name") or company_name
        job_url = raw_job.get("url") or f"https://jobright.ai/jobs/info/{job_id}"

        # Initialize defaults
        raw_location = raw_job.get("location", "")
        description = ""
        department = None
        employment_type = normalize_employment_type(title)
        salary_info = {"min": None, "max": None, "currency": None, "period": None}
        posted_at = None
        remote_override = None

        # Process rich helper_data if available
        helper = raw_job.get("helper_data")
        if helper and isinstance(helper, dict):
            if helper.get("jobTitle"):
                title = helper["jobTitle"].strip()
            if helper.get("jobLocation"):
                raw_location = helper["jobLocation"]

            # Work model
            work_model = helper.get("workModel", "").lower()
            if "remote" in work_model or helper.get("isRemote"):
                remote_override = RemoteType.REMOTE
            elif "hybrid" in work_model:
                remote_override = RemoteType.HYBRID
            elif "onsite" in work_model or "in-office" in work_model:
                remote_override = RemoteType.ONSITE

            # Description / summary
            description = helper.get("jobSummary") or ""
            if helper.get("coreResponsibilities"):
                description += "\n<h3>Responsibilities</h3>\n<ul>" + "".join(f"<li>{r}</li>" for r in helper["coreResponsibilities"]) + "</ul>"
            if helper.get("skillSummaries"):
                description += "\n<h3>Requirements</h3>\n<ul>" + "".join(f"<li>{s}</li>" for s in helper["skillSummaries"]) + "</ul>"

            # Salary
            if helper.get("minSalary") or helper.get("maxSalary"):
                salary_info["min"] = float(helper["minSalary"]) if helper.get("minSalary") else None
                salary_info["max"] = float(helper["maxSalary"]) if helper.get("maxSalary") else None
                salary_info["currency"] = "USD"
                salary_info["period"] = "year"

            # Employment type
            if helper.get("employmentType"):
                employment_type = normalize_employment_type(helper["employmentType"])

            # Posted date
            pub_time = helper.get("publishTime")
            if pub_time:
                try:
                    posted_at = datetime.fromisoformat(pub_time.replace("Z", "+00:00"))
                except Exception:
                    pass

        # Process json_ld if available
        json_ld = raw_job.get("json_ld")
        if json_ld and isinstance(json_ld, dict):
            if json_ld.get("title"):
                title = json_ld["title"].strip()
            if json_ld.get("description"):
                description = json_ld["description"]
            
            org = json_ld.get("hiringOrganization", {})
            if isinstance(org, dict) and org.get("name"):
                comp_name = org["name"]

            # Location from JSON-LD
            loc_data = json_ld.get("jobLocation", {})
            if isinstance(loc_data, dict):
                addr = loc_data.get("address", {})
                if isinstance(addr, dict):
                    parts = [addr.get("addressLocality"), addr.get("addressRegion"), addr.get("addressCountry")]
                    raw_location = ", ".join(p for p in parts if p)

            # Salary from JSON-LD
            base_sal = json_ld.get("baseSalary", {})
            if isinstance(base_sal, dict):
                val = base_sal.get("value", {})
                if isinstance(val, dict):
                    salary_info["min"] = float(val.get("minValue")) if val.get("minValue") else None
                    salary_info["max"] = float(val.get("maxValue")) if val.get("maxValue") else None
                    salary_info["period"] = val.get("unitText", "YEAR").lower()
                salary_info["currency"] = base_sal.get("currency", "USD")

            if json_ld.get("datePosted"):
                try:
                    posted_at = datetime.fromisoformat(json_ld["datePosted"].replace("Z", "+00:00"))
                except Exception:
                    pass

            if json_ld.get("employmentType"):
                employment_type = normalize_employment_type(json_ld["employmentType"])

        # Fallback date from markdown table
        if not posted_at and raw_job.get("posted_date"):
            try:
                posted_at = datetime.fromisoformat(f"{raw_job['posted_date']}T00:00:00+00:00")
            except Exception:
                pass

        # Parse location string
        parsed_loc = parse_location(raw_location)
        remote_type = remote_override or parsed_loc["remote_type"]

        # Parse salary from description if not yet found
        if not salary_info.get("min") and not salary_info.get("max") and description:
            salary_info = parse_salary(description)

        # ── Extract direct ATS apply URL ──
        # Priority: helper_data fields > json_ld url field > regex from description > fallback to job_url
        direct_apply_url = None

        # Check helper_data for direct apply URL fields
        if helper and isinstance(helper, dict):
            for field in ("applyUrl", "jobApplyUrl", "originalUrl", "externalUrl",
                          "companyJobUrl", "sourceUrl", "directUrl", "applyLink",
                          "applicationUrl", "externalApplyUrl"):
                candidate = helper.get(field)
                if candidate and isinstance(candidate, str) and "jobright.ai" not in candidate:
                    direct_apply_url = candidate.strip()
                    break

        # Check json_ld for direct apply URL
        if not direct_apply_url and json_ld and isinstance(json_ld, dict):
            for field in ("url", "sameAs", "applicationContact"):
                candidate = json_ld.get(field)
                if candidate and isinstance(candidate, str) and "jobright.ai" not in candidate:
                    direct_apply_url = candidate.strip()
                    break

        # Regex-extract known ATS URLs from the description
        if not direct_apply_url and description:
            ats_patterns = [
                r'https?://(?:boards\.)?greenhouse\.io/[a-zA-Z0-9_\-\./]+',
                r'https?://jobs\.ashbyhq\.com/[a-zA-Z0-9_\-\./]+',
                r'https?://jobs\.lever\.co/[a-zA-Z0-9_\-\./]+',
                r'https?://[a-zA-Z0-9_\-\.]+\.myworkdayjobs\.com/[a-zA-Z0-9_\-\./]+',
                r'https?://jobs\.smartrecruiters\.com/[a-zA-Z0-9_\-\./]+',
                r'https?://[a-zA-Z0-9_\-\.]+\.workable\.com/[a-zA-Z0-9_\-\./]+',
                r'https?://[a-zA-Z0-9_\-\.]+\.icims\.com/[a-zA-Z0-9_\-\./]+',
            ]
            for pattern in ats_patterns:
                match = re.search(pattern, description, re.IGNORECASE)
                if match:
                    direct_apply_url = match.group(0)
                    break

        apply_url_final = direct_apply_url or job_url

        return NormalizedJob(
            source=self.platform,
            source_job_id=job_id,
            source_company_id=company_identifier,
            title=title,
            company_name=comp_name,
            company_url="https://jobright.ai",
            location=parsed_loc["location"],
            country=parsed_loc.get("country"),
            city=parsed_loc.get("city"),
            remote_type=remote_type,
            employment_type=employment_type,
            department=department,
            description=description or f"<p>{title} at {comp_name}</p>",
            salary_min=salary_info.get("min"),
            salary_max=salary_info.get("max"),
            salary_currency=salary_info.get("currency"),
            salary_period=salary_info.get("period"),
            job_url=job_url,
            apply_url=apply_url_final,
            apply_url_original=direct_apply_url,
            posted_at=posted_at,
            status=JobStatus.ACTIVE
        )

    async def discover_and_normalize(self, company_name: str, company_identifier: str) -> List[NormalizedJob]:
        """
        Override base: fetches the README table, then enriches each job
        with detail data from jobright.ai (capped at 50 detail fetches per repo
        to stay within the GitHub Actions 45-minute timeout).
        """
        raw_jobs = await self.fetch_jobs(company_identifier)
        logger.info("jobright_enriching_details", repo=company_identifier, total=len(raw_jobs), cap=50)

        normalized_list = []
        detail_fetches = 0
        MAX_DETAIL_FETCHES = 50

        for raw in raw_jobs:
            try:
                # Enrich with detail data if under the cap
                job_id = raw.get("id")
                if job_id and detail_fetches < MAX_DETAIL_FETCHES:
                    detail = await self.fetch_job_details(company_identifier, job_id)
                    if detail:
                        # Merge detail data into the raw job dict
                        if detail.get("helper_data"):
                            raw["helper_data"] = detail["helper_data"]
                        if detail.get("company_data"):
                            raw["company_data"] = detail["company_data"]
                        if detail.get("json_ld"):
                            raw["json_ld"] = detail["json_ld"]
                    detail_fetches += 1

                job = self.normalize(raw, company_name, company_identifier)
                normalized_list.append(job)
            except Exception as e:
                logger.error(
                    "job_normalization_failed",
                    platform=self.platform.value,
                    company=company_name,
                    job_id=raw.get("id"),
                    error=str(e)
                )

        logger.info("jobright_enrichment_complete", repo=company_identifier,
                     enriched=detail_fetches, total_normalized=len(normalized_list))
        return normalized_list
