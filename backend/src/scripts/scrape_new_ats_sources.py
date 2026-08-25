import asyncio
import os
import sys
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from src.config import settings
from src.database import Database
from src.adapters.registry import get_adapter, ADAPTER_MAP
from src.core.normalizer import is_allowed_location
from src.utils.http_client import ThrottledClient
from src.utils.logger import logger
from src.models.enums import ATSPlatform

TARGET_NEW_ATS = [
    "SMARTRECRUITERS", "RIPPLING", "RECRUITERFLOW", "GUSTO_ATS", 
    "MANATAL", "RECRUITEE", "BREEZY", "BAMBOOHR", "CATS", 
    "PERSONIO", "PINPOINT", "TEAMTAILOR", "KULA", "GEM", 
    "ORACLE_CLOUD", "ADP", "TALEO", "JOBDIVA", "BULLHORN",
    "WORKABLE", "APPLYTOJOB", "JOBVITE", "ICIMS"
]

async def scrape_new_ats_sources():
    db = await Database.connect(settings.supabase_url, settings.supabase_key)
    if not db.connected:
        print("Failed to connect to database.")
        return

    http_client = ThrottledClient(rate_limit_per_second=10, timeout=15.0, max_retries=2)

    try:
        # Fetch all active companies
        companies = await db.list_companies(active_only=True)
        print(f"Total active companies in database: {len(companies)}")

        # Group by ATS
        ats_groups: Dict[str, List[Dict[str, Any]]] = {}
        for c in companies:
            ats = c.get("ats", "UNKNOWN")
            ats_groups.setdefault(ats, []).append(c)

        print("\nCompany Breakdown by ATS:")
        for ats, comps in sorted(ats_groups.items(), key=lambda x: -len(x[1])):
            print(f"  - {ats}: {len(comps)} companies")

        # Filter target companies
        target_comps = [c for c in companies if c.get("ats") in TARGET_NEW_ATS]
        print(f"\nTargeting {len(target_comps)} companies across {len(TARGET_NEW_ATS)} newly added/expanded ATS platforms...")

        total_scraped = 0
        total_inserted = 0
        total_found = 0
        errors = 0

        cutoff_date = datetime.now(timezone.utc) - timedelta(days=30)

        for i, company in enumerate(target_comps, 1):
            comp_id = company["id"]
            comp_name = company["name"]
            ats_str = company["ats"]
            ats_identifier = company["ats_identifier"]
            is_agency = bool(company.get("is_staffing_agency"))

            try:
                platform = ATSPlatform(ats_str)
            except ValueError:
                continue

            try:
                adapter = get_adapter(platform, http_client=http_client)
                jobs = await adapter.discover_and_normalize(comp_name, ats_identifier)
                found = len(jobs)
                total_found += found

                # Filter by location & recency
                filtered_jobs = []
                for j in jobs:
                    if is_agency:
                        j.is_staffing_agency = True
                    if is_allowed_location(j.location) and (
                        j.posted_at is None
                        or (j.posted_at.replace(tzinfo=timezone.utc) if j.posted_at.tzinfo is None else j.posted_at) >= cutoff_date
                    ):
                        filtered_jobs.append(j)

                if filtered_jobs:
                    upsert_res = await db.bulk_upsert_jobs(filtered_jobs, batch_size=50)
                    inserted = upsert_res.get("inserted", 0)
                    total_inserted += inserted
                    print(f"[{i}/{len(target_comps)}] {comp_name} ({ats_str}): {found} found -> {len(filtered_jobs)} kept -> {inserted} upserted")
                else:
                    if found > 0:
                        print(f"[{i}/{len(target_comps)}] {comp_name} ({ats_str}): {found} found (0 matched location/age filter)")
                    else:
                        # 0 found
                        pass

                total_scraped += 1

            except Exception as e:
                errors += 1
                print(f"[{i}/{len(target_comps)}] ERROR scraping {comp_name} ({ats_str}): {e}")

        print(f"\n==========================================")
        print(f"Ingestion Completed:")
        print(f"  - Companies processed: {total_scraped}")
        print(f"  - Total jobs found: {total_found}")
        print(f"  - Total jobs inserted/updated: {total_inserted}")
        print(f"  - Errors encountered: {errors}")
        print(f"==========================================")

    finally:
        await http_client.close()
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(scrape_new_ats_sources())
