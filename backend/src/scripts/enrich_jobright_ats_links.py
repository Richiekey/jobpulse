import re
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("c:/Users/HP/Documents/job link scraper/backend/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://wvyrivmvpcrhwinzmcyy.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY", "sb_publishable_GYw1ETm1lMclmijF5_4_Zw_tSbDvcI8")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Dictionary of top tech companies and their direct ATS career boards
ATS_COMPANY_MAP = {
    # Greenhouse
    "stripe": "https://boards.greenhouse.io/stripe",
    "airbnb": "https://boards.greenhouse.io/airbnb",
    "figma": "https://boards.greenhouse.io/figma",
    "cloudflare": "https://boards.greenhouse.io/cloudflare",
    "coinbase": "https://boards.greenhouse.io/coinbase",
    "doordash": "https://boards.greenhouse.io/doordash",
    "robinhood": "https://boards.greenhouse.io/robinhood",
    "scale ai": "https://boards.greenhouse.io/scaleai",
    "scale": "https://boards.greenhouse.io/scaleai",
    "ramp": "https://boards.greenhouse.io/ramp",
    "affirm": "https://boards.greenhouse.io/affirm",
    "sentry": "https://boards.greenhouse.io/sentry",
    "twilio": "https://boards.greenhouse.io/twilio",
    "gusto": "https://boards.greenhouse.io/gusto",
    "instacart": "https://boards.greenhouse.io/instacart",
    "snap": "https://boards.greenhouse.io/snap",
    "snapchat": "https://boards.greenhouse.io/snap",
    "brex": "https://boards.greenhouse.io/brex",
    "datadog": "https://boards.greenhouse.io/datadog",
    "chime": "https://boards.greenhouse.io/chime",
    "plaid": "https://boards.greenhouse.io/plaid",
    "gitlab": "https://boards.greenhouse.io/gitlab",
    "dropbox": "https://boards.greenhouse.io/dropbox",
    "hashicorp": "https://boards.greenhouse.io/hashicorp",
    "cockroach labs": "https://boards.greenhouse.io/cockroachlabs",
    "dbt labs": "https://boards.greenhouse.io/dbtlabs",
    "checkr": "https://boards.greenhouse.io/checkr",
    "blend": "https://boards.greenhouse.io/blend",
    "remote": "https://boards.greenhouse.io/remote",
    "lattice": "https://boards.greenhouse.io/lattice",
    "webflow": "https://boards.greenhouse.io/webflow",
    "flexport": "https://boards.greenhouse.io/flexport",
    "ironclad": "https://boards.greenhouse.io/ironclad",
    "carta": "https://boards.greenhouse.io/carta",
    "reddit": "https://boards.greenhouse.io/reddit",
    "discord": "https://boards.greenhouse.io/discord",
    "uber": "https://boards.greenhouse.io/uber",
    "lyft": "https://jobs.lever.co/lyft",
    "netflix": "https://jobs.lever.co/netflix",
    "atlassian": "https://jobs.lever.co/atlassian",
    "spotify": "https://jobs.lever.co/spotify",
    "palantir": "https://jobs.lever.co/palantir",
    "anthropic": "https://jobs.ashbyhq.com/anthropic",
    "openai": "https://jobs.ashbyhq.com/openai",
    "linear": "https://jobs.ashbyhq.com/linear",
    "retool": "https://jobs.ashbyhq.com/retool",
    "cursor": "https://jobs.ashbyhq.com/anysphere",
    "anysphere": "https://jobs.ashbyhq.com/anysphere",
    "perplexity": "https://jobs.ashbyhq.com/perplexity",
    "cohere": "https://jobs.ashbyhq.com/cohere",
    "mistral": "https://jobs.ashbyhq.com/mistral",
    "amazon": "https://amazon.jobs",
    "microsoft": "https://careers.microsoft.com",
    "google": "https://careers.google.com",
    "apple": "https://jobs.apple.com",
    "meta": "https://metacareers.com",
    "nvidia": "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite",
    "salesforce": "https://salesforce.wd12.myworkdayjobs.com/External_Career_Site",
    "adobe": "https://adobe.wd5.myworkdayjobs.com/external_experienced",
    "oracle": "https://oracle.wd1.myworkdayjobs.com/Careers",
    "qualcomm": "https://qualcomm.wd5.myworkdayjobs.com/External",
    "intel": "https://intel.wd1.myworkdayjobs.com/External",
    "autodesk": "https://autodesk.wd1.myworkdayjobs.com/Ext",
    "crowdstrike": "https://crowdstrike.wd5.myworkdayjobs.com/crowdstrikecareers",
    "cisco": "https://jobs.cisco.com",
}

def clean_company_name(name: str) -> str:
    cleaned = re.sub(r'\(.*?\)', '', name)
    cleaned = re.sub(r'\b(Inc\.?|LLC|Corp\.?|Corporation|Ltd\.?|Limited|Group|Technologies|Tech|Software|Solutions)\b', '', cleaned, flags=re.I)
    return cleaned.strip()

def get_direct_career_link(company: str) -> str:
    c_lower = company.lower().strip()
    c_clean = clean_company_name(company).lower()
    
    if c_lower in ATS_COMPANY_MAP:
        return ATS_COMPANY_MAP[c_lower]
    if c_clean in ATS_COMPANY_MAP:
        return ATS_COMPANY_MAP[c_clean]
        
    slug = re.sub(r'[^a-zA-Z0-9]', '', c_clean)
    if slug:
        return f"https://www.{slug}.com/careers"
    return f"https://www.{re.sub(r'[^a-zA-Z0-9]', '', company.lower())}.com/careers"

print("Starting ATS link enrichment for Jobright listings...")
# Fetch active Jobright jobs
page = 0
batch_size = 1000
updated_count = 0

while True:
    res = supabase.table("jobs") \
        .select("id,company_name,source,apply_url") \
        .eq("source", "JOBRIGHT") \
        .range(page * batch_size, (page + 1) * batch_size - 1) \
        .execute()
    
    rows = res.data
    if not rows:
        break
        
    for job in rows:
        comp = job.get("company_name") or ""
        direct_link = get_direct_career_link(comp)
        
        # If current apply_url is a jobright link, update it with direct ATS link
        if direct_link and ("jobright.ai" in (job.get("apply_url") or "")):
            supabase.table("jobs").update({"apply_url": direct_link}).eq("id", job["id"]).execute()
            updated_count += 1
            
    print(f"Processed batch {page + 1}, total updated: {updated_count}")
    page += 1

print(f"Finished! Successfully enriched {updated_count} Jobright listings with direct ATS board links.")
