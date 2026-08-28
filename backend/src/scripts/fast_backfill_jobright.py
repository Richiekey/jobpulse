"""
Fast async backfill script:
Authenticates with Jobright using marketbare@gmail.com,
fetches Jobright detail pages concurrently (15 workers),
extracts direct ATS links (Greenhouse, Ashby, Lever, Workday, etc.),
and updates apply_url and apply_url_original in Supabase.
"""

import os
import re
import json
import time
import asyncio
import httpx
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("c:/Users/HP/Documents/job link scraper/backend/.env")
load_dotenv("c:/Users/HP/Documents/job link scraper/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://wvyrivmvpcrhwinzmcyy.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY", "")
JOBRIGHT_EMAIL = os.getenv("JOBRIGHT_EMAIL", "")
JOBRIGHT_PASSWORD = os.getenv("JOBRIGHT_PASSWORD", "")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

ATS_PATTERNS = [
    re.compile(r'https?://(?:boards\.|job-boards\.)?greenhouse\.io/[a-zA-Z0-9_\-\./]+', re.I),
    re.compile(r'https?://jobs\.ashbyhq\.com/[a-zA-Z0-9_\-\./]+', re.I),
    re.compile(r'https?://jobs\.lever\.co/[a-zA-Z0-9_\-\./]+', re.I),
    re.compile(r'https?://[a-zA-Z0-9_\-\.]+\.myworkdayjobs\.com/[a-zA-Z0-9_\-\./]+', re.I),
    re.compile(r'https?://jobs\.smartrecruiters\.com/[a-zA-Z0-9_\-\./]+', re.I),
    re.compile(r'https?://[a-zA-Z0-9_\-\.]+\.workable\.com/[a-zA-Z0-9_\-\./]+', re.I),
    re.compile(r'https?://[a-zA-Z0-9_\-\.]+\.icims\.com/[a-zA-Z0-9_\-\./]+', re.I),
    re.compile(r'https?://[a-zA-Z0-9_\-\.]+\.applytojob\.com/[a-zA-Z0-9_\-\./]+', re.I),
    re.compile(r'https?://[a-zA-Z0-9_\-\.]+\.jobvite\.com/[a-zA-Z0-9_\-\./]+', re.I),
    re.compile(r'https?://[a-zA-Z0-9_\-\.]+\.breezy\.hr/[a-zA-Z0-9_\-\./]+', re.I),
    re.compile(r'https?://[a-zA-Z0-9_\-\.]+\.recruitee\.com/[a-zA-Z0-9_\-\./]+', re.I),
    re.compile(r'https?://[a-zA-Z0-9_\-\.]+\.jibeapply\.com/[a-zA-Z0-9_\-\./]+', re.I),
    re.compile(r'https?://career\d*\.successfactors\.com/[a-zA-Z0-9_\-\./\?=&]+', re.I),
    re.compile(r'https?://workforcenow\.adp\.com/[a-zA-Z0-9_\-\./\?=&]+', re.I),
    re.compile(r'https?://careers\.[a-zA-Z0-9_\-\.]+\.com/[a-zA-Z0-9_\-\./]+', re.I),
    re.compile(r'https?://jobs\.[a-zA-Z0-9_\-\.]+\.com/[a-zA-Z0-9_\-\./]+', re.I),
    re.compile(r'https?://(?:www\.)?linkedin\.com/jobs/view/\d+', re.I),
]

HELPER_URL_FIELDS = [
    "originalUrl", "applyLink", "sourceUrl", "externalUrl", "jobApplyUrl",
    "directUrl", "applicationUrl", "companyJobUrl"
]

cached_session_id = None

async def login_jobright(client: httpx.AsyncClient) -> str | None:
    global cached_session_id
    if cached_session_id:
        return cached_session_id
    try:
        resp = await client.post(
            "https://jobright.ai/swan/auth/login/pwd",
            json={"email": JOBRIGHT_EMAIL, "password": JOBRIGHT_PASSWORD},
            headers={
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Origin": "https://jobright.ai",
                "Referer": "https://jobright.ai/",
            },
            timeout=10
        )
        if resp.status_code == 200:
            cookie_header = resp.headers.get("set-cookie", "")
            match = re.search(r"SESSION_ID=([^;]+)", cookie_header)
            if match:
                cached_session_id = match.group(1)
                print(f"[AUTH] Successfully logged into Jobright. Session: {cached_session_id[:8]}...")
                return cached_session_id
    except Exception as e:
        print(f"[AUTH ERROR] {e}")
    return None


async def resolve_job(client: httpx.AsyncClient, session_id: str, job: dict, sem: asyncio.Semaphore):
    job_id = job["id"]
    job_url = job.get("job_url") or job.get("apply_url")
    company_name = job.get("company_name", "Unknown")

    if not job_url or "jobright.ai" not in job_url:
        return None

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Referer": "https://jobright.ai/",
        "Cookie": f"SESSION_ID={session_id}",
    }

    async with sem:
        try:
            resp = await client.get(job_url, headers=headers, follow_redirects=True, timeout=12)
            if resp.status_code != 200:
                return None

            html = resp.text
            direct_url = None

            # 1. helper script
            m = re.search(r'<script\s+id="jobright-helper-job-detail-info"[^>]*>(.*?)</script>', html, re.DOTALL)
            if m:
                try:
                    data = json.loads(m.group(1))
                    jr = data.get("jobResult", {})
                    for f in HELPER_URL_FIELDS:
                        val = jr.get(f)
                        if val and isinstance(val, str) and val.startswith("http") and "jobright.ai" not in val:
                            direct_url = val.strip()
                            break
                except Exception:
                    pass

            # 2. JSON-LD
            if not direct_url:
                ld_matches = re.finditer(r'<script\s+type="application/ld\+json"[^>]*>(.*?)</script>', html, re.DOTALL)
                for ld_m in ld_matches:
                    try:
                        ld = json.loads(ld_m.group(1))
                        if isinstance(ld, dict) and ld.get("@type") == "JobPosting":
                            for f in ("url", "sameAs"):
                                val = ld.get(f)
                                if val and isinstance(val, str) and val.startswith("http") and "jobright.ai" not in val:
                                    direct_url = val.strip()
                                    break
                    except Exception:
                        pass
                    if direct_url:
                        break

            # 3. Regex on ATS patterns
            if not direct_url:
                for pattern in ATS_PATTERNS:
                    match = pattern.search(html)
                    if match:
                        cand = match.group(0).rstrip(".")
                        if not any(cand.endswith(ext) for ext in [".js", ".css", ".png", ".jpg", ".svg", ".woff"]):
                            direct_url = cand
                            break

            if direct_url and "jobright.ai" not in direct_url:
                return {"id": job_id, "direct_url": direct_url, "company": company_name}
        except Exception:
            pass

    return None


async def run():
    print("=" * 60)
    print("Fast Concurrent Jobright URL Resolver & DB Updater")
    print("=" * 60)

    async with httpx.AsyncClient(limits=httpx.Limits(max_keepalive_connections=30, max_connections=50)) as client:
        session_id = await login_jobright(client)
        if not session_id:
            print("[ERROR] Could not obtain Jobright session ID.")
            return

        sem = asyncio.Semaphore(15)
        offset = 0
        batch_size = 200
        total_resolved = 0

        while True:
            # Query jobs that are ACTIVE and have jobright.ai apply_url
            res = supabase.table("jobs") \
                .select("id,company_name,title,job_url,apply_url") \
                .eq("source", "JOBRIGHT") \
                .eq("status", "ACTIVE") \
                .like("apply_url", "%jobright.ai%") \
                .range(offset, offset + batch_size - 1) \
                .execute()

            rows = res.data
            if not rows:
                print("\n[COMPLETE] No more unresolved active Jobright jobs.")
                break

            print(f"\nProcessing batch {offset // batch_size + 1} ({len(rows)} jobs)...")

            tasks = [resolve_job(client, session_id, job, sem) for job in rows]
            results = await asyncio.gather(*tasks)

            resolved_batch = [r for r in results if r]
            print(f"  -> Successfully extracted {len(resolved_batch)} / {len(rows)} direct ATS URLs in batch.")

            # Update DB for resolved
            for item in resolved_batch:
                try:
                    supabase.table("jobs").update({
                        "apply_url": item["direct_url"],
                        "apply_url_original": item["direct_url"]
                    }).eq("id", item["id"]).execute()
                    total_resolved += 1
                except Exception as db_err:
                    print(f"  [DB ERROR] {db_err}")

            print(f"  -> Total resolved so far: {total_resolved}")

            # If fewer than batch_size, we've reached the end
            if len(rows) < batch_size:
                break

            offset += batch_size

    print("=" * 60)
    print(f"Finished! Total Jobright listings resolved with direct ATS links: {total_resolved}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run())
