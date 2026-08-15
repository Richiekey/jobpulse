import asyncio
import asyncpg
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.config import settings

MIGRATION_SQL = """
ALTER TYPE ats_platform ADD VALUE IF NOT EXISTS 'WORKABLE';
ALTER TYPE ats_platform ADD VALUE IF NOT EXISTS 'APPLYTOJOB';
ALTER TYPE ats_platform ADD VALUE IF NOT EXISTS 'JOBVITE';
ALTER TYPE ats_platform ADD VALUE IF NOT EXISTS 'ICIMS';
ALTER TYPE ats_platform ADD VALUE IF NOT EXISTS 'JOBRIGHT';
"""


async def run_migration():
    if not settings.database_url:
        print("DATABASE_URL is not set!")
        return

    print("Connecting to PostgreSQL database directly...")
    conn = await asyncpg.connect(settings.database_url)
    try:
        for stmt in MIGRATION_SQL.strip().split(";"):
            stmt = stmt.strip()
            if stmt:
                print(f"Executing: {stmt}")
                await conn.execute(stmt)
        print("Migration applied successfully!")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run_migration())
