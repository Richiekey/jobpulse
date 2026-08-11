from src.adapters.ashby import AshbyAdapter
from src.models.enums import ATSPlatform, RemoteType, EmploymentType

def test_ashby_normalization(ashby_fixture):
    adapter = AshbyAdapter()
    raw_job = ashby_fixture["jobs"][0]
    job = adapter.normalize(raw_job, company_name="Linear", company_identifier="linear")

    assert job.source == ATSPlatform.ASHBY
    assert job.source_job_id == "ashby-9999"
    assert job.company_name == "Linear"
    assert job.title == "Senior Frontend Engineer"
    assert job.remote_type == RemoteType.REMOTE
    assert job.employment_type == EmploymentType.FULL_TIME
    assert job.salary_min == 160000.0
    assert job.salary_max == 210000.0
    assert job.department == "Product Engineering"
