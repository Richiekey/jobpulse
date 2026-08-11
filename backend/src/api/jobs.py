from fastapi import APIRouter, HTTPException, Depends, Query, Request
from pydantic import BaseModel, HttpUrl
from typing import List, Dict, Any, Optional
from uuid import UUID

from src.models.job import JobSearchParams, NormalizedJob
from src.models.enums import ATSPlatform
from src.core.detector import detect_ats, extract_job_id_from_url
from src.core.deduplicator import Deduplicator
from src.adapters.registry import get_adapter
from src.utils.http_client import ThrottledClient
from src.utils.logger import logger

router = APIRouter()

class BulkImportRequest(BaseModel):
    urls: List[str]

class BulkImportResultItem(BaseModel):
    url: str
    status: str  # SUCCESS, FAILED, DUPLICATE, UNSUPPORTED
    job_id: Optional[str] = None
    detected_ats: ATSPlatform = ATSPlatform.UNKNOWN
    error_message: Optional[str] = None

class BulkImportResponse(BaseModel):
    batch_id: str
    total: int
    successful: int
    failed: int
    duplicates: int
    results: List[BulkImportResultItem]

@router.get("/jobs")
async def list_jobs(request: Request, params: JobSearchParams = Depends()):
    db = request.app.state.db
    jobs, total = await db.search_jobs(params)
    return {
        "total": total,
        "page": params.page,
        "per_page": params.per_page,
        "total_pages": (total + params.per_page - 1) // params.per_page if total > 0 else 0,
        "items": jobs
    }

@router.get("/jobs/{job_id}")
async def get_job(job_id: UUID, request: Request):
    db = request.app.state.db
    job = await db.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")
    return job

@router.post("/jobs/import", response_model=BulkImportResponse)
async def bulk_import_jobs(payload: BulkImportRequest, request: Request):
    db = request.app.state.db
    urls = payload.urls
    batch_id = await db.create_import_batch(len(urls))
    
    http_client = ThrottledClient()
    deduplicator = Deduplicator(db)

    results: List[BulkImportResultItem] = []
    stats = {"successful": 0, "failed": 0, "duplicates": 0}

    try:
        for url in urls:
            platform, identifier = detect_ats(url)
            item = BulkImportResultItem(url=url, detected_ats=platform, status="FAILED")

            if platform == ATSPlatform.UNKNOWN or not identifier:
                item.status = "UNSUPPORTED"
                item.error_message = "Could not detect supported ATS platform from URL"
                stats["failed"] += 1
                results.append(item)
                await db.add_import_result(batch_id, item.model_dump())
                continue

            try:
                adapter = get_adapter(platform, http_client=http_client)
                job_id = extract_job_id_from_url(url, platform)
                
                raw_job = None
                if job_id:
                    raw_job = await adapter.fetch_job_details(identifier, job_id)
                
                # Fallback: if single job fetch wasn't possible or yielded nothing, fetch board
                if not raw_job:
                    all_jobs = await adapter.fetch_jobs(identifier)
                    if job_id:
                        for j in all_jobs:
                            if str(j.get("id")) == str(job_id):
                                raw_job = j
                                break
                    elif all_jobs:
                        raw_job = all_jobs[0]  # first job on board

                if not raw_job:
                    item.status = "FAILED"
                    item.error_message = "Job posting details could not be retrieved"
                    stats["failed"] += 1
                    results.append(item)
                    await db.add_import_result(batch_id, item.model_dump())
                    continue

                normalized_job = adapter.normalize(raw_job, company_name=identifier.capitalize(), company_identifier=identifier)
                dedup_res = await deduplicator.check(normalized_job)

                if dedup_res == "skipped":
                    item.status = "DUPLICATE"
                    stats["duplicates"] += 1
                else:
                    db_res = await db.upsert_job(normalized_job)
                    if db_res == "skipped":
                        item.status = "DUPLICATE"
                        stats["duplicates"] += 1
                    else:
                        item.status = "SUCCESS"
                        item.job_id = normalized_job.source_job_id
                        stats["successful"] += 1

            except Exception as e:
                item.status = "FAILED"
                item.error_message = str(e)
                stats["failed"] += 1

            results.append(item)
            await db.add_import_result(batch_id, item.model_dump())

        await db.complete_import_batch(batch_id, stats)

    finally:
        await http_client.close()

    return BulkImportResponse(
        batch_id=str(batch_id),
        total=len(urls),
        successful=stats["successful"],
        failed=stats["failed"],
        duplicates=stats["duplicates"],
        results=results
    )
