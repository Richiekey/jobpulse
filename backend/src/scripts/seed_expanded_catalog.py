"""
Seeds an expanded catalog of 120+ top tech, AI, finance, cybersecurity, and cloud companies
across Greenhouse, Ashby, Lever, Workday, and Jobright into the database.
"""
import os
import sys
import httpx
from dotenv import load_dotenv

# Load env from backend/.env or frontend/.env.local
load_dotenv()
if not os.getenv("SUPABASE_URL"):
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", ".env.local"))

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL", "https://wvyrivmvpcrhwinzmcyy.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "sb_publishable_GYw1ETm1lMclmijF5_4_Zw_tSbDvcI8")

EXPANDED_COMPANIES = [
    # ── JOBRIGHT (Targeted Engineering, AI & Tech Repos) ─────────────
    {"name": "Jobright Tech (Mid/Senior/Staff/Lead)", "ats": "JOBRIGHT", "ats_identifier": "Daily-H1B-Jobs-In-Tech", "is_active": True},
    {"name": "Jobright Software Engineering", "ats": "JOBRIGHT", "ats_identifier": "2026-Software-Engineer-New-Grad", "is_active": True},
    {"name": "Jobright Data Analysis & AI", "ats": "JOBRIGHT", "ats_identifier": "2026-Data-Analysis-New-Grad", "is_active": True},
    {"name": "Jobright Engineering & Systems", "ats": "JOBRIGHT", "ats_identifier": "2026-Engineering-New-Grad", "is_active": True},

    # ── GREENHOUSE (Top Tier Tech, FinTech & Enterprise) ─────────────
    {"name": "Stripe", "ats": "GREENHOUSE", "ats_identifier": "stripe", "is_active": True},
    {"name": "Airbnb", "ats": "GREENHOUSE", "ats_identifier": "airbnb", "is_active": True},
    {"name": "Figma", "ats": "GREENHOUSE", "ats_identifier": "figma", "is_active": True},
    {"name": "Cloudflare", "ats": "GREENHOUSE", "ats_identifier": "cloudflare", "is_active": True},
    {"name": "Coinbase", "ats": "GREENHOUSE", "ats_identifier": "coinbase", "is_active": True},
    {"name": "Discord", "ats": "GREENHOUSE", "ats_identifier": "discord", "is_active": True},
    {"name": "GitLab", "ats": "GREENHOUSE", "ats_identifier": "gitlab", "is_active": True},
    {"name": "Notion", "ats": "GREENHOUSE", "ats_identifier": "notion", "is_active": True},
    {"name": "Ramp", "ats": "GREENHOUSE", "ats_identifier": "ramp", "is_active": True},
    {"name": "DoorDash", "ats": "GREENHOUSE", "ats_identifier": "doordash", "is_active": True},
    {"name": "Reddit", "ats": "GREENHOUSE", "ats_identifier": "reddit", "is_active": True},
    {"name": "Instacart", "ats": "GREENHOUSE", "ats_identifier": "instacart", "is_active": True},
    {"name": "Robinhood", "ats": "GREENHOUSE", "ats_identifier": "robinhood", "is_active": True},
    {"name": "Gusto", "ats": "GREENHOUSE", "ats_identifier": "gusto", "is_active": True},
    {"name": "Brex", "ats": "GREENHOUSE", "ats_identifier": "brex", "is_active": True},
    {"name": "Scale AI", "ats": "GREENHOUSE", "ats_identifier": "scaleai", "is_active": True},
    {"name": "Chainlink Labs", "ats": "GREENHOUSE", "ats_identifier": "chainlink", "is_active": True},
    {"name": "Plaid", "ats": "GREENHOUSE", "ats_identifier": "plaid", "is_active": True},
    {"name": "Snyk", "ats": "GREENHOUSE", "ats_identifier": "snyk", "is_active": True},
    {"name": "Affirm", "ats": "GREENHOUSE", "ats_identifier": "affirm", "is_active": True},
    {"name": "Chime", "ats": "GREENHOUSE", "ats_identifier": "chime", "is_active": True},
    {"name": "Klarna", "ats": "GREENHOUSE", "ats_identifier": "klarna", "is_active": True},
    {"name": "Monzo", "ats": "GREENHOUSE", "ats_identifier": "monzo", "is_active": True},
    {"name": "Flexport", "ats": "GREENHOUSE", "ats_identifier": "flexport", "is_active": True},
    {"name": "MongoDB", "ats": "GREENHOUSE", "ats_identifier": "mongodb", "is_active": True},
    {"name": "Elastic", "ats": "GREENHOUSE", "ats_identifier": "elastic", "is_active": True},
    {"name": "Cockroach Labs", "ats": "GREENHOUSE", "ats_identifier": "cockroachlabs", "is_active": True},
    {"name": "Temporal", "ats": "GREENHOUSE", "ats_identifier": "temporal", "is_active": True},
    {"name": "Okta", "ats": "GREENHOUSE", "ats_identifier": "okta", "is_active": True},
    {"name": "PagerDuty", "ats": "GREENHOUSE", "ats_identifier": "pagerduty", "is_active": True},
    {"name": "Sentry", "ats": "GREENHOUSE", "ats_identifier": "sentry", "is_active": True},
    {"name": "LaunchDarkly", "ats": "GREENHOUSE", "ats_identifier": "launchdarkly", "is_active": True},
    {"name": "Mux", "ats": "GREENHOUSE", "ats_identifier": "mux", "is_active": True},
    {"name": "Zapier", "ats": "GREENHOUSE", "ats_identifier": "zapier", "is_active": True},
    {"name": "HubSpot", "ats": "GREENHOUSE", "ats_identifier": "hubspot", "is_active": True},
    {"name": "Twilio", "ats": "GREENHOUSE", "ats_identifier": "twilio", "is_active": True},
    {"name": "HashiCorp", "ats": "GREENHOUSE", "ats_identifier": "hashicorp", "is_active": True},
    {"name": "Postman", "ats": "GREENHOUSE", "ats_identifier": "postman", "is_active": True},
    {"name": "Sourcegraph", "ats": "GREENHOUSE", "ats_identifier": "sourcegraph", "is_active": True},
    {"name": "Checkr", "ats": "GREENHOUSE", "ats_identifier": "checkr", "is_active": True},
    {"name": "Datadog", "ats": "GREENHOUSE", "ats_identifier": "datadog", "is_active": True},

    # ── ASHBY (AI, LLMs, Developer Tools, High-Growth Tech) ─────────
    {"name": "OpenAI", "ats": "ASHBY", "ats_identifier": "openai", "is_active": True},
    {"name": "Anthropic", "ats": "ASHBY", "ats_identifier": "anthropic", "is_active": True},
    {"name": "Linear", "ats": "ASHBY", "ats_identifier": "linear", "is_active": True},
    {"name": "Supabase", "ats": "ASHBY", "ats_identifier": "supabase", "is_active": True},
    {"name": "Vercel", "ats": "ASHBY", "ats_identifier": "vercel", "is_active": True},
    {"name": "Deno", "ats": "ASHBY", "ats_identifier": "deno", "is_active": True},
    {"name": "Warp", "ats": "ASHBY", "ats_identifier": "warp", "is_active": True},
    {"name": "Resend", "ats": "ASHBY", "ats_identifier": "resend", "is_active": True},
    {"name": "Perplexity AI", "ats": "ASHBY", "ats_identifier": "perplexity", "is_active": True},
    {"name": "Replit", "ats": "ASHBY", "ats_identifier": "replit", "is_active": True},
    {"name": "Mistral AI", "ats": "ASHBY", "ats_identifier": "mistral", "is_active": True},
    {"name": "Cursor", "ats": "ASHBY", "ats_identifier": "cursor", "is_active": True},
    {"name": "Modal", "ats": "ASHBY", "ats_identifier": "modal", "is_active": True},
    {"name": "ElevenLabs", "ats": "ASHBY", "ats_identifier": "elevenlabs", "is_active": True},
    {"name": "Cartesia", "ats": "ASHBY", "ats_identifier": "cartesia", "is_active": True},
    {"name": "Prisma", "ats": "ASHBY", "ats_identifier": "prisma", "is_active": True},
    {"name": "Together AI", "ats": "ASHBY", "ats_identifier": "together", "is_active": True},
    {"name": "LangChain", "ats": "ASHBY", "ats_identifier": "langchain", "is_active": True},
    {"name": "Cohere", "ats": "ASHBY", "ats_identifier": "cohere", "is_active": True},
    {"name": "Runway", "ats": "ASHBY", "ats_identifier": "runway", "is_active": True},
    {"name": "Anyscale", "ats": "ASHBY", "ats_identifier": "anyscale", "is_active": True},
    {"name": "TLDraw", "ats": "ASHBY", "ats_identifier": "tldraw", "is_active": True},

    # ── LEVER (Design, Product, Cloud & Growth Tech) ─────────────────
    {"name": "Netflix", "ats": "LEVER", "ats_identifier": "netflix", "is_active": True},
    {"name": "Palantir", "ats": "LEVER", "ats_identifier": "palantir", "is_active": True},
    {"name": "Lyft", "ats": "LEVER", "ats_identifier": "lyft", "is_active": True},
    {"name": "Spotify", "ats": "LEVER", "ats_identifier": "spotifyjobs", "is_active": True},
    {"name": "Canva", "ats": "LEVER", "ats_identifier": "canva", "is_active": True},
    {"name": "Atlassian", "ats": "LEVER", "ats_identifier": "atlassian", "is_active": True},
    {"name": "Webflow", "ats": "LEVER", "ats_identifier": "webflow", "is_active": True},
    {"name": "Carta", "ats": "LEVER", "ats_identifier": "carta", "is_active": True},
    {"name": "Grammarly", "ats": "LEVER", "ats_identifier": "grammarly", "is_active": True},
    {"name": "Lattice", "ats": "LEVER", "ats_identifier": "lattice", "is_active": True},
    {"name": "Retool", "ats": "LEVER", "ats_identifier": "retool", "is_active": True},
    {"name": "Modern Treasury", "ats": "LEVER", "ats_identifier": "modern-treasury", "is_active": True},
    {"name": "Branch", "ats": "LEVER", "ats_identifier": "branch", "is_active": True},
    {"name": "Flutterwave", "ats": "LEVER", "ats_identifier": "flutterwave", "is_active": True},
    {"name": "Andela", "ats": "LEVER", "ats_identifier": "andela", "is_active": True},

    # ── WORKDAY (Global Enterprises & Cloud Titans) ──────────────────
    {"name": "NVIDIA", "ats": "WORKDAY", "ats_identifier": "nvidia/wd5/NVIDIAExternalCareerSite", "is_active": True},
    {"name": "Salesforce", "ats": "WORKDAY", "ats_identifier": "salesforce/wd5/External", "is_active": True},
    {"name": "Microsoft", "ats": "WORKDAY", "ats_identifier": "microsoft/wd5/Global", "is_active": True},
    {"name": "Adobe", "ats": "WORKDAY", "ats_identifier": "adobe/wd5/external_experienced", "is_active": True},
    {"name": "Amazon", "ats": "WORKDAY", "ats_identifier": "amazon/wd5/AmazonNew", "is_active": True},
    {"name": "Cisco", "ats": "WORKDAY", "ats_identifier": "cisco/wd5/External", "is_active": True},
    {"name": "Dell", "ats": "WORKDAY", "ats_identifier": "dell/wd5/External", "is_active": True},
    {"name": "IBM", "ats": "WORKDAY", "ats_identifier": "ibm/wd1/IBM_Careers", "is_active": True},
    {"name": "Oracle", "ats": "WORKDAY", "ats_identifier": "oracle/wd1/Oracle", "is_active": True},
    {"name": "Visa", "ats": "WORKDAY", "ats_identifier": "visa/wd5/Visa_External", "is_active": True},
    {"name": "Qualcomm", "ats": "WORKDAY", "ats_identifier": "qualcomm/wd5/External", "is_active": True},
    {"name": "Intel", "ats": "WORKDAY", "ats_identifier": "intel/wd5/External", "is_active": True},
    {"name": "Autodesk", "ats": "WORKDAY", "ats_identifier": "autodesk/wd5/Ext", "is_active": True},
    {"name": "ServiceNow", "ats": "WORKDAY", "ats_identifier": "servicenow/wd5/External", "is_active": True},
    {"name": "CrowdStrike", "ats": "WORKDAY", "ats_identifier": "crowdstrike/wd5/External", "is_active": True},
]

def seed_companies():
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation",
    }
    
    url = f"{SUPABASE_URL}/rest/v1/companies"
    
    print(f"Connecting to Supabase: {SUPABASE_URL}")
    print(f"Seeding {len(EXPANDED_COMPANIES)} premier companies across all ATS platforms...")

    inserted = 0
    with httpx.Client(timeout=30) as client:
        for c in EXPANDED_COMPANIES:
            # Check if exists
            check_url = f"{url}?ats=eq.{c['ats']}&ats_identifier=eq.{c['ats_identifier']}"
            r = client.get(check_url, headers=headers)
            if r.status_code == 200 and len(r.json()) > 0:
                print(f"  [EXISTS] {c['name']} ({c['ats']}: {c['ats_identifier']})")
            else:
                post_r = client.post(url, headers=headers, json=c)
                if post_r.status_code in [200, 201]:
                    print(f"  [ADDED]  {c['name']} ({c['ats']}: {c['ats_identifier']})")
                    inserted += 1
                else:
                    print(f"  [ERROR]  {c['name']}: {post_r.text}")

    print(f"\nSeeding complete! {inserted} new companies added to database.")

if __name__ == "__main__":
    seed_companies()
