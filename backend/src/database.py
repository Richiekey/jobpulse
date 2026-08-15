import httpx
import json
from typing import Optional, List, Tuple, Dict, Any
from uuid import UUID
from datetime import datetime, timezone, timedelta

from src.models.job import NormalizedJob, JobSearchParams
from src.models.company import CompanyCreate
from src.models.enums import JobStatus, ATSPlatform
from src.core.skills_extractor import extract_skills, detect_role_category
from src.utils.logger import logger


class Database:
    """Supabase REST API (PostgREST) database client.
    
    Uses HTTPS instead of direct Postgres connections to avoid
    IPv6/IPv4 and connection pooler issues.
    """

    def __init__(self, base_url: Optional[str] = None, api_key: Optional[str] = None):
        self.connected = False
        self.pool = False  # backward compat for `if not self.pool` checks
        if base_url and api_key:
            self.rest_url = f"{base_url.rstrip('/')}/rest/v1"
            self.headers = {
                "apikey": api_key,
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            }
            self.client = httpx.AsyncClient(headers=self.headers, timeout=30.0)
            self.connected = True
            self.pool = True

    @classmethod
    async def connect(cls, supabase_url: str, supabase_key: str) -> "Database":
        """Connect via Supabase REST API."""
        db = cls(supabase_url, supabase_key)
        # Test connection with a lightweight query
        try:
            resp = await db.client.get(
                f"{db.rest_url}/jobs",
                params={"select": "id", "limit": "1"},
            )
            if resp.status_code < 300:
                logger.info("database_connected_via_rest_api", url=supabase_url)
            else:
                logger.warning("database_connection_test_warning", 
                             status=resp.status_code, body=resp.text[:200])
        except Exception as e:
            logger.error("database_connection_test_failed", error=str(e))
        return db

    async def disconnect(self):
        if self.connected:
            await self.client.aclose()

    # ── Jobs ────────────────────────────────────────────────────

    async def upsert_job(self, job: NormalizedJob) -> str:
        """
        Upserts job by (source, source_job_id) via PostgREST.
        Returns 'inserted', 'updated', or 'skipped'.
        """
        if not self.connected:
            return "inserted"

        locations_data = [loc.model_dump() for loc in job.locations] if job.locations else []

        data = {
            "source": job.source.value,
            "source_job_id": job.source_job_id,
            "source_company_id": job.source_company_id,
            "title": job.title,
            "company_name": job.company_name,
            "company_url": job.company_url,
            "location": job.location,
            "locations": locations_data,
            "country": job.country,
            "city": job.city,
            "remote_type": job.remote_type.value,
            "employment_type": job.employment_type.value if job.employment_type else None,
            "department": job.department,
            "team": job.team,
            "description": job.description,
            "requirements": job.requirements,
            "responsibilities": job.responsibilities,
            "salary_min": float(job.salary_min) if job.salary_min else None,
            "salary_max": float(job.salary_max) if job.salary_max else None,
            "salary_currency": job.salary_currency,
            "salary_period": job.salary_period,
            "job_url": job.job_url,
            "apply_url": job.apply_url,
            "posted_at": job.posted_at.isoformat() if job.posted_at else None,
            "updated_at": (job.updated_at or datetime.now(timezone.utc)).isoformat(),
            "scraped_at": job.scraped_at.isoformat() if job.scraped_at else datetime.now(timezone.utc).isoformat(),
            "status": job.status.value,
            "content_hash": job.content_hash,
            "deduplication_key": job.deduplication_key,
            "skills": extract_skills(job.description or ""),
            "role_category": detect_role_category(job.title or ""),
        }

        # Check if job already exists to determine insert vs update
        check_resp = await self.client.get(
            f"{self.rest_url}/jobs",
            params={
                "select": "id,content_hash",
                "source": f"eq.{job.source.value}",
                "source_job_id": f"eq.{job.source_job_id}",
                "limit": "1",
            },
        )

        existing = check_resp.json() if check_resp.status_code < 300 else []

        if existing:
            # Job exists — check if content changed
            if existing[0].get("content_hash") == job.content_hash:
                return "skipped"
            # Content changed — update
            resp = await self.client.patch(
                f"{self.rest_url}/jobs",
                params={
                    "source": f"eq.{job.source.value}",
                    "source_job_id": f"eq.{job.source_job_id}",
                },
                json=data,
            )
            if resp.status_code < 300:
                return "updated"
            logger.error("update_job_failed", status=resp.status_code, body=resp.text[:200])
            return "skipped"
        else:
            # New job — insert
            resp = await self.client.post(
                f"{self.rest_url}/jobs",
                json=data,
            )
            if resp.status_code < 300:
                return "inserted"
            # Handle unique constraint violation (race condition)
            if resp.status_code == 409:
                return "skipped"
            logger.error("insert_job_failed", status=resp.status_code, body=resp.text[:200])
            return "inserted"

    async def bulk_upsert_jobs(self, jobs: List[NormalizedJob], batch_size: int = 100) -> Dict[str, int]:
        """Bulk upserts jobs into Supabase in batches with resolution=merge-duplicates."""
        if not jobs or not self.connected:
            return {"inserted": 0, "failed": 0}

        stats = {"inserted": 0, "failed": 0}

        for i in range(0, len(jobs), batch_size):
            batch = jobs[i:i + batch_size]
            payload = []
            for job in batch:
                payload.append({
                    "source": job.source.value,
                    "source_job_id": job.source_job_id,
                    "source_company_id": job.source_company_id,
                    "title": job.title,
                    "company_name": job.company_name,
                    "company_url": job.company_url,
                    "location": job.location,
                    "country": job.country,
                    "city": job.city,
                    "remote_type": job.remote_type.value,
                    "employment_type": job.employment_type.value if job.employment_type else None,
                    "department": job.department,
                    "team": job.team,
                    "description": job.description,
                    "requirements": job.requirements,
                    "responsibilities": job.responsibilities,
                    "salary_min": float(job.salary_min) if job.salary_min else None,
                    "salary_max": float(job.salary_max) if job.salary_max else None,
                    "salary_currency": job.salary_currency,
                    "salary_period": job.salary_period,
                    "job_url": job.job_url,
                    "apply_url": job.apply_url,
                    "posted_at": job.posted_at.isoformat() if job.posted_at else None,
                    "updated_at": (job.updated_at or datetime.now(timezone.utc)).isoformat(),
                    "scraped_at": job.scraped_at.isoformat() if job.scraped_at else datetime.now(timezone.utc).isoformat(),
                    "status": job.status.value,
                    "content_hash": job.content_hash,
                    "deduplication_key": job.deduplication_key,
                    "skills": extract_skills(job.description or ""),
                    "role_category": detect_role_category(job.title or ""),
                })

            resp = await self.client.post(
                f"{self.rest_url}/jobs?on_conflict=source,source_job_id",
                headers={"Prefer": "resolution=merge-duplicates"},
                json=payload,
            )
            if resp.status_code < 300:
                stats["inserted"] += len(batch)
            else:
                logger.error("bulk_upsert_failed", status=resp.status_code, body=resp.text[:200])
                # Fallback to individual
                for j in batch:
                    r = await self.upsert_job(j)
                    if r != "skipped":
                        stats["inserted"] += 1

        return stats

    async def search_jobs(self, params: JobSearchParams) -> Tuple[List[Dict[str, Any]], int]:
        if not self.connected:
            return [], 0

        query_params: Dict[str, str] = {
            "select": "id,title,company_name,location,remote_type,employment_type,department,salary_min,salary_max,salary_currency,salary_period,job_url,apply_url,source,posted_at,created_at,skills,role_category",
            "status": f"eq.{params.status.value}",
            "limit": str(params.per_page),
            "offset": str((params.page - 1) * params.per_page),
        }

        # Ordering
        if params.sort_by == "oldest":
            query_params["order"] = "posted_at.asc.nullslast,created_at.asc"
        elif params.sort_by == "salary":
            query_params["order"] = "salary_max.desc.nullslast,salary_min.desc.nullslast"
        else:
            query_params["order"] = "posted_at.desc.nullslast,created_at.desc"

        # Filters
        if params.q:
            query_params["search_vector"] = f"plfts.english.{params.q}"

        if params.location:
            query_params["location"] = f"ilike.*{params.location}*"

        if params.country:
            query_params["country"] = f"ilike.{params.country}"

        if params.city:
            query_params["city"] = f"ilike.*{params.city}*"

        if params.remote_type:
            query_params["remote_type"] = f"eq.{params.remote_type.value}"

        if params.employment_type:
            query_params["employment_type"] = f"eq.{params.employment_type.value}"

        if params.company:
            query_params["company_name"] = f"ilike.*{params.company}*"

        if params.source:
            query_params["source"] = f"eq.{params.source.value}"

        if params.department:
            query_params["department"] = f"ilike.*{params.department}*"

        if params.salary_min is not None:
            query_params["salary_max"] = f"gte.{params.salary_min}"

        if params.salary_max is not None:
            query_params["salary_min"] = f"lte.{params.salary_max}"

        # Skills filter (array contains)
        if hasattr(params, 'skills') and params.skills:
            skills_list = [s.strip() for s in params.skills.split(',') if s.strip()]
            if skills_list:
                query_params["skills"] = f"cs.{{{','.join(skills_list)}}}"

        # Role category filter
        if hasattr(params, 'role_category') and params.role_category:
            query_params["role_category"] = f"eq.{params.role_category}"

        # Request with exact count
        resp = await self.client.get(
            f"{self.rest_url}/jobs",
            params=query_params,
            headers={**self.headers, "Prefer": "count=exact"},
        )

        if resp.status_code >= 300:
            logger.error("search_jobs_failed", status=resp.status_code, body=resp.text[:200])
            return [], 0

        results = resp.json()

        # Parse total count from Content-Range header: "0-24/142"
        total = 0
        content_range = resp.headers.get("content-range", "")
        if "/" in content_range:
            try:
                total = int(content_range.split("/")[1])
            except (ValueError, IndexError):
                total = len(results)
        else:
            total = len(results)

        return results, total

    async def get_job(self, job_id: UUID) -> Optional[Dict[str, Any]]:
        if not self.connected:
            return None
        resp = await self.client.get(
            f"{self.rest_url}/jobs",
            params={"select": "*", "id": f"eq.{job_id}", "limit": "1"},
        )
        rows = resp.json() if resp.status_code < 300 else []
        return rows[0] if rows else None

    async def get_job_by_apply_url(self, apply_url: str) -> Optional[Dict[str, Any]]:
        if not self.connected:
            return None
        resp = await self.client.get(
            f"{self.rest_url}/jobs",
            params={"select": "id,source,content_hash", "apply_url": f"eq.{apply_url}", "limit": "1"},
        )
        rows = resp.json() if resp.status_code < 300 else []
        return rows[0] if rows else None

    async def get_job_by_dedup_key(self, dedup_key: str) -> Optional[Dict[str, Any]]:
        if not self.connected:
            return None
        resp = await self.client.get(
            f"{self.rest_url}/jobs",
            params={"select": "id,source,content_hash", "deduplication_key": f"eq.{dedup_key}", "limit": "1"},
        )
        rows = resp.json() if resp.status_code < 300 else []
        return rows[0] if rows else None

    async def mark_stale_jobs(self, source: str, company_identifier: str, active_source_job_ids: List[str]):
        """Mark jobs not in active list as STALE using direct REST API."""
        if not self.connected or not active_source_job_ids:
            return
        try:
            # Get all active jobs for this source + company that aren't in the active list
            params = {
                "select": "id,source_job_id",
                "source": f"eq.{source}",
                "source_company_id": f"eq.{company_identifier}",
                "status": "eq.ACTIVE",
                "source_job_id": f"not.in.({','.join(active_source_job_ids[:500])})",
                "limit": "500",
            }
            resp = await self.client.get(f"{self.rest_url}/jobs", params=params)
            if resp.status_code >= 300:
                logger.error("mark_stale_query_failed", status=resp.status_code, body=resp.text[:200])
                return
            stale_jobs = resp.json()
            if not stale_jobs:
                return
            # Patch each stale job
            stale_ids = [j["id"] for j in stale_jobs]
            for job_id in stale_ids[:100]:  # Limit to avoid long operations
                await self.client.patch(
                    f"{self.rest_url}/jobs",
                    params={"id": f"eq.{job_id}"},
                    json={"status": "STALE"},
                )
            logger.info("marked_jobs_stale", company=company_identifier, count=len(stale_ids))
        except Exception as e:
            logger.error("mark_stale_jobs_failed", error=str(e))

    # ── Companies ───────────────────────────────────────────────

    async def list_companies(self, ats: Optional[str] = None, active_only: bool = True) -> List[Dict[str, Any]]:
        if not self.connected:
            return []
        query_params: Dict[str, str] = {
            "select": "*",
            "order": "name.asc",
        }
        if active_only:
            query_params["active"] = "eq.true"
        if ats:
            query_params["ats"] = f"eq.{ats}"

        resp = await self.client.get(f"{self.rest_url}/companies", params=query_params)
        return resp.json() if resp.status_code < 300 else []

    async def create_company(self, company: CompanyCreate) -> Dict[str, Any]:
        if not self.connected:
            return {"id": "00000000-0000-0000-0000-000000000000", **company.model_dump()}

        data = {
            "name": company.name,
            "website": company.website,
            "career_url": company.career_url,
            "ats": company.ats.value,
            "ats_identifier": company.ats_identifier,
            "country": company.country,
            "active": company.active,
        }

        resp = await self.client.post(
            f"{self.rest_url}/companies",
            json=data,
            headers={**self.headers, "Prefer": "resolution=merge-duplicates,return=representation"},
        )

        if resp.status_code < 300:
            rows = resp.json()
            return rows[0] if rows else data
        logger.error("create_company_failed", status=resp.status_code, body=resp.text[:200])
        return data

    # ── Source Runs ──────────────────────────────────────────────

    async def create_run(self, source: str, company_id: Optional[UUID] = None) -> UUID:
        if not self.connected:
            import uuid
            return uuid.uuid4()

        data = {
            "source": source,
            "company_id": str(company_id) if company_id else None,
            "status": "RUNNING",
        }
        resp = await self.client.post(
            f"{self.rest_url}/source_runs",
            json=data,
            headers={**self.headers, "Prefer": "return=representation"},
        )
        if resp.status_code < 300:
            rows = resp.json()
            return UUID(rows[0]["id"]) if rows else UUID("00000000-0000-0000-0000-000000000000")
        logger.error("create_run_failed", status=resp.status_code, body=resp.text[:200])
        import uuid
        return uuid.uuid4()

    async def complete_run(self, run_id: UUID, status: str, stats: Dict[str, int], error_message: Optional[str] = None):
        if not self.connected:
            return
        data = {
            "status": status,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "jobs_found": stats.get("found", 0),
            "jobs_inserted": stats.get("inserted", 0),
            "jobs_updated": stats.get("updated", 0),
            "jobs_skipped": stats.get("skipped", 0),
            "jobs_failed": stats.get("failed", 0),
            "error_message": error_message,
        }
        resp = await self.client.patch(
            f"{self.rest_url}/source_runs",
            params={"id": f"eq.{run_id}"},
            json=data,
        )
        if resp.status_code >= 300:
            logger.error("complete_run_failed", status=resp.status_code, body=resp.text[:200])

    async def get_source_health(self) -> List[Dict[str, Any]]:
        """Uses RPC function for complex aggregate query."""
        if not self.connected:
            return []
        resp = await self.client.post(f"{self.rest_url}/rpc/get_source_health", json={})
        if resp.status_code < 300:
            return resp.json()
        logger.error("get_source_health_failed", status=resp.status_code, body=resp.text[:200])
        return []

    # ── Import Tracking ─────────────────────────────────────────

    async def create_import_batch(self, total_urls: int) -> UUID:
        if not self.connected:
            import uuid
            return uuid.uuid4()
        resp = await self.client.post(
            f"{self.rest_url}/import_batches",
            json={"total_urls": total_urls},
            headers={**self.headers, "Prefer": "return=representation"},
        )
        if resp.status_code < 300:
            rows = resp.json()
            return UUID(rows[0]["id"]) if rows else UUID("00000000-0000-0000-0000-000000000000")
        logger.error("create_import_batch_failed", status=resp.status_code, body=resp.text[:200])
        import uuid
        return uuid.uuid4()

    async def add_import_result(self, batch_id: UUID, result: Dict[str, Any]):
        if not self.connected:
            return
        data = {
            "batch_id": str(batch_id),
            "url": result["url"],
            "status": result["status"],
            "job_id": str(result["job_id"]) if result.get("job_id") else None,
            "error_message": result.get("error_message"),
            "detected_ats": result.get("detected_ats"),
        }
        resp = await self.client.post(f"{self.rest_url}/import_results", json=data)
        if resp.status_code >= 300:
            logger.error("add_import_result_failed", status=resp.status_code, body=resp.text[:200])

    async def complete_import_batch(self, batch_id: UUID, stats: Dict[str, int]):
        if not self.connected:
            return
        data = {
            "successful": stats.get("successful", 0),
            "failed": stats.get("failed", 0),
            "duplicates": stats.get("duplicates", 0),
            "status": "COMPLETED",
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }
        resp = await self.client.patch(
            f"{self.rest_url}/import_batches",
            params={"id": f"eq.{batch_id}"},
            json=data,
        )
        if resp.status_code >= 300:
            logger.error("complete_import_batch_failed", status=resp.status_code, body=resp.text[:200])

    # ── Cleanup ─────────────────────────────────────────────────

    async def cleanup_old_jobs(self, max_age_days: int = 30) -> int:
        """Delete jobs older than max_age_days. Returns count of deleted jobs."""
        if not self.connected:
            return 0

        cutoff = (datetime.now(timezone.utc) - timedelta(days=max_age_days)).isoformat()

        # First count how many will be deleted
        count_resp = await self.client.get(
            f"{self.rest_url}/jobs",
            params={"select": "id", "created_at": f"lt.{cutoff}"},
            headers={**self.headers, "Prefer": "count=exact"},
        )
        total = 0
        content_range = count_resp.headers.get("content-range", "")
        if "/" in content_range:
            try:
                total = int(content_range.split("/")[1])
            except (ValueError, IndexError):
                pass

        if total == 0:
            logger.info("cleanup_no_old_jobs", cutoff=cutoff)
            return 0

        # Delete old jobs where posted_at < cutoff or (posted_at is null and created_at < cutoff)
        resp = await self.client.delete(
            f"{self.rest_url}/jobs",
            params={"or": f"(posted_at.lt.{cutoff},and(posted_at.is.null,created_at.lt.{cutoff}))"},
        )

        if resp.status_code < 300:
            logger.info("cleanup_old_jobs_complete", cutoff=cutoff)
            return 1
        else:
            logger.error("cleanup_old_jobs_failed", status=resp.status_code, body=resp.text[:200])
            return 0

