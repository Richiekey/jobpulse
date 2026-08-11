from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID
from src.models.enums import ATSPlatform

class SourceRun(BaseModel):
    id: UUID
    source: ATSPlatform
    company_id: Optional[UUID] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    status: str  # RUNNING, SUCCESS, FAILED
    jobs_found: int = 0
    jobs_inserted: int = 0
    jobs_updated: int = 0
    jobs_skipped: int = 0
    jobs_failed: int = 0
    error_message: Optional[str] = None
    created_at: datetime

class SourceHealth(BaseModel):
    source: ATSPlatform
    last_run: Optional[datetime] = None
    last_successful_run: Optional[datetime] = None
    status: str = "UNKNOWN"  # Healthy, Warning, Error, Unknown
    jobs_found_total: int = 0
    jobs_inserted_total: int = 0
    total_active_jobs: int = 0
    error_message: Optional[str] = None
