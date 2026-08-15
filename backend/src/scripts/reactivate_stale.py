"""
One-time script to re-activate all STALE jobs that were incorrectly
marked stale due to the missing source_company_id filter bug.
"""
import asyncio
import httpx
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.config import settings


async def reactivate_stale_jobs():
    """Patch all STALE jobs back to ACTIVE in batches."""
    rest_url = f"{settings.supabase_url.rstrip('/')}/rest/v1"
    headers = {
        "apikey": settings.supabase_key,
        "Authorization": f"Bearer {settings.supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    async with httpx.AsyncClient(headers=headers, timeout=60) as client:
        # Bulk PATCH: set all STALE -> ACTIVE
        print("Patching all STALE jobs to ACTIVE...")
        resp = await client.patch(
            f"{rest_url}/jobs",
            params={"status": "eq.STALE"},
            json={"status": "ACTIVE"},
        )

        if resp.status_code < 300:
            print(f"✅ Successfully re-activated STALE jobs (status: {resp.status_code})")
        else:
            print(f"❌ Failed: {resp.status_code} - {resp.text[:500]}")

        # Quick count of active jobs
        resp2 = await client.get(
            f"{rest_url}/jobs",
            params={"status": "eq.ACTIVE", "select": "id", "limit": "1"},
            headers={**headers, "Range": "0-0", "Prefer": "count=exact"},
        )
        cr = resp2.headers.get("content-range", "")
        print(f"Content-Range: {cr}")
        if "/" in cr:
            print(f"Active jobs now: {cr.split('/')[1]}")


if __name__ == "__main__":
    asyncio.run(reactivate_stale_jobs())
