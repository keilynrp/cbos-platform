import hashlib
import json
import logging
import time
from collections import deque
from datetime import datetime, timezone
from typing import Sequence

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
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
from app.modules.crm.models import Activity, Lead, Opportunity, PublicLeadSubmission
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
    PublicLeadCaptureResponse,
    PublicLeadCreate,
    VALID_STAGES,
)
from app.modules.identity.models import Organization, PublicSite, User


logger = logging.getLogger(__name__)
_public_rate_limit_buckets: dict[str, deque[float]] = {}


def _normalize_origin(origin: str) -> str:
    return origin.rstrip("/").lower()


def _audit_public_intake(
    outcome: str,
    *,
    site_slug: str | None = None,
    workspace_id: str | None = None,
    origin: str | None = None,
    client_ip: str | None = None,
    lead_id: str | None = None,
    reason: str | None = None,
) -> None:
    logger.info(
        "public_lead_intake outcome=%s site_slug=%s workspace_id=%s origin=%s client_ip=%s lead_id=%s reason=%s",
        outcome,
        site_slug,
        workspace_id,
        origin,
        client_ip,
        lead_id,
        reason,
    )


def _enforce_public_rate_limit(site_slug: str, client_ip: str | None) -> None:
    key = f"{site_slug}:{client_ip or 'unknown'}"
    now = time.monotonic()
    window_start = now - 60
    bucket = _public_rate_limit_buckets.setdefault(key, deque())

    while bucket and bucket[0] < window_start:
        bucket.popleft()

    if len(bucket) >= settings.public_site_rate_limit_per_minute:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded for public site intake",
            headers={"Retry-After": "60"},
        )

    bucket.append(now)


def _hash_public_payload(data: PublicLeadCreate) -> str:
    payload = data.model_dump(mode="json", exclude_none=True)
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _compose_public_notes(
    data: PublicLeadCreate,
    site_slug: str,
    origin: str | None,
) -> str | None:
    sections: list[str] = []
    if data.notes:
        sections.append(data.notes.strip())

    metadata_lines = [f"[Public Intake] site={site_slug}"]
    if origin:
        metadata_lines.append(f"origin={origin}")
    if data.source_page:
        metadata_lines.append(f"source_page={data.source_page}")
    if data.form_id:
        metadata_lines.append(f"form_id={data.form_id}")
    if data.campaign:
        metadata_lines.append(
            f"campaign={json.dumps(data.campaign.model_dump(exclude_none=True), sort_keys=True)}"
        )
    if data.consent:
        metadata_lines.append(
            f"consent={json.dumps(data.consent.model_dump(mode='json', exclude_none=True), sort_keys=True)}"
        )

    sections.append("\n".join(metadata_lines))
    return "\n\n".join(section for section in sections if section) or None


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
    actor_id: str | None,
    data: LeadCreate,
    commit: bool = True,
    event_payload_extra: dict | None = None,
) -> Lead:
    if data.organization_id:
        await validate_workspace_ownership(db, Organization, data.organization_id, workspace_id, "organization_id")
    if data.owner_id:
        await validate_workspace_ownership(db, User, data.owner_id, workspace_id, "owner_id")

    lead = Lead(workspace_id=workspace_id, **data.model_dump())
    db.add(lead)
    await db.flush()

    event_payload = {
        "first_name": lead.first_name,
        "last_name": lead.last_name,
        "email": lead.email,
        "source": lead.source,
        "company_name": lead.company_name,
    }
    if event_payload_extra:
        event_payload.update(event_payload_extra)

    await publish_event(Event(
        event_type=LEAD_CAPTURED,
        source_module="crm",
        workspace_id=workspace_id,
        actor_id=actor_id,
        entity_id=lead.id,
        payload=event_payload,
    ))

    if commit:
        await db.commit()
        await db.refresh(lead)
    return lead


async def create_public_lead(
    db: AsyncSession,
    site_key: str | None,
    origin: str | None,
    idempotency_key: str | None,
    client_ip: str | None,
    data: PublicLeadCreate,
) -> tuple[PublicLeadCaptureResponse, bool]:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing or invalid site key",
    )
    if not site_key:
        _audit_public_intake(
            "rejected",
            origin=origin,
            client_ip=client_ip,
            reason="missing_site_key",
        )
        raise credentials_exception

    result = await db.execute(
        select(PublicSite).where(PublicSite.api_key == site_key)
    )
    site = result.scalar_one_or_none()
    if not site:
        _audit_public_intake(
            "rejected",
            origin=origin,
            client_ip=client_ip,
            reason="invalid_site_key",
        )
        raise credentials_exception
    if not site.is_active:
        _audit_public_intake(
            "rejected",
            site_slug=site.site_slug,
            workspace_id=site.workspace_id,
            origin=origin,
            client_ip=client_ip,
            reason="inactive_site",
        )
        raise HTTPException(status_code=403, detail="Public site is inactive")

    normalized_origin = _normalize_origin(origin) if origin else None
    allowed_origins = {_normalize_origin(item) for item in site.allowed_origins}
    if allowed_origins and normalized_origin not in allowed_origins:
        _audit_public_intake(
            "rejected",
            site_slug=site.site_slug,
            workspace_id=site.workspace_id,
            origin=origin,
            client_ip=client_ip,
            reason="origin_not_allowed",
        )
        raise HTTPException(status_code=403, detail="Origin not allowed for this site")

    try:
        _enforce_public_rate_limit(site.site_slug, client_ip)
    except HTTPException:
        _audit_public_intake(
            "rejected",
            site_slug=site.site_slug,
            workspace_id=site.workspace_id,
            origin=origin,
            client_ip=client_ip,
            reason="rate_limited",
        )
        raise

    request_hash = _hash_public_payload(data)
    if idempotency_key:
        result = await db.execute(
            select(PublicLeadSubmission).where(
                PublicLeadSubmission.workspace_id == site.workspace_id,
                PublicLeadSubmission.site_slug == site.site_slug,
                PublicLeadSubmission.idempotency_key == idempotency_key,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            if existing.request_hash != request_hash:
                _audit_public_intake(
                    "rejected",
                    site_slug=site.site_slug,
                    workspace_id=site.workspace_id,
                    origin=origin,
                    client_ip=client_ip,
                    reason="idempotency_conflict",
                )
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Idempotency key already used with different payload",
                )
            lead = await get_lead(db, site.workspace_id, existing.lead_id)
            _audit_public_intake(
                "duplicate",
                site_slug=site.site_slug,
                workspace_id=site.workspace_id,
                origin=origin,
                client_ip=client_ip,
                lead_id=lead.id,
            )
            return PublicLeadCaptureResponse(
                id=lead.id,
                status=lead.status,
                source=lead.source,
                message="Lead already captured",
            ), False

    lead_data = LeadCreate(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        phone=data.phone,
        company_name=data.company_name,
        source=f"website:{site.site_slug}",
        notes=_compose_public_notes(data, site.site_slug, origin),
    )
    event_payload_extra = {
        "site_slug": site.site_slug,
        "form_id": data.form_id,
        "source_page": data.source_page,
        "origin": origin,
        "public_intake": True,
    }

    if idempotency_key:
        lead = await create_lead(
            db,
            site.workspace_id,
            None,
            lead_data,
            commit=False,
            event_payload_extra=event_payload_extra,
        )
        db.add(PublicLeadSubmission(
            workspace_id=site.workspace_id,
            site_slug=site.site_slug,
            idempotency_key=idempotency_key,
            request_hash=request_hash,
            lead_id=lead.id,
        ))
        await db.commit()
        await db.refresh(lead)
    else:
        lead = await create_lead(
            db,
            site.workspace_id,
            None,
            lead_data,
            event_payload_extra=event_payload_extra,
        )

    _audit_public_intake(
        "accepted",
        site_slug=site.site_slug,
        workspace_id=site.workspace_id,
        origin=origin,
        client_ip=client_ip,
        lead_id=lead.id,
    )

    return PublicLeadCaptureResponse(
        id=lead.id,
        status=lead.status,
        source=lead.source,
        message="Lead captured",
    ), True


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
