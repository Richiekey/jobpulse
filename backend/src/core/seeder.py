import asyncio
import json
import os
from typing import Optional

from src.config import settings
from src.database import Database
from src.models.company import CompanyCreate
from src.models.enums import ATSPlatform
from src.utils.logger import logger

async def seed_companies(db: Optional[Database] = None, seeds_path: Optional[str] = None):
    should_close = False
    if db is None:
        if not settings.database_url:
            logger.error("database_url_missing")
            return
        db = await Database.connect(settings.database_url)
        should_close = True

    if not seeds_path:
        seeds_path = os.path.join(os.path.dirname(__file__), "../../seeds/companies.json")

    with open(seeds_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    total = 0
    for platform_str, companies in data.items():
        platform_enum = ATSPlatform(platform_str.upper())
        for comp in companies:
            c = CompanyCreate(
                name=comp["name"],
                website=comp.get("website"),
                career_url=comp.get("career_url"),
                ats=platform_enum,
                ats_identifier=comp["ats_identifier"],
                active=True,
            )
            await db.create_company(c)
            total += 1

    logger.info("companies_seeded_successfully", total_seeded=total)

    if should_close:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(seed_companies())
