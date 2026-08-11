from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

from src.models.enums import ATSPlatform
from src.models.job import NormalizedJob
from src.utils.http_client import ThrottledClient
from src.utils.logger import logger

class BaseAdapter(ABC):
    platform: ATSPlatform

    def __init__(self, http_client: Optional[ThrottledClient] = None):
        self.client = http_client or ThrottledClient()

    @abstractmethod
    async def fetch_jobs(self, company_identifier: str) -> List[Dict[str, Any]]:
        """Fetch raw job postings for a company from the ATS public API."""
        pass

    @abstractmethod
    async def fetch_job_details(self, company_identifier: str, job_id: str) -> Optional[Dict[str, Any]]:
        """Fetch details for a single job posting if needed."""
        pass

    @abstractmethod
    def normalize(self, raw_job: Dict[str, Any], company_name: str, company_identifier: str) -> NormalizedJob:
        """Transform raw ATS job dictionary into canonical NormalizedJob."""
        pass

    async def discover_and_normalize(self, company_name: str, company_identifier: str) -> List[NormalizedJob]:
        """Fetch and normalize all jobs for a company, swallowing individual job errors gracefully."""
        raw_jobs = await self.fetch_jobs(company_identifier)
        normalized_list = []
        for raw in raw_jobs:
            try:
                job = self.normalize(raw, company_name, company_identifier)
                normalized_list.append(job)
            except Exception as e:
                logger.error(
                    "job_normalization_failed",
                    platform=self.platform.value,
                    company=company_name,
                    job_id=raw.get("id") or raw.get("source_job_id"),
                    error=str(e)
                )
        return normalized_list
