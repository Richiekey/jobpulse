import re
import hashlib
from typing import Optional, Dict, Any

from src.models.enums import EmploymentType, RemoteType

EMPLOYMENT_SYNONYMS = {
    "full-time": EmploymentType.FULL_TIME,
    "full time": EmploymentType.FULL_TIME,
    "fulltime": EmploymentType.FULL_TIME,
    "permanent": EmploymentType.FULL_TIME,
    "regular": EmploymentType.FULL_TIME,
    "part-time": EmploymentType.PART_TIME,
    "part time": EmploymentType.PART_TIME,
    "parttime": EmploymentType.PART_TIME,
    "contract": EmploymentType.CONTRACT,
    "contractor": EmploymentType.CONTRACT,
    "freelance": EmploymentType.CONTRACT,
    "temporary": EmploymentType.TEMPORARY,
    "temp": EmploymentType.TEMPORARY,
    "internship": EmploymentType.INTERNSHIP,
    "intern": EmploymentType.INTERNSHIP,
}

REMOTE_KEYWORDS = ["remote", "work from home", "wfh", "anywhere", "distributed"]
HYBRID_KEYWORDS = ["hybrid", "flexible", "partially remote"]
ONSITE_KEYWORDS = ["onsite", "on-site", "in-office", "office", "in office"]

def normalize_employment_type(raw: Optional[str]) -> Optional[EmploymentType]:
    if not raw:
        return None
    cleaned = raw.strip().lower()
    for key, val in EMPLOYMENT_SYNONYMS.items():
        if key in cleaned:
            return val
    return None

def normalize_remote_type(raw: Optional[str]) -> RemoteType:
    if not raw:
        return RemoteType.UNKNOWN
    cleaned = raw.strip().lower()

    if any(k in cleaned for k in HYBRID_KEYWORDS):
        return RemoteType.HYBRID
    if any(k in cleaned for k in REMOTE_KEYWORDS):
        return RemoteType.REMOTE
    if any(k in cleaned for k in ONSITE_KEYWORDS):
        return RemoteType.ONSITE
    return RemoteType.UNKNOWN

def parse_location(raw_location: Optional[str], workplace_hint: Optional[str] = None) -> Dict[str, Any]:
    remote_type = normalize_remote_type(workplace_hint)
    
    if not raw_location:
        return {
            "location": "Remote" if remote_type == RemoteType.REMOTE else None,
            "city": None,
            "country": None,
            "remote_type": remote_type,
        }

    cleaned = raw_location.strip()
    if remote_type == RemoteType.UNKNOWN:
        remote_type = normalize_remote_type(cleaned)

    parts = [p.strip() for p in cleaned.split(",")]
    city = parts[0] if len(parts) >= 1 and parts[0].lower() not in REMOTE_KEYWORDS else None
    country = parts[-1] if len(parts) >= 2 else None

    # Clean up city/country if it's "Remote"
    if city and city.lower() in REMOTE_KEYWORDS:
        city = None

    return {
        "location": cleaned,
        "city": city,
        "country": country,
        "remote_type": remote_type,
    }

SALARY_PATTERN = re.compile(
    r'(?P<currency>[\$\€\£\¥]|USD|EUR|GBP|CAD|AUD)?\s*'
    r'(?P<min>\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(?:k|K)?'
    r'\s*(?:–|-|to)\s*'
    r'(?P<currency2>[\$\€\£\¥]|USD|EUR|GBP|CAD|AUD)?\s*'
    r'(?P<max>\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(?:k|K)?'
    r'\s*(?P<period>per year|\/yr|annually|year|per hour|\/hr|hour|monthly|\/mo)?',
    re.IGNORECASE
)

def parse_salary(text: Optional[str]) -> Dict[str, Any]:
    result = {"min": None, "max": None, "currency": None, "period": None}
    if not text:
        return result

    match = SALARY_PATTERN.search(text)
    if not match:
        return result

    raw_min = match.group("min").replace(",", "")
    raw_max = match.group("max").replace(",", "")
    
    try:
        val_min = float(raw_min)
        val_max = float(raw_max)

        # Handle 'k' notation if present in string
        match_str = match.group(0).lower()
        if 'k' in match_str and val_min < 1000:
            val_min *= 1000
            val_max *= 1000

        currency = match.group("currency") or match.group("currency2") or "USD"
        period_raw = (match.group("period") or "").lower()
        period = "YEARLY"
        if "hour" in period_raw or "hr" in period_raw:
            period = "HOURLY"
        elif "month" in period_raw or "mo" in period_raw:
            period = "MONTHLY"

        # Reject implausible salary values (likely version numbers, years, etc.)
        min_threshold = 10 if period == "HOURLY" else 1000
        if val_max < min_threshold:
            return result

        # Reject values that look like years (2020-2030)
        if 2020 <= val_min <= 2035 or 2020 <= val_max <= 2035:
            return result

        return {
            "min": val_min,
            "max": val_max,
            "currency": currency,
            "period": period,
        }
    except ValueError:
        return result

def normalize_title(title: str) -> str:
    return re.sub(r'\s+', ' ', title.strip().lower())

def compute_content_hash(description: Optional[str]) -> Optional[str]:
    if not description:
        return None
    return hashlib.sha256(description.encode("utf-8")).hexdigest()

def compute_deduplication_key(company: str, title: str, location: Optional[str]) -> str:
    comp = company.strip().lower()
    norm_t = normalize_title(title)
    loc = (location or "").strip().lower()
    raw = f"{comp}|{norm_t}|{loc}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()
