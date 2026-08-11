from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID
from src.models.enums import ATSPlatform

class CompanyCreate(BaseModel):
    name: str
    website: Optional[str] = None
    career_url: Optional[str] = None
    ats: ATSPlatform = ATSPlatform.UNKNOWN
    ats_identifier: str  # board token or slug
    country: Optional[str] = None
    active: bool = True

class Company(CompanyCreate):
    id: UUID
    last_checked: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
