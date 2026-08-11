"""
Backfill skills for existing jobs via Supabase REST API.
Run: python -m src.scripts.backfill_skills
"""

import asyncio
import httpx
import sys
import os

# Add parent to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from src.core.skills_extractor import extract_skills, detect_role_category
from src.config import settings
from src.utils.logger import logger


async def backfill():
    url = settings.supabase_url
    key = settings.supabase_key

    if not url or not key:
        print("ERROR: SUPABASE_URL and SUPABASE_KEY must be set in .env")
        return

    rest_url = f"{url.rstrip('/')}/rest/v1"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    async with httpx.AsyncClient(headers=headers, timeout=30.0) as client:
        # Fetch all jobs with empty skills
        offset = 0
        batch_size = 50
        total_updated = 0

        while True:
            resp = await client.get(
                f"{rest_url}/jobs",
                params={
                    "select": "id,title,description",
                    "skills": "eq.{}",
                    "limit": str(batch_size),
                    "offset": str(offset),
                },
            )

            if resp.status_code >= 300:
                print(f"ERROR fetching jobs: {resp.status_code} {resp.text[:200]}")
                break

            jobs = resp.json()
            if not jobs:
                break

            print(f"Processing batch of {len(jobs)} jobs (offset={offset})...")

            for job in jobs:
                description = job.get("description", "") or ""
                title = job.get("title", "") or ""
                job_id = job["id"]

                skills = extract_skills(description)
                role_cat = detect_role_category(title)

                if skills or role_cat:
                    update_data = {}
                    if skills:
                        update_data["skills"] = skills
                    if role_cat:
                        update_data["role_category"] = role_cat

                    patch_resp = await client.patch(
                        f"{rest_url}/jobs",
                        params={"id": f"eq.{job_id}"},
                        json=update_data,
                    )
                    if patch_resp.status_code < 300:
                        total_updated += 1
                        if total_updated % 20 == 0:
                            print(f"  Updated {total_updated} jobs...")
                    else:
                        print(f"  WARN: Failed to update {job_id}: {patch_resp.status_code}")

            offset += batch_size

        print(f"\nDone! Updated {total_updated} jobs with skills and role categories.")


if __name__ == "__main__":
    asyncio.run(backfill())
