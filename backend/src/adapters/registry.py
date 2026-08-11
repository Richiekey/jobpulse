from typing import Dict, Type
from src.adapters.base import BaseAdapter
from src.adapters.greenhouse import GreenhouseAdapter
from src.adapters.ashby import AshbyAdapter
from src.adapters.lever import LeverAdapter
from src.adapters.workday import WorkdayAdapter
from src.models.enums import ATSPlatform
from src.utils.http_client import ThrottledClient

ADAPTER_MAP: Dict[ATSPlatform, Type[BaseAdapter]] = {
    ATSPlatform.GREENHOUSE: GreenhouseAdapter,
    ATSPlatform.ASHBY: AshbyAdapter,
    ATSPlatform.LEVER: LeverAdapter,
    ATSPlatform.WORKDAY: WorkdayAdapter,
}

def get_adapter(platform: ATSPlatform, http_client: ThrottledClient = None) -> BaseAdapter:
    cls = ADAPTER_MAP.get(platform)
    if not cls:
        raise ValueError(f"No adapter registered for platform: {platform}")
    return cls(http_client=http_client)
