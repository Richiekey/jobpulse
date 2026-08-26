"""
Backfill script: Fetch direct ATS apply URLs for Jobright jobs.
For each Jobright job that still has a jobright.ai apply_url,
this fetches the jobright.ai detail page and extracts the real ATS URL
from the helper_data, json_ld, or description.
"""
import re
import os
import json
import time
import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("c:/Users/HP/Documents/job link scraper/backend/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://wvyrivmvpcrhwinzmcyy.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY", "sb_publishable_GYw1ETm1lMclmijF5_4_Zw_tSbDvcI8")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Known ATS URL patterns
ATS_PATTERNS = [
    r'https?://(?:boards\.|job-boards\.)?greenhouse\.io/[a-zA-Z0-9_\-\./]+',
    r'https?://jobs\.ashbyhq\.com/[a-zA-Z0-9_\-\./]+',
    r'https?://jobs\.lever\.co/[a-zA-Z0-9_\-\./]+',
    r'https?://[a-zA-Z0-9_\-\.]+\.myworkdayjobs\.com/[a-zA-Z0-9_\-\./]+',
    r'https?://jobs\.smartrecruiters\.com/[a-zA-Z0-9_\-\./]+',
    r'https?://[a-zA-Z0-9_\-\.]+\.workable\.com/[a-zA-Z0-9_\-\./]+',
    r'https?://[a-zA-Z0-9_\-\.]+\.icims\.com/[a-zA-Z0-9_\-\./]+',
    r'https?://[a-zA-Z0-9_\-\.]+\.jobvite\.com/[a-zA-Z0-9_\-\./]+',
    r'https?://[a-zA-Z0-9_\-\.]+\.applytojob\.com/[a-zA-Z0-9_\-\./]+',
    r'https?://[a-zA-Z0-9_\-\.]+\.jibeapply\.com/[a-zA-Z0-9_\-\./]+',
    r'https?://career\d*\.successfactors\.com/[a-zA-Z0-9_\-\./\?=&]+',
    r'https?://workforcenow\.adp\.com/[a-zA-Z0-9_\-\./\?=&]+',
    r'https?://careers\.[a-zA-Z0-9_\-\.]+\.com/[a-zA-Z0-9_\-\./]+',
    r'https?://jobs\.[a-zA-Z0-9_\-\.]+\.com/[a-zA-Z0-9_\-\./]+',
    r'https?://(?:www\.)?linkedin\.com/jobs/view/\d+',
]

HELPER_URL_FIELDS = [
    "originalUrl", "applyLink", "applyUrl", "jobApplyUrl", "externalUrl",
    "companyJobUrl", "sourceUrl", "directUrl", "applicationUrl", "externalApplyUrl",
]

_session_id = "af5f3ceeb49e4aa5ac932f696b158c55"

def ensure_session() -> str:
    global _session_id
    if _session_id:
        return _session_id
    try:
        r = httpx.post("https://jobright.ai/swan/auth/login/pwd", json={
            "email": "merichie430@gmail.com",
            "password": "Jobpulse12345"
        }, headers={
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Origin": "https://jobright.ai",
            "Referer": "https://jobright.ai/"
        }, timeout=10)
        if r.status_code == 200:
            set_cookie = r.headers.get("set-cookie", "")
            m = re.search(r"SESSION_ID=([^;]+)", set_cookie)
            if m:
                _session_id = m.group(1)
    except Exception as e:
        print("Login error:", e)
    return _session_id


def fetch_direct_url(jobright_url: str) -> str | None:
    """Fetch a Jobright detail page with authenticated session and extract the direct ATS URL."""
    try:
        session = ensure_session()
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }
        if session:
            headers["Cookie"] = f"SESSION_ID={session}"

        resp = httpx.get(jobright_url, timeout=15, follow_redirects=True, headers=headers)
        if resp.status_code != 200:
            return None

        # 1. Try helper_data (richest, contains originalUrl / applyLink when authenticated)
        m = re.search(r'<script\s+id="jobright-helper-job-detail-info"[^>]*>(.*?)</script>', resp.text, re.DOTALL)
        if m:
            try:
                helper_data = json.loads(m.group(1))
                jr = helper_data.get("jobResult", {})
                for field in HELPER_URL_FIELDS:
                    val = jr.get(field)
                    if val and isinstance(val, str) and "jobright.ai" not in val and val.startswith("http"):
                        return val.strip()
            except Exception:
                pass

        # 2. Try JSON-LD
        soup = BeautifulSoup(resp.text, "html.parser")
        for script in soup.find_all("script", type="application/ld+json"):
            if not script.string:
                continue
            try:
                ld = json.loads(script.string)
                if isinstance(ld, dict) and ld.get("@type") == "JobPosting":
                    for field in ("url", "sameAs"):
                        val = ld.get(field)
                        if val and isinstance(val, str) and "jobright.ai" not in val and val.startswith("http"):
                            return val.strip()
            except json.JSONDecodeError:
                pass

        # 3. Regex from page text
        page_text = resp.text
        for pattern in ATS_PATTERNS:
            match = re.search(pattern, page_text, re.IGNORECASE)
            if match:
                return match.group(0)

        return None
    except Exception as e:
        print(f"  Error fetching {jobright_url}: {e}")
        return None


def main():
    print("=" * 60)
    print("Jobright Direct ATS URL Backfill")
    print("=" * 60)

    page = 0
    batch_size = 500
    updated = 0
    skipped = 0
    failed = 0

    while True:
        res = supabase.table("jobs") \
            .select("id,apply_url,job_url,company_name") \
            .eq("source", "JOBRIGHT") \
            .like("apply_url", "%jobright.ai%") \
            .range(page * batch_size, (page + 1) * batch_size - 1) \
            .execute()

        rows = res.data
        if not rows:
            break

        print(f"\nBatch {page + 1}: {len(rows)} jobs with jobright.ai URLs")

        for job in rows:
            job_url = job.get("job_url") or job.get("apply_url")
            if not job_url or "jobright.ai" not in job_url:
                skipped += 1
                continue

            direct = fetch_direct_url(job_url)
            if direct and "jobright.ai" not in direct:
                supabase.table("jobs").update({"apply_url": direct, "apply_url_original": direct}).eq("id", job["id"]).execute()
                updated += 1
                print(f"  [OK] {job.get('company_name', '?')}: {direct[:60]}...")
            else:
                failed += 1

            # Rate limiting
            time.sleep(0.3)

        page += 1

    print(f"\n{'=' * 60}")
    print(f"Done! Updated: {updated} | Failed: {failed} | Skipped: {skipped}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
