from fastapi import APIRouter, Request, BackgroundTasks, HTTPException
import asyncio

from src.core.scheduler import run_scrape

router = APIRouter()

is_scraping_active = False

async def background_scrape_task(db):
    global is_scraping_active
    is_scraping_active = True
    try:
        await run_scrape(db=db)
    finally:
        is_scraping_active = False

@router.post("/scrape/trigger")
async def trigger_scrape(background_tasks: BackgroundTasks, request: Request):
    global is_scraping_active
    if is_scraping_active:
        raise HTTPException(status_code=409, detail="A scrape run is already in progress")

    db = request.app.state.db
    background_tasks.add_task(background_scrape_task, db)
    return {"message": "Scrape task triggered in background", "status": "started"}

@router.get("/scrape/status")
async def scrape_status():
    global is_scraping_active
    return {"is_active": is_scraping_active}
