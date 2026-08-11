from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from src.config import settings
from src.database import Database
from src.utils.logger import logger
from src.api import jobs, companies, health, scraper, export, detect

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect via Supabase REST API
    if settings.supabase_url and settings.supabase_key:
        logger.info("connecting_to_database_via_rest_api")
        app.state.db = await Database.connect(settings.supabase_url, settings.supabase_key)
    else:
        logger.warning("supabase_not_configured_using_mock")
        app.state.db = Database()
    
    yield
    
    # Shutdown: Disconnect
    if app.state.db and app.state.db.connected:
        logger.info("disconnecting_from_database")
        await app.state.db.disconnect()

app = FastAPI(
    title="Job Aggregation Engine API",
    description="Multi-ATS Scraper & Job Aggregation Engine API",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(jobs.router, prefix="/api", tags=["Jobs"])
app.include_router(companies.router, prefix="/api", tags=["Companies"])
app.include_router(scraper.router, prefix="/api", tags=["Scraper"])
app.include_router(export.router, prefix="/api", tags=["Export"])
app.include_router(detect.router, prefix="/api", tags=["Detection"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host=settings.api_host, port=settings.api_port, reload=True)
