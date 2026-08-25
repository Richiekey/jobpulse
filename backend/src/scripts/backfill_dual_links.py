"""
Backfills `apply_url_original` for all Jobright-sourced jobs so users see both:
- Original Direct ATS apply URL (`apply_url_original`)
- Jobright listing URL (`apply_url` / `job_url`)
"""
import re
import os
import httpx
from dotenv import load_dotenv

load_dotenv()
if not os.getenv("SUPABASE_URL"):
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", ".env.local"))

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL", "https://wvyrivmvpcrhwinzmcyy.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "sb_publishable_GYw1ETm1lMclmijF5_4_Zw_tSbDvcI8")

ATS_PATTERNS = [
    r'https?://(?:boards\.)?greenhouse\.io/[a-zA-Z0-9_\-\./]+',
    r'https?://jobs\.ashbyhq\.com/[a-zA-Z0-9_\-\./]+',
    r'https?://jobs\.lever\.co/[a-zA-Z0-9_\-\./]+',
    r'https?://[a-zA-Z0-9_\-\.]+\.myworkdayjobs\.com/[a-zA-Z0-9_\-\./]+',
    r'https?://jobs\.smartrecruiters\.com/[a-zA-Z0-9_\-\./]+',
    r'https?://[a-zA-Z0-9_\-\.]+\.workable\.com/[a-zA-Z0-9_\-\./]+',
    r'https?://[a-zA-Z0-9_\-\.]+\.icims\.com/[a-zA-Z0-9_\-\./]+',
    r'https?://ats\.rippling\.com/[a-zA-Z0-9_\-\./]+',
    r'https?://[a-zA-Z0-9_\-\.]+\.applytojob\.com/[a-zA-Z0-9_\-\./]+',
]

def extract_direct_ats_link(description: str) -> str | None:
    if not description:
        return None
    for pattern in ATS_PATTERNS:
        match = re.search(pattern, description, re.IGNORECASE)
        if match:
            return match.group(0)
    return None

def backfill():
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    url = f"{SUPABASE_URL}/rest/v1/jobs"

    print("Fetching Jobright jobs to backfill apply_url_original...")
    page = 0
    batch_size = 500
    total_updated = 0

    with httpx.Client(timeout=30) as client:
        while True:
            fetch_url = f"{url}?source=eq.JOBRIGHT&select=id,source_job_id,job_url,apply_url,apply_url_original,description&limit={batch_size}&offset={page * batch_size}"
            r = client.get(fetch_url, headers=headers)
            if r.status_code != 200:
                print(f"Error fetching batch: {r.text}")
                break

            rows = r.json()
            if not rows:
                break

            for row in rows:
                jid = row["id"]
                current_orig = row.get("apply_url_original")
                current_apply = row.get("apply_url") or ""
                desc = row.get("description") or ""
                source_jid = row.get("source_job_id") or ""
                jobright_url = row.get("job_url") or f"https://jobright.ai/jobs/info/{source_jid}"

                # Find direct link
                direct_link = extract_direct_ats_link(desc)
                if not direct_link and current_apply and "jobright.ai" not in current_apply:
                    direct_link = current_apply

                update_payload = {}
                if direct_link and direct_link != current_orig:
                    update_payload["apply_url_original"] = direct_link
                if "jobright.ai" not in current_apply:
                    update_payload["apply_url"] = jobright_url

                if update_payload:
                    patch_resp = client.patch(f"{url}?id=eq.{jid}", headers=headers, json=update_payload)
                    if patch_resp.status_code in [200, 204]:
                        total_updated += 1

            print(f"Processed page {page + 1} ({len(rows)} jobs), updated so far: {total_updated}")
            page += 1

    print(f"\nBackfill Complete! Total Jobright listings enriched with dual links: {total_updated}")

if __name__ == "__main__":
    backfill()
