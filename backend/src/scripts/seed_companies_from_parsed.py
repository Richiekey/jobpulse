"""
Seeds 370+ companies parsed and reconciled from the user's master application and ATS catalog
into the Supabase `companies` table.
"""
import os
import sys
import json
import httpx
from dotenv import load_dotenv

# Load env from backend/.env or frontend/.env.local
load_dotenv()
if not os.getenv("SUPABASE_URL"):
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", ".env.local"))

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL", "https://wvyrivmvpcrhwinzmcyy.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "sb_publishable_GYw1ETm1lMclmijF5_4_Zw_tSbDvcI8")

ATS_STRING_TO_ENUM = {
    "Greenhouse": "GREENHOUSE",
    "Ashby": "ASHBY",
    "Lever": "LEVER",
    "Workday": "WORKDAY",
    "Workable": "WORKABLE",
    "ApplyToJob (JazzHR)": "APPLYTOJOB",
    "Jobvite": "JOBVITE",
    "iCIMS": "ICIMS",
    "SmartRecruiters": "SMARTRECRUITERS",
    "Rippling": "RIPPLING",
    "Recruiterflow": "RECRUITERFLOW",
    "Gusto": "GUSTO_ATS",
    "Manatal / Careers-Page": "MANATAL",
    "JobDiva": "JOBDIVA",
    "Recruitee": "RECRUITEE",
    "Breezy HR": "BREEZY",
    "BambooHR": "BAMBOOHR",
    "CATS": "CATS",
    "Personio": "PERSONIO",
    "Teamtailor": "TEAMTAILOR",
    "Pinpoint": "PINPOINT",
    "Kula": "KULA",
    "Gem": "GEM",
    "Bullhorn": "BULLHORN",
    "Oracle Cloud": "ORACLE_CLOUD",
    "Taleo": "TALEO",
    "ADP": "ADP",
    "JobScore": "JOBSCORE",
    "TriNet": "TRINET",
    "Direct / Custom Career Portal": "UNKNOWN",
}

STAFFING_ATS = {"JOBDIVA", "BULLHORN", "TALEO"}

def load_parsed_records():
    # Try different possible paths
    candidates = [
        os.path.join(os.path.dirname(__file__), "..", "..", "scratch", "parsed_companies.json"),
        r"C:\Users\HP\.gemini\antigravity-ide\brain\0adaedc4-9cf2-4c5b-8b00-5f6aca42ea24\scratch\parsed_companies.json",
    ]
    for p in candidates:
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)
    raise FileNotFoundError("Could not locate parsed_companies.json")

def seed_parsed_companies():
    records = load_parsed_records()
    print(f"Loaded {len(records)} raw records from parsed dataset.")

    # Deduplicate companies by (ats_enum, slug)
    unique_companies = {}
    for r in records:
        ats_raw = r.get("ats", "")
        ats_enum = ATS_STRING_TO_ENUM.get(ats_raw, "UNKNOWN")
        slug = (r.get("slug") or "").strip()
        comp_name = (r.get("actual_company") or "").strip()

        if not slug or not comp_name or comp_name.startswith("http"):
            continue

        key = (ats_enum, slug.lower())
        if key not in unique_companies:
            is_staffing = ats_enum in STAFFING_ATS or "staffing" in comp_name.lower() or "recruiting" in comp_name.lower()
            unique_companies[key] = {
                "name": comp_name,
                "ats": ats_enum,
                "ats_identifier": slug,
                "is_staffing_agency": is_staffing,
                "active": True,
            }
        else:
            # If new name is more descriptive / properly capitalized
            curr_name = unique_companies[key]["name"]
            if len(comp_name) > len(curr_name) and not comp_name.islower():
                unique_companies[key]["name"] = comp_name

    companies_to_seed = list(unique_companies.values())
    print(f"Deduplicated to {len(companies_to_seed)} unique company boards across {len(set(c['ats'] for c in companies_to_seed))} ATS platforms.")

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation",
    }
    url = f"{SUPABASE_URL}/rest/v1/companies"

    inserted_count = 0
    updated_count = 0
    failed_count = 0

    batch_size = 50
    with httpx.Client(timeout=30) as client:
        for i in range(0, len(companies_to_seed), batch_size):
            batch = companies_to_seed[i : i + batch_size]
            resp = client.post(
                f"{url}?on_conflict=ats,ats_identifier",
                headers=headers,
                json=batch
            )
            if resp.status_code in [200, 201]:
                res_json = resp.json()
                inserted_count += len(res_json)
                print(f"  [BATCH {i // batch_size + 1}] Successfully upserted {len(res_json)} companies.")
            else:
                print(f"  [ERROR BATCH {i // batch_size + 1}] Status {resp.status_code}: {resp.text[:200]}")
                # Try single upserts in this failed batch
                for c in batch:
                    single_resp = client.post(
                        f"{url}?on_conflict=ats,ats_identifier",
                        headers=headers,
                        json=c
                    )
                    if single_resp.status_code in [200, 201]:
                        inserted_count += 1
                        print(f"    [OK] {c['name']} ({c['ats']}: {c['ats_identifier']})")
                    else:
                        failed_count += 1
                        print(f"    [FAIL] {c['name']} ({c['ats']}: {c['ats_identifier']}): {single_resp.text[:120]}")

    print(f"\n========================================================")
    print(f"Seeding Complete! Total Upserted: {inserted_count}, Failed: {failed_count}")
    print(f"========================================================")

if __name__ == "__main__":
    seed_parsed_companies()
