import asyncio
from src.adapters.greenhouse import GreenhouseAdapter
from src.adapters.ashby import AshbyAdapter
from src.adapters.lever import LeverAdapter
from src.utils.http_client import ThrottledClient

async def test_live_sources():
    client = ThrottledClient()
    try:
        # 1. Greenhouse
        gh = GreenhouseAdapter(client)
        gh_jobs = await gh.discover_and_normalize("Stripe", "stripe")
        print(f"[OK] Greenhouse (Stripe): Discovered and normalized {len(gh_jobs)} jobs")
        if gh_jobs:
            j = gh_jobs[0]
            print(f"   Sample: [{j.source.value}] {j.title} | {j.location} | {j.employment_type} | {j.remote_type}")

        # 2. Ashby
        ashby = AshbyAdapter(client)
        ashby_jobs = await ashby.discover_and_normalize("Linear", "linear")
        print(f"[OK] Ashby (Linear): Discovered and normalized {len(ashby_jobs)} jobs")
        if ashby_jobs:
            j = ashby_jobs[0]
            print(f"   Sample: [{j.source.value}] {j.title} | {j.location} | {j.employment_type} | {j.remote_type}")

        # 3. Lever
        lever = LeverAdapter(client)
        lever_jobs = await lever.discover_and_normalize("Lyft", "lyft")
        print(f"[OK] Lever (Lyft): Discovered and normalized {len(lever_jobs)} jobs")
        if lever_jobs:
            j = lever_jobs[0]
            print(f"   Sample: [{j.source.value}] {j.title} | {j.location} | {j.employment_type} | {j.remote_type}")

    finally:
        await client.close()

if __name__ == "__main__":
    asyncio.run(test_live_sources())
