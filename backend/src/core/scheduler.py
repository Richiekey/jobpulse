import asyncio
import sys
from typing import Optional
from datetime import datetime, timezone, timedelta

from src.config import settings
from src.database import Database
from src.adapters.registry import get_adapter
from src.core.deduplicator import Deduplicator
from src.core.normalizer import is_allowed_location
from src.utils.http_client import ThrottledClient
from src.utils.logger import logger
from src.models.enums import ATSPlatform

async def run_scrape(db: Optional[Database] = None):
    """
    Main orchestration loop:
    1. Connect to database via Supabase REST API
    2. Fetch active companies
    3. Run scrape for each company
    4. Upsert jobs and handle staleness
    5. Log health and metrics
    """
    should_close_db = False
    if db is None:
        if not settings.supabase_url or not settings.supabase_key:
            logger.error("supabase_not_configured", msg="SUPABASE_URL and SUPABASE_KEY must be set")
            return
        db = await Database.connect(settings.supabase_url, settings.supabase_key)
        should_close_db = True

    http_client = ThrottledClient(
        rate_limit_per_second=settings.rate_limit_per_second,
        timeout=settings.request_timeout_seconds,
        max_retries=settings.max_retries,
    )
    deduplicator = Deduplicator(db)

    try:
        companies = await db.list_companies(active_only=True)
        logger.info("scrape_run_started", total_companies=len(companies))

        for company in companies:
            comp_id = company["id"]
            comp_name = company["name"]
            ats_str = company["ats"]
            ats_identifier = company["ats_identifier"]

            try:
                platform = ATSPlatform(ats_str)
            except ValueError:
                logger.warning("unsupported_ats", company=comp_name, ats=ats_str)
                continue

            run_id = await db.create_run(platform.value, comp_id)
            stats = {"found": 0, "inserted": 0, "updated": 0, "skipped": 0, "failed": 0}

            try:
                adapter = get_adapter(platform, http_client=http_client)
                jobs = await adapter.discover_and_normalize(comp_name, ats_identifier)
                stats["found"] = len(jobs)

                # Filter: only US, Canada, EU, or remote jobs + strictly within 30 days
                pre_filter = len(jobs)
                cutoff_date = datetime.now(timezone.utc) - timedelta(days=30)
                jobs = [
                    j for j in jobs
                    if is_allowed_location(j.location)
                    and (
                        j.posted_at is None
                        or (j.posted_at.replace(tzinfo=timezone.utc) if j.posted_at.tzinfo is None else j.posted_at) >= cutoff_date
                    )
                ]
                filtered_out = pre_filter - len(jobs)
                if filtered_out > 0:
                    logger.info("jobs_filtered_location_or_age", company=comp_name, kept=len(jobs), filtered=filtered_out)
                    stats["skipped"] += filtered_out

                active_source_job_ids = [j.source_job_id for j in jobs]

                # Fast batch upsert
                upsert_res = await db.bulk_upsert_jobs(jobs, batch_size=100)
                stats["inserted"] += upsert_res.get("inserted", 0)
                stats["failed"] += upsert_res.get("failed", 0)

                # Mark missing jobs as stale
                await db.mark_stale_jobs(platform.value, ats_identifier, active_source_job_ids)

                await db.complete_run(run_id, "SUCCESS", stats)
                logger.info("company_scrape_completed", company=comp_name, stats=stats)

            except Exception as ce:
                logger.error("company_scrape_failed", company=comp_name, error=str(ce))
                await db.complete_run(run_id, "FAILED", stats, error_message=str(ce))

    finally:
        # Clean up jobs older than 30 days
        try:
            deleted = await db.cleanup_old_jobs(max_age_days=30)
            if deleted > 0:
                logger.info("cleanup_completed", deleted_jobs=deleted)
        except Exception as cleanup_err:
            logger.error("cleanup_failed", error=str(cleanup_err))

        await http_client.close()
        if should_close_db and db:
            await db.disconnect()

def main():
    """CLI entry point for running scraper manually or via cron."""
    logger.info("starting_scraper_cli")
    asyncio.run(run_scrape())

if __name__ == "__main__":
    main()
