from fastapi import APIRouter, Request

router = APIRouter()

@router.get("/health")
async def health_check(request: Request):
    db_connected = request.app.state.db.pool is not None
    return {
        "status": "healthy" if db_connected else "degraded",
        "database": "connected" if db_connected else "disconnected"
    }

@router.get("/sources/health")
async def source_health(request: Request):
    db = request.app.state.db
    health_data = await db.get_source_health()
    return {"sources": health_data}

@router.post("/cleanup")
async def cleanup_old_jobs(request: Request, max_age_days: int = 30):
    """Delete jobs older than max_age_days (default 30)."""
    db = request.app.state.db
    deleted = await db.cleanup_old_jobs(max_age_days)
    return {"deleted": deleted, "max_age_days": max_age_days}

