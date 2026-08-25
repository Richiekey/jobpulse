from pydantic import BaseModel, Field, HttpUrl, field_validator, model_validator
from typing import Optional, List, Any, Dict
from datetime import datetime, timezone
import hashlib
from uuid import UUID

from src.models.enums import EmploymentType, RemoteType, JobStatus, ATSPlatform

class LocationDetail(BaseModel):
    city: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None

class NormalizedJob(BaseModel):
    source: ATSPlatform
    source_job_id: str
    source_company_id: Optional[str] = None
    title: str
    company_name: str
    company_url: Optional[str] = None
    location: Optional[str] = None
    locations: List[LocationDetail] = Field(default_factory=list)
    country: Optional[str] = None
    city: Optional[str] = None
    remote_type: RemoteType = RemoteType.UNKNOWN
    employment_type: Optional[EmploymentType] = None
    department: Optional[str] = None
    team: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    responsibilities: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: Optional[str] = None
    salary_period: Optional[str] = None  # YEARLY, MONTHLY, HOURLY
    job_url: Optional[str] = None
    apply_url: Optional[str] = None
    apply_url_original: Optional[str] = None
    is_staffing_agency: bool = False
    posted_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    scraped_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: JobStatus = JobStatus.ACTIVE
    content_hash: Optional[str] = None
    deduplication_key: Optional[str] = None

    @field_validator("salary_max")
    @classmethod
    def validate_salary_range(cls, v: Optional[float], info) -> Optional[float]:
        salary_min = info.data.get("salary_min")
        if v is not None and salary_min is not None and v < salary_min:
            # If max < min, swap them or set max = min
            return salary_min
        return v

    @model_validator(mode="after")
    def compute_hashes(self) -> "NormalizedJob":
        # Compute content hash (SHA-256 of description)
        if self.description and not self.content_hash:
            self.content_hash = hashlib.sha256(self.description.encode("utf-8")).hexdigest()

        # Compute deduplication key: company_lower + title_norm + primary_location
        if not self.deduplication_key:
            comp = (self.company_name or "").strip().lower()
            norm_title = (self.title or "").strip().lower()
            loc = (self.location or "").strip().lower()
            raw_key = f"{comp}|{norm_title}|{loc}"
            self.deduplication_key = hashlib.md5(raw_key.encode("utf-8")).hexdigest()

        return self

class JobResponse(NormalizedJob):
    id: UUID
    created_at: datetime

class JobSearchParams(BaseModel):
    q: Optional[str] = None
    location: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    remote_type: Optional[RemoteType] = None
    employment_type: Optional[EmploymentType] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    company: Optional[str] = None
    source: Optional[ATSPlatform] = None
    department: Optional[str] = None
    skills: Optional[str] = None  # comma-separated skills filter
    role_category: Optional[str] = None  # e.g. "Software Engineer", "Data Analyst"
    status: JobStatus = JobStatus.ACTIVE
    sort_by: str = "newest"  # newest, oldest, salary
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=20, ge=1, le=100)
