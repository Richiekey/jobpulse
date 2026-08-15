"""
Seed script to add Jobright repositories to the companies table in Supabase.
"""
import asyncio
import httpx
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.config import settings

TARGET_JOBRIGHT_REPOS = [
    {
        "name": "Jobright Tech (Mid/Senior/Staff/Lead)",
        "website": "https://jobright.ai",
        "career_url": "https://github.com/jobright-ai/Daily-H1B-Jobs-In-Tech",
        "ats": "JOBRIGHT",
        "ats_identifier": "Daily-H1B-Jobs-In-Tech",
        "country": "United States",
        "active": True
    },
    {
        "name": "Jobright Software Engineering",
        "website": "https://jobright.ai",
        "career_url": "https://github.com/jobright-ai/2026-Software-Engineer-New-Grad",
        "ats": "JOBRIGHT",
        "ats_identifier": "2026-Software-Engineer-New-Grad",
        "country": "United States",
        "active": True
    },
    {
        "name": "Jobright Data Analysis & AI",
        "website": "https://jobright.ai",
        "career_url": "https://github.com/jobright-ai/2026-Data-Analysis-New-Grad",
        "ats": "JOBRIGHT",
        "ats_identifier": "2026-Data-Analysis-New-Grad",
        "country": "United States",
        "active": True
    },
    {
        "name": "Jobright Engineering & Systems",
        "website": "https://jobright.ai",
        "career_url": "https://github.com/jobright-ai/2026-Engineering-New-Grad",
        "ats": "JOBRIGHT",
        "ats_identifier": "2026-Engineering-New-Grad",
        "country": "United States",
        "active": True
    }
]


async def seed_jobright_companies():
    rest_url = f"{settings.supabase_url.rstrip('/')}/rest/v1"
    headers = {
        "apikey": settings.supabase_key,
        "Authorization": f"Bearer {settings.supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    async with httpx.AsyncClient(headers=headers, timeout=30) as client:
        for comp in TARGET_JOBRIGHT_REPOS:
            # Check if company already exists
            check_resp = await client.get(
                f"{rest_url}/companies",
                params={"ats_identifier": f"eq.{comp['ats_identifier']}", "ats": f"eq.JOBRIGHT", "limit": "1"}
            )
            existing = check_resp.json() if check_resp.status_code < 300 else []
            if existing:
                print(f"[EXISTS] {comp['name']} ({comp['ats_identifier']})")
            else:
                insert_resp = await client.post(f"{rest_url}/companies", json=comp)
                if insert_resp.status_code < 300:
                    print(f"[INSERTED] {comp['name']} ({comp['ats_identifier']})")
                else:
                    print(f"[ERROR] {comp['name']}: {insert_resp.status_code} - {insert_resp.text}")


if __name__ == "__main__":
    asyncio.run(seed_jobright_companies())
