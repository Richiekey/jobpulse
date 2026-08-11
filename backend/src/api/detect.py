from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.core.detector import detect_ats, extract_job_id_from_url
from src.models.enums import ATSPlatform

router = APIRouter()

class DetectRequest(BaseModel):
    url: str

class DetectResponse(BaseModel):
    url: str
    ats: ATSPlatform
    identifier: str | None = None
    job_id: str | None = None
    supported: bool

@router.post("/detect-ats", response_model=DetectResponse)
async def detect_ats_endpoint(payload: DetectRequest):
    url = payload.url
    platform, identifier = detect_ats(url)
    job_id = extract_job_id_from_url(url, platform)
    
    return DetectResponse(
        url=url,
        ats=platform,
        identifier=identifier,
        job_id=job_id,
        supported=platform != ATSPlatform.UNKNOWN
    )
