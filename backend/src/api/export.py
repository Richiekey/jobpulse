from fastapi import APIRouter, Request, Depends, Response
from fastapi.responses import PlainTextResponse

from src.models.job import JobSearchParams
from src.core.exporter import export_csv, export_json

router = APIRouter()

@router.get("/export/csv")
async def download_csv(request: Request, params: JobSearchParams = Depends()):
    db = request.app.state.db
    # Force max limit for export
    params.per_page = 1000
    jobs, _ = await db.search_jobs(params)
    csv_data = export_csv(jobs)
    
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="jobs_export.csv"'}
    )

@router.get("/export/json")
async def download_json(request: Request, params: JobSearchParams = Depends()):
    db = request.app.state.db
    params.per_page = 1000
    jobs, _ = await db.search_jobs(params)
    json_data = export_json(jobs)
    
    return Response(
        content=json_data,
        media_type="application/json",
        headers={"Content-Disposition": 'attachment; filename="jobs_export.json"'}
    )
