import httpx
import asyncio
import time
from typing import Optional, Dict, Any

from src.utils.logger import logger

class RateLimiter:
    def __init__(self, rate_limit_per_second: float = 2.0):
        self.delay = 1.0 / rate_limit_per_second if rate_limit_per_second > 0 else 0
        self.last_call = 0.0
        self._lock = asyncio.Lock()

    async def acquire(self):
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self.last_call
            if elapsed < self.delay:
                await asyncio.sleep(self.delay - elapsed)
            self.last_call = time.monotonic()

class ThrottledClient:
    def __init__(
        self,
        rate_limit_per_second: float = 2.0,
        timeout: int = 30,
        max_retries: int = 3,
        user_agent: str = "JobScraper/0.1 (+https://github.com/job-link-scraper)"
    ):
        self.limiter = RateLimiter(rate_limit_per_second)
        self.timeout = timeout
        self.max_retries = max_retries
        self.headers = {"User-Agent": user_agent, "Accept": "application/json"}
        self._client: Optional[httpx.AsyncClient] = None

    async def get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(self.timeout),
                headers=self.headers,
                follow_redirects=True,
            )
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def get(self, url: str, params: Optional[Dict[str, Any]] = None, **kwargs) -> httpx.Response:
        await self.limiter.acquire()
        client = await self.get_client()

        for attempt in range(1, self.max_retries + 1):
            try:
                start_time = time.monotonic()
                response = await client.get(url, params=params, **kwargs)
                duration = time.monotonic() - start_time
                
                logger.info(
                    "http_request",
                    url=str(response.url),
                    status_code=response.status_code,
                    duration_ms=round(duration * 1000, 2),
                    attempt=attempt,
                )
                
                # 404 is not an error to retry — return immediately
                if response.status_code == 404:
                    return response

                # Retry transient server errors or rate limits
                if response.status_code in (429, 500, 502, 503, 504) and attempt < self.max_retries:
                    wait_time = 2 ** attempt
                    logger.warning("http_retry", url=url, status_code=response.status_code, wait_s=wait_time)
                    await asyncio.sleep(wait_time)
                    continue

                response.raise_for_status()
                return response

            except httpx.HTTPStatusError as e:
                # Do not retry client 4xx errors
                if e.response.status_code < 500 and e.response.status_code != 429:
                    raise
                if attempt == self.max_retries:
                    logger.error("http_request_failed", url=url, error=str(e), attempts=attempt)
                    raise
                wait_time = 2 ** attempt
                logger.warning("http_retry_error", url=url, error=str(e), wait_s=wait_time)
                await asyncio.sleep(wait_time)

            except httpx.RequestError as e:
                if attempt == self.max_retries:
                    logger.error("http_request_failed", url=url, error=str(e), attempts=attempt)
                    raise
                wait_time = 2 ** attempt
                logger.warning("http_retry_error", url=url, error=str(e), wait_s=wait_time)
                await asyncio.sleep(wait_time)

    async def post(self, url: str, json: Optional[Dict[str, Any]] = None, headers: Optional[Dict[str, str]] = None, **kwargs) -> httpx.Response:
        await self.limiter.acquire()
        client = await self.get_client()

        merged_headers = {**self.headers, **(headers or {})}

        for attempt in range(1, self.max_retries + 1):
            try:
                start_time = time.monotonic()
                response = await client.post(url, json=json, headers=merged_headers, **kwargs)
                duration = time.monotonic() - start_time

                logger.info(
                    "http_post_request",
                    url=str(response.url),
                    status_code=response.status_code,
                    duration_ms=round(duration * 1000, 2),
                    attempt=attempt,
                )

                if response.status_code in (429, 500, 502, 503, 504) and attempt < self.max_retries:
                    wait_time = 2 ** attempt
                    await asyncio.sleep(wait_time)
                    continue

                return response

            except httpx.RequestError as e:
                if attempt == self.max_retries:
                    logger.error("http_post_failed", url=url, error=str(e), attempts=attempt)
                    raise
                wait_time = 2 ** attempt
                await asyncio.sleep(wait_time)

        # Should never reach here, but just in case
        raise httpx.RequestError(f"POST {url} failed after {self.max_retries} retries")
