from fastapi import APIRouter, Request, HTTPException, Query
from typing import List, Optional

from src.models.company import CompanyCreate

router = APIRouter()

@router.get("/companies")
async def list_companies(
    request: Request,
    ats: Optional[str] = Query(None),
    active_only: bool = Query(True)
):
    db = request.app.state.db
    companies = await db.list_companies(ats=ats, active_only=active_only)
    return {"total": len(companies), "items": companies}

@router.post("/companies")
async def create_company(company: CompanyCreate, request: Request):
    db = request.app.state.db
    result = await db.create_company(company)
    return result
