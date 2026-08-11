from enum import Enum
from typing import Optional, Dict, Any

from src.models.job import NormalizedJob
from src.database import Database

class DeduplicationResult(str, Enum):
    NEW = "inserted"
    UPDATED = "updated"
    DUPLICATE = "skipped"

class Deduplicator:
    def __init__(self, db: Database):
        self.db = db

    async def check(self, job: NormalizedJob) -> DeduplicationResult:
        # Layer 1: Check canonical apply_url if present
        if job.apply_url:
            existing = await self.db.get_job_by_apply_url(job.apply_url)
            if existing and existing["source"] != job.source.value:
                # Job exists from another source!
                return DeduplicationResult.DUPLICATE

        # Layer 2: Check deduplication_key
        if job.deduplication_key:
            existing = await self.db.get_job_by_dedup_key(job.deduplication_key)
            if existing and existing["source"] != job.source.value:
                return DeduplicationResult.DUPLICATE

        return DeduplicationResult.NEW
