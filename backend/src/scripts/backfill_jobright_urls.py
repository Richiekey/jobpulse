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
    r'https?://(?:boards\.)?greenhouse\.io/[a-zA-Z0-9_\-\./]+',
    r'https?://jobs\.ashbyhq\.com/[a-zA-Z0-9_\-\./]+',
    r'https?://jobs\.lever\.co/[a-zA-Z0-9_\-\./]+',
    r'https?://[a-zA-Z0-9_\-\.]+\.myworkdayjobs\.com/[a-zA-Z0-9_\-\./]+',
    r'https?://jobs\.smartrecruiters\.com/[a-zA-Z0-9_\-\./]+',
    r'https?://[a-zA-Z0-9_\-\.]+\.workable\.com/[a-zA-Z0-9_\-\./]+',
    r'https?://[a-zA-Z0-9_\-\.]+\.icims\.com/[a-zA-Z0-9_\-\./]+',
    r'https?://[a-zA-Z0-9_\-\.]+\.jobvite\.com/[a-zA-Z0-9_\-\./]+',
    r'https?://[a-zA-Z0-9_\-\.]+\.applytojob\.com/[a-zA-Z0-9_\-\./]+',
]

HELPER_URL_FIELDS = [
    "applyUrl", "jobApplyUrl", "originalUrl", "externalUrl",
    "companyJobUrl", "sourceUrl", "directUrl", "applyLink",
    "applicationUrl", "externalApplyUrl",
]


def fetch_direct_url(jobright_url: str) -> str | None:
    """Fetch a Jobright detail page and extract the direct ATS URL."""
    try:
        resp = httpx.get(jobright_url, timeout=15, follow_redirects=True, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        })
        if resp.status_code != 200:
            return None

        soup = BeautifulSoup(resp.text, "html.parser")

        # 1. Try helper_data
        helper_tag = soup.find("script", id="jobright-helper-job-detail-info")
        if helper_tag and helper_tag.string:
            try:
                helper = json.loads(helper_tag.string)
                if isinstance(helper, dict):
                    for field in HELPER_URL_FIELDS:
                        val = helper.get(field)
                        if val and isinstance(val, str) and "jobright.ai" not in val:
                            return val.strip()
            except json.JSONDecodeError:
                pass

        # 2. Try JSON-LD
        for script in soup.find_all("script", type="application/ld+json"):
            if not script.string:
                continue
            try:
                ld = json.loads(script.string)
                if isinstance(ld, dict) and ld.get("@type") == "JobPosting":
                    for field in ("url", "sameAs"):
                        val = ld.get(field)
                        if val and isinstance(val, str) and "jobright.ai" not in val:
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
                supabase.table("jobs").update({"apply_url": direct}).eq("id", job["id"]).execute()
                updated += 1
                print(f"  ✓ {job.get('company_name', '?')}: {direct[:60]}...")
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
