from datetime import datetime, timezone
from typing import Sequence

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.events.bus import publish as publish_event
from app.events.types import (
    LEAD_CAPTURED,
    LEAD_CONVERTED_TO_OPPORTUNITY,
    OPPORTUNITY_CREATED,
    OPPORTUNITY_LOST,
    OPPORTUNITY_STAGE_CHANGED,
    OPPORTUNITY_UPDATED,
    OPPORTUNITY_WON,
    Event,
)
from app.core.validators import validate_workspace_ownership
from app.modules.crm.models import Activity, Lead, Opportunity
from app.modules.crm.schemas import (
    ActivityCreate,
    LeadConvert,
    LeadCreate,
    LeadUpdate,
    OpportunityCreate,
    OpportunityStageChange,
    OpportunityUpdate,
    PipelineStageCount,
    PipelineSummary,
    VALID_STAGES,
)
from app.modules.identity.models import Organization, User


# ── Opportunity state machine ─────────────────────────────────────────────────

_OPP_TRANSITIONS: dict[str, set[str]] = {
    "new":          {"qualified", "lost"},
    "qualified":    {"proposal", "lost"},
    "proposal":     {"negotiation", "lost"},
    "negotiation":  {"won", "lost"},
    "won":          set(),
    "lost":         set(),
}


def _assert_opp_transition(current: str, target: str) -> None:
    allowed = _OPP_TRANSITIONS.get(current, set())
    if target not in allowed:
        raise HTTPException(
            status_code=422,
            detail=f"Cannot transition opportunity from '{current}' to '{target}'. "
                   f"Allowed: {sorted(allowed) or 'none (terminal state)'}",
        )


# ── Leads ────────────────────────────────────────────────────────────────────

async def create_lead(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str,
    data: LeadCreate,
) -> Lead:
    if data.organization_id:
        await validate_workspace_ownership(db, Organization, data.organization_id, workspace_id, "organization_id")
    if data.owner_id:
        await validate_workspace_ownership(db, User, data.owner_id, workspace_id, "owner_id")

    lead = Lead(workspace_id=workspace_id, **data.model_dump())
    db.add(lead)
    await db.flush()

    await publish_event(Event(
        event_type=LEAD_CAPTURED,
        source_module="crm",
        workspace_id=workspace_id,
        actor_id=actor_id,
        entity_id=lead.id,
        payload={
            "first_name": lead.first_name,
            "last_name": lead.last_name,
            "email": lead.email,
            "source": lead.source,
            "company_name": lead.company_name,
        },
    ))

    await db.commit()
    await db.refresh(lead)
    return lead


async def list_leads(
    db: AsyncSession,
    workspace_id: str,
    status: str | None = None,
    source: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> Sequence[Lead]:
    q = select(Lead).where(Lead.workspace_id == workspace_id)
    if status:
        q = q.where(Lead.status == status)
    if source:
        q = q.where(Lead.source == source)
    q = q.order_by(Lead.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    return result.scalars().all()


async def get_lead(db: AsyncSession, workspace_id: str, lead_id: str) -> Lead:
    result = await db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.workspace_id == workspace_id)
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return lead


async def update_lead(
    db: AsyncSession,
    workspace_id: str,
    lead_id: str,
    data: LeadUpdate,
) -> Lead:
    lead = await get_lead(db, workspace_id, lead_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(lead, field, value)
    await db.commit()
    await db.refresh(lead)
    return lead


async def convert_lead(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str,
    lead_id: str,
    data: LeadConvert,
) -> Opportunity:
    lead = await get_lead(db, workspace_id, lead_id)

    if lead.status == "converted":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Lead already converted",
        )

    opp = Opportunity(
        workspace_id=workspace_id,
        title=data.title,
        value=data.value,
        close_date=data.close_date,
        owner_id=data.owner_id or lead.owner_id,
        organization_id=lead.organization_id,
        stage="new",
    )
    db.add(opp)
    await db.flush()

    lead.status = "converted"
    lead.opportunity_id = opp.id
    await db.flush()

    await publish_event(Event(
        event_type=LEAD_CONVERTED_TO_OPPORTUNITY,
        source_module="crm",
        workspace_id=workspace_id,
        actor_id=actor_id,
        entity_id=lead.id,
        payload={"lead_id": lead.id, "opportunity_id": opp.id, "title": opp.title},
    ))

    await db.commit()
    await db.refresh(opp)
    return opp


# ── Opportunities ─────────────────────────────────────────────────────────────

async def create_opportunity(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str,
    data: OpportunityCreate,
) -> Opportunity:
    if data.stage not in VALID_STAGES:
        raise HTTPException(status_code=422, detail=f"Invalid stage: {data.stage}")

    if data.organization_id:
        await validate_workspace_ownership(db, Organization, data.organization_id, workspace_id, "organization_id")
    if data.owner_id:
        await validate_workspace_ownership(db, User, data.owner_id, workspace_id, "owner_id")

    opp = Opportunity(workspace_id=workspace_id, **data.model_dump())
    db.add(opp)
    await db.flush()

    await publish_event(Event(
        event_type=OPPORTUNITY_CREATED,
        source_module="crm",
        workspace_id=workspace_id,
        actor_id=actor_id,
        entity_id=opp.id,
        payload={"title": opp.title, "stage": opp.stage, "value": opp.value},
    ))

    await db.commit()
    await db.refresh(opp)
    return opp


async def list_opportunities(
    db: AsyncSession,
    workspace_id: str,
    stage: str | None = None,
    owner_id: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> Sequence[Opportunity]:
    q = select(Opportunity).where(Opportunity.workspace_id == workspace_id)
    if stage:
        q = q.where(Opportunity.stage == stage)
    if owner_id:
        q = q.where(Opportunity.owner_id == owner_id)
    q = q.order_by(Opportunity.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    return result.scalars().all()


async def get_opportunity(
    db: AsyncSession, workspace_id: str, opp_id: str
) -> Opportunity:
    result = await db.execute(
        select(Opportunity).where(
            Opportunity.id == opp_id, Opportunity.workspace_id == workspace_id
        )
    )
    opp = result.scalar_one_or_none()
    if not opp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")
    return opp


async def update_opportunity(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str,
    opp_id: str,
    data: OpportunityUpdate,
) -> Opportunity:
    opp = await get_opportunity(db, workspace_id, opp_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(opp, field, value)

    await publish_event(Event(
        event_type=OPPORTUNITY_UPDATED,
        source_module="crm",
        workspace_id=workspace_id,
        actor_id=actor_id,
        entity_id=opp.id,
        payload=data.model_dump(exclude_unset=True),
    ))

    await db.commit()
    await db.refresh(opp)
    return opp


async def change_stage(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str,
    opp_id: str,
    data: OpportunityStageChange,
) -> Opportunity:
    if data.stage not in VALID_STAGES:
        raise HTTPException(status_code=422, detail=f"Invalid stage: {data.stage}")

    opp = await get_opportunity(db, workspace_id, opp_id)
    previous_stage = opp.stage
    _assert_opp_transition(previous_stage, data.stage)
    opp.stage = data.stage

    now = datetime.now(timezone.utc)

    if data.stage == "won":
        opp.won_at = now
        event_type = OPPORTUNITY_WON
    elif data.stage == "lost":
        opp.lost_at = now
        opp.lost_reason = data.lost_reason
        event_type = OPPORTUNITY_LOST
    else:
        event_type = OPPORTUNITY_STAGE_CHANGED

    await publish_event(Event(
        event_type=event_type,
        source_module="crm",
        workspace_id=workspace_id,
        actor_id=actor_id,
        entity_id=opp.id,
        payload={
            "previous_stage": previous_stage,
            "new_stage": data.stage,
            "value": opp.value,
            "lost_reason": data.lost_reason,
        },
    ))

    await db.commit()
    await db.refresh(opp)
    return opp


async def get_pipeline_summary(
    db: AsyncSession, workspace_id: str
) -> PipelineSummary:
    # One query: group by stage
    result = await db.execute(
        select(
            Opportunity.stage,
            func.count(Opportunity.id).label("count"),
            func.coalesce(func.sum(Opportunity.value), 0).label("total_value"),
        )
        .where(
            Opportunity.workspace_id == workspace_id,
            Opportunity.stage.not_in(["won", "lost"]),
        )
        .group_by(Opportunity.stage)
    )
    rows = result.all()

    stages = [
        PipelineStageCount(
            stage=r.stage,
            count=r.count,
            total_value=float(r.total_value),
        )
        for r in rows
    ]
    total_opps = sum(s.count for s in stages)
    total_value = sum(s.total_value for s in stages)

    # Weighted value requires probability — query individually
    weighted_result = await db.execute(
        select(
            func.coalesce(
                func.sum(Opportunity.value * Opportunity.probability / 100.0), 0
            ).label("weighted")
        ).where(
            Opportunity.workspace_id == workspace_id,
            Opportunity.stage.not_in(["won", "lost"]),
            Opportunity.value.is_not(None),
            Opportunity.probability.is_not(None),
        )
    )
    weighted_value = float(weighted_result.scalar() or 0)

    return PipelineSummary(
        stages=stages,
        total_opportunities=total_opps,
        total_value=total_value,
        weighted_value=weighted_value,
    )


# ── Activities ────────────────────────────────────────────────────────────────

async def create_activity(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str,
    data: ActivityCreate,
) -> Activity:
    activity = Activity(
        workspace_id=workspace_id,
        user_id=actor_id,
        **data.model_dump(),
    )
    db.add(activity)
    await db.commit()
    await db.refresh(activity)
    return activity


async def list_activities(
    db: AsyncSession,
    workspace_id: str,
    entity_type: str | None = None,
    entity_id: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> Sequence[Activity]:
    q = select(Activity).where(Activity.workspace_id == workspace_id)
    if entity_type:
        q = q.where(Activity.entity_type == entity_type)
    if entity_id:
        q = q.where(Activity.entity_id == entity_id)
    q = q.order_by(Activity.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    return result.scalars().all()


async def complete_activity(
    db: AsyncSession, workspace_id: str, activity_id: str
) -> Activity:
    result = await db.execute(
        select(Activity).where(
            Activity.id == activity_id, Activity.workspace_id == workspace_id
        )
    )
    activity = result.scalar_one_or_none()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    activity.completed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(activity)
    return activity
