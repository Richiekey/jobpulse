import re
from typing import Tuple, Optional
from src.models.enums import ATSPlatform

DETECTION_PATTERNS = [
    (ATSPlatform.GREENHOUSE, re.compile(r"boards\.greenhouse\.io/([\w-]+)")),
    (ATSPlatform.GREENHOUSE, re.compile(r"job-boards\.greenhouse\.io/([\w-]+)")),
    (ATSPlatform.ASHBY, re.compile(r"jobs\.ashbyhq\.com/([\w-]+)")),
    (ATSPlatform.LEVER, re.compile(r"jobs\.lever\.co/([\w-]+)")),
    (ATSPlatform.WORKABLE, re.compile(r"apply\.workable\.com/([\w-]+)")),
    (ATSPlatform.APPLYTOJOB, re.compile(r"([\w-]+)\.applytojob\.com")),
    (ATSPlatform.JOBVITE, re.compile(r"jobs\.jobvite\.com/([\w-]+)")),
    (ATSPlatform.RECRUITEE, re.compile(r"([\w-]+)\.recruitee\.com")),
    (ATSPlatform.TEAMTAILOR, re.compile(r"([\w-]+)\.teamtailor\.com")),
    (ATSPlatform.SMARTRECRUITERS, re.compile(r"jobs\.smartrecruiters\.com/([\w-]+)")),
    (ATSPlatform.BAMBOOHR, re.compile(r"([\w-]+)\.bamboohr\.com")),
    (ATSPlatform.ICIMS, re.compile(r"([\w-]+)\.icims\.com")),
    (ATSPlatform.WORKDAY, re.compile(r"([\w-]+)\.workdayjobs\.com")),
    (ATSPlatform.JOBRIGHT, re.compile(r"jobright\.ai/jobs/info/([a-zA-Z0-9]+)")),
]

def detect_ats(url: str) -> Tuple[ATSPlatform, Optional[str]]:
    """
    Detects ATS platform and company board identifier/slug from URL.
    Returns (ATSPlatform, identifier) or (UNKNOWN, None).
    """
    if not url:
        return ATSPlatform.UNKNOWN, None

    cleaned_url = url.strip()

    for platform, pattern in DETECTION_PATTERNS:
        match = pattern.search(cleaned_url)
        if match:
            identifier = match.group(1)
            # Filter out generic subpaths if any
            if identifier not in ("embed", "jobs", "apply", "view"):
                return platform, identifier

    return ATSPlatform.UNKNOWN, None

def extract_job_id_from_url(url: str, platform: ATSPlatform) -> Optional[str]:
    """
    Extracts job ID from specific ATS job posting URL.
    """
    if not url:
        return None

    if platform == ATSPlatform.GREENHOUSE:
        match = re.search(r"/jobs/(\d+)", url)
        return match.group(1) if match else None

    elif platform == ATSPlatform.ASHBY:
        match = re.search(r"jobs\.ashbyhq\.com/[\w-]+/([\w-]+)", url, re.IGNORECASE)
        return match.group(1) if match else None

    elif platform == ATSPlatform.LEVER:
        match = re.search(r"jobs\.lever\.co/[\w-]+/([\w-]+)", url, re.IGNORECASE)
        return match.group(1) if match else None

    elif platform == ATSPlatform.JOBRIGHT:
        match = re.search(r"jobright\.ai/jobs/info/([a-zA-Z0-9]+)", url, re.IGNORECASE)
        return match.group(1) if match else None

    return None
