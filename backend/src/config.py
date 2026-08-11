from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional
import os

class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str
    database_url: Optional[str] = None  # Direct Postgres connection string
    
    # Scraper settings
    scrape_interval_hours: int = 6
    rate_limit_per_second: float = 2.0
    request_timeout_seconds: int = 30
    max_retries: int = 3
    
    # API settings
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: List[str] = ["http://localhost:3000"]
    
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
