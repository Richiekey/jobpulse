from src.adapters.jobright import JobrightAdapter
from src.models.enums import ATSPlatform, RemoteType
from src.core.detector import detect_ats, extract_job_id_from_url


SAMPLE_MARKDOWN = """
## Daily Job List

<details>
<summary>Software Engineer</summary>

| Company | Job Title | Level | Location | H1B status | Link | Date Posted |
| ------- | --------- | ----- | -------- | ---------- | ---- | ----------- |
| **[Anthropic](https://www.anthropic.com)** | Staff Software Engineer, Android | Staff/Principal/Lead | San Francisco, CA | 🏅 | [apply](https://jobright.ai/jobs/info/691639439c388539cbdf8d1d?utm_source=1008) | 2026-05-05 |
| ↳ | Security Risk & Compliance, HIPAA | Mid-Level,Senior | Seattle, WA | 🏅 | [apply](https://jobright.ai/jobs/info/69fb0ed987a4820e6da844d4?utm_source=1008) | 2026-05-05 |
| **[Vercel](https://vercel.com)** | Developer Success Engineer | Mid-Level | REMOTE | 🥈 | [apply](https://jobright.ai/jobs/info/69e851d958811370cb123058?utm_source=1008) | 2026-05-06 |
"""


def test_jobright_markdown_parsing():
    adapter = JobrightAdapter()
    jobs = adapter._parse_markdown_table(SAMPLE_MARKDOWN, "Daily-H1B-Jobs-In-Tech")

    assert len(jobs) == 3
    
    # First job
    assert jobs[0]["company_name"] == "Anthropic"
    assert jobs[0]["title"] == "Staff Software Engineer, Android"
    assert jobs[0]["id"] == "691639439c388539cbdf8d1d"
    assert jobs[0]["level"] == "Staff/Principal/Lead"

    # Second job (continuation ↳)
    assert jobs[1]["company_name"] == "Anthropic"
    assert jobs[1]["title"] == "Security Risk & Compliance, HIPAA"
    assert jobs[1]["id"] == "69fb0ed987a4820e6da844d4"

    # Third job
    assert jobs[2]["company_name"] == "Vercel"
    assert jobs[2]["title"] == "Developer Success Engineer"
    assert jobs[2]["location"] == "REMOTE"


def test_jobright_normalization():
    adapter = JobrightAdapter()
    raw_job = {
        "id": "6a7f643d927c79391ad0887b",
        "title": "Senior Cybersecurity Engineer",
        "company_name": "Target",
        "location": "Brooklyn Park, MN",
        "level": "Senior",
        "url": "https://jobright.ai/jobs/info/6a7f643d927c79391ad0887b",
        "posted_date": "2026-08-15",
        "helper_data": {
            "jobTitle": "Senior Cybersecurity Engineer",
            "workModel": "Hybrid",
            "isRemote": False,
            "minSalary": 130000,
            "maxSalary": 180000,
            "employmentType": "Full-time",
            "jobSummary": "Lead cloud security architecture.",
            "coreResponsibilities": ["Design zero-trust architecture", "Perform threat modeling"],
            "skillSummaries": ["5+ years cybersecurity experience", "CISSP or equivalent"]
        }
    }

    job = adapter.normalize(raw_job, company_name="Jobright", company_identifier="Daily-H1B-Jobs-In-Tech")

    assert job.source == ATSPlatform.JOBRIGHT
    assert job.source_job_id == "6a7f643d927c79391ad0887b"
    assert job.company_name == "Target"
    assert job.title == "Senior Cybersecurity Engineer"
    assert job.remote_type == RemoteType.HYBRID
    assert job.salary_min == 130000.0
    assert job.salary_max == 180000.0
    assert "Responsibilities" in job.description


def test_jobright_detection():
    url = "https://jobright.ai/jobs/info/691639439c388539cbdf8d1d?utm_source=test"
    ats, identifier = detect_ats(url)
    assert ats == ATSPlatform.JOBRIGHT
    assert identifier == "691639439c388539cbdf8d1d"

    job_id = extract_job_id_from_url(url, ATSPlatform.JOBRIGHT)
    assert job_id == "691639439c388539cbdf8d1d"
