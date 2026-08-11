from src.core.detector import detect_ats, extract_job_id_from_url
from src.models.enums import ATSPlatform

def test_detect_ats():
    ats, id1 = detect_ats("https://boards.greenhouse.io/stripe/jobs/123456")
    assert ats == ATSPlatform.GREENHOUSE
    assert id1 == "stripe"

    ats2, id2 = detect_ats("https://jobs.ashbyhq.com/openai/abc-123")
    assert ats2 == ATSPlatform.ASHBY
    assert id2 == "openai"

    ats3, id3 = detect_ats("https://jobs.lever.co/netflix/lever-7777")
    assert ats3 == ATSPlatform.LEVER
    assert id3 == "netflix"

    ats4, _ = detect_ats("https://example.com/careers")
    assert ats4 == ATSPlatform.UNKNOWN

def test_extract_job_id():
    jid1 = extract_job_id_from_url("https://boards.greenhouse.io/stripe/jobs/123456", ATSPlatform.GREENHOUSE)
    assert jid1 == "123456"

    jid2 = extract_job_id_from_url("https://jobs.ashbyhq.com/openai/abc-123", ATSPlatform.ASHBY)
    assert jid2 == "abc-123"

    jid3 = extract_job_id_from_url("https://jobs.lever.co/netflix/lever-7777", ATSPlatform.LEVER)
    assert jid3 == "lever-7777"
