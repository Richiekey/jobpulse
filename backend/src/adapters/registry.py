from typing import Dict, Type
from src.adapters.base import BaseAdapter
from src.adapters.greenhouse import GreenhouseAdapter
from src.adapters.ashby import AshbyAdapter
from src.adapters.lever import LeverAdapter
from src.adapters.workday import WorkdayAdapter
from src.adapters.workable import WorkableAdapter
from src.adapters.applytojob import ApplyToJobAdapter
from src.adapters.jobvite import JobviteAdapter
from src.adapters.icims import ICIMSAdapter
from src.adapters.jobright import JobrightAdapter
from src.adapters.smartrecruiters import SmartRecruitersAdapter
from src.adapters.rippling import RipplingAdapter
from src.adapters.recruiterflow import RecruiterflowAdapter
from src.adapters.gusto_ats import GustoATSAdapter
from src.adapters.manatal import ManatalAdapter
from src.adapters.recruitee import RecruiteeAdapter
from src.adapters.breezy import BreezyAdapter
from src.adapters.bamboohr import BambooHRAdapter
from src.adapters.cats_ats import CATSAdapter
from src.adapters.jobdiva_adapter import JobDivaAdapter
from src.adapters.bullhorn import BullhornAdapter
from src.adapters.oracle_cloud import OracleCloudAdapter
from src.adapters.taleo import TaleoAdapter
from src.adapters.adp_ats import ADPAdapter
from src.adapters.personio import PersonioAdapter
from src.adapters.kula_ats import KulaAdapter
from src.adapters.gem_ats import GemAdapter
from src.adapters.teamtailor import TeamtailorAdapter
from src.adapters.pinpoint_ats import PinpointAdapter
from src.models.enums import ATSPlatform
from src.utils.http_client import ThrottledClient

ADAPTER_MAP: Dict[ATSPlatform, Type[BaseAdapter]] = {
    ATSPlatform.GREENHOUSE: GreenhouseAdapter,
    ATSPlatform.ASHBY: AshbyAdapter,
    ATSPlatform.LEVER: LeverAdapter,
    ATSPlatform.WORKDAY: WorkdayAdapter,
    ATSPlatform.WORKABLE: WorkableAdapter,
    ATSPlatform.APPLYTOJOB: ApplyToJobAdapter,
    ATSPlatform.JOBVITE: JobviteAdapter,
    ATSPlatform.ICIMS: ICIMSAdapter,
    ATSPlatform.JOBRIGHT: JobrightAdapter,
    ATSPlatform.SMARTRECRUITERS: SmartRecruitersAdapter,
    ATSPlatform.RIPPLING: RipplingAdapter,
    ATSPlatform.RECRUITERFLOW: RecruiterflowAdapter,
    ATSPlatform.GUSTO_ATS: GustoATSAdapter,
    ATSPlatform.MANATAL: ManatalAdapter,
    ATSPlatform.RECRUITEE: RecruiteeAdapter,
    ATSPlatform.BREEZY: BreezyAdapter,
    ATSPlatform.BAMBOOHR: BambooHRAdapter,
    ATSPlatform.CATS: CATSAdapter,
    ATSPlatform.JOBDIVA: JobDivaAdapter,
    ATSPlatform.BULLHORN: BullhornAdapter,
    ATSPlatform.ORACLE_CLOUD: OracleCloudAdapter,
    ATSPlatform.TALEO: TaleoAdapter,
    ATSPlatform.ADP: ADPAdapter,
    ATSPlatform.PERSONIO: PersonioAdapter,
    ATSPlatform.KULA: KulaAdapter,
    ATSPlatform.GEM: GemAdapter,
    ATSPlatform.TEAMTAILOR: TeamtailorAdapter,
    ATSPlatform.PINPOINT: PinpointAdapter,
}

def get_adapter(platform: ATSPlatform, http_client: ThrottledClient = None) -> BaseAdapter:
    cls = ADAPTER_MAP.get(platform)
    if not cls:
        raise ValueError(f"No adapter registered for platform: {platform}")
    return cls(http_client=http_client)
