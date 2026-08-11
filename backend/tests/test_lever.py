from src.adapters.lever import LeverAdapter
from src.models.enums import ATSPlatform, EmploymentType

def test_lever_normalization(lever_fixture):
    adapter = LeverAdapter()
    raw_job = lever_fixture[0]
    job = adapter.normalize(raw_job, company_name="Netflix", company_identifier="netflix")

    assert job.source == ATSPlatform.LEVER
    assert job.source_job_id == "lever-7777"
    assert job.company_name == "Netflix"
    assert job.title == "Data Scientist, Personalization"
    assert job.employment_type == EmploymentType.FULL_TIME
    assert job.salary_min == 200000.0
    assert job.salary_max == 350000.0
    assert job.department == "Data Science & Engineering"
