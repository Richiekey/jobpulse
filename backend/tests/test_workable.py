from src.adapters.workable import WorkableAdapter
from src.models.enums import ATSPlatform, RemoteType

def test_workable_normalization():
    adapter = WorkableAdapter()
    raw_job = {
        "shortcode": "WKB123",
        "title": "Senior Frontend Developer",
        "department": "Engineering",
        "telecommuting": True,
        "employment_type": "Full-time",
        "location": {
            "city": "San Francisco",
            "region": "CA",
            "country": "United States"
        },
        "description": "<p>We are hiring a Senior Frontend Developer with salary range $120,000 - $160,000 per year.</p>",
        "url": "https://apply.workable.com/testcompany/j/WKB123/"
    }

    job = adapter.normalize(raw_job, company_name="Test Company", company_identifier="testcompany")

    assert job.source == ATSPlatform.WORKABLE
    assert job.source_job_id == "WKB123"
    assert job.company_name == "Test Company"
    assert job.title == "Senior Frontend Developer"
    assert job.remote_type == RemoteType.REMOTE
    assert job.job_url == "https://apply.workable.com/testcompany/j/WKB123/"
