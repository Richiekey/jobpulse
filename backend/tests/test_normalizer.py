from src.core.normalizer import (
    normalize_employment_type,
    normalize_remote_type,
    parse_location,
    parse_salary,
    compute_deduplication_key,
    compute_content_hash
)
from src.models.enums import EmploymentType, RemoteType

def test_normalize_employment_type():
    assert normalize_employment_type("Full-time") == EmploymentType.FULL_TIME
    assert normalize_employment_type("Permanent Full Time") == EmploymentType.FULL_TIME
    assert normalize_employment_type("Part time") == EmploymentType.PART_TIME
    assert normalize_employment_type("Contractor") == EmploymentType.CONTRACT
    assert normalize_employment_type("Internship") == EmploymentType.INTERNSHIP
    assert normalize_employment_type("Unknown string") is None

def test_normalize_remote_type():
    assert normalize_remote_type("Remote - US") == RemoteType.REMOTE
    assert normalize_remote_type("Hybrid, San Francisco") == RemoteType.HYBRID
    assert normalize_remote_type("Onsite in NYC") == RemoteType.ONSITE
    assert normalize_remote_type("Somewhere") == RemoteType.UNKNOWN

def test_parse_location():
    loc1 = parse_location("San Francisco, CA, USA")
    assert loc1["city"] == "San Francisco"
    assert loc1["country"] == "USA"

    loc2 = parse_location("Remote", workplace_hint="Remote")
    assert loc2["remote_type"] == RemoteType.REMOTE

def test_parse_salary():
    sal1 = parse_salary("Salary range: $120,000 - $180,000 per year")
    assert sal1["min"] == 120000.0
    assert sal1["max"] == 180000.0
    assert sal1["currency"] == "$"
    assert sal1["period"] == "YEARLY"

    sal2 = parse_salary("Compensation: $150k - $220k")
    assert sal2["min"] == 150000.0
    assert sal2["max"] == 220000.0

def test_compute_hashes():
    key = compute_deduplication_key("Stripe", "Software Engineer", "San Francisco, CA")
    assert isinstance(key, str) and len(key) == 32

    content_h = compute_content_hash("<p>Description</p>")
    assert isinstance(content_h, str) and len(content_h) == 64
