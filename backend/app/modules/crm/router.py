from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_workspace_id
from app.modules.crm import service
from app.modules.crm.schemas import (
    ActivityCreate,
    ActivityRead,
    LeadConvert,
    LeadCreate,
    LeadRead,
    LeadUpdate,
    OpportunityCreate,
    OpportunityRead,
    OpportunityStageChange,
    OpportunityUpdate,
    PipelineSummary,
)
from app.modules.identity.models import User

router = APIRouter(prefix="/crm", tags=["CRM"])


# ── Leads ────────────────────────────────────────────────────────────────────

@router.post("/leads", response_model=LeadRead, status_code=201)
async def create_lead(
    data: LeadCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.create_lead(db, workspace_id, current_user.id, data)


@router.get("/leads", response_model=list[LeadRead])
async def list_leads(
    status: str | None = Query(default=None),
    source: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.list_leads(db, workspace_id, status, source, limit, offset)


@router.get("/leads/{lead_id}", response_model=LeadRead)
async def get_lead(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.get_lead(db, workspace_id, lead_id)


@router.patch("/leads/{lead_id}", response_model=LeadRead)
async def update_lead(
    lead_id: str,
    data: LeadUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.update_lead(db, workspace_id, lead_id, data)


@router.post("/leads/{lead_id}/convert", response_model=OpportunityRead, status_code=201)
async def convert_lead(
    lead_id: str,
    data: LeadConvert,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.convert_lead(db, workspace_id, current_user.id, lead_id, data)


# ── Opportunities ─────────────────────────────────────────────────────────────

@router.post("/opportunities", response_model=OpportunityRead, status_code=201)
async def create_opportunity(
    data: OpportunityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.create_opportunity(db, workspace_id, current_user.id, data)


@router.get("/opportunities", response_model=list[OpportunityRead])
async def list_opportunities(
    stage: str | None = Query(default=None),
    owner_id: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.list_opportunities(db, workspace_id, stage, owner_id, limit, offset)


@router.get("/pipeline/summary", response_model=PipelineSummary)
async def get_pipeline_summary(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.get_pipeline_summary(db, workspace_id)


@router.get("/opportunities/{opp_id}", response_model=OpportunityRead)
async def get_opportunity(
    opp_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.get_opportunity(db, workspace_id, opp_id)


@router.patch("/opportunities/{opp_id}", response_model=OpportunityRead)
async def update_opportunity(
    opp_id: str,
    data: OpportunityUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.update_opportunity(db, workspace_id, current_user.id, opp_id, data)


@router.patch("/opportunities/{opp_id}/stage", response_model=OpportunityRead)
async def change_stage(
    opp_id: str,
    data: OpportunityStageChange,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.change_stage(db, workspace_id, current_user.id, opp_id, data)


# ── Activities ────────────────────────────────────────────────────────────────

@router.post("/activities", response_model=ActivityRead, status_code=201)
async def create_activity(
    data: ActivityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.create_activity(db, workspace_id, current_user.id, data)


@router.get("/activities", response_model=list[ActivityRead])
async def list_activities(
    entity_type: str | None = Query(default=None),
    entity_id: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.list_activities(db, workspace_id, entity_type, entity_id, limit, offset)


@router.patch("/activities/{activity_id}/complete", response_model=ActivityRead)
async def complete_activity(
    activity_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.complete_activity(db, workspace_id, activity_id)
