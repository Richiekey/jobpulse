from src.adapters.greenhouse import GreenhouseAdapter
from src.models.enums import ATSPlatform, RemoteType, EmploymentType

def test_greenhouse_normalization(greenhouse_fixture):
    adapter = GreenhouseAdapter()
    raw_job = greenhouse_fixture["jobs"][0]
    job = adapter.normalize(raw_job, company_name="Stripe", company_identifier="stripe")

    assert job.source == ATSPlatform.GREENHOUSE
    assert job.source_job_id == "1234567"
    assert job.company_name == "Stripe"
    assert job.title == "Software Engineer, Infrastructure"
    assert job.remote_type == RemoteType.REMOTE
    assert job.employment_type == EmploymentType.FULL_TIME
    assert job.salary_min == 150000.0
    assert job.salary_max == 220000.0
    assert job.department == "Engineering"
