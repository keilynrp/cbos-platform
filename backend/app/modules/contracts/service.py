"""
Contracts service — CRUD + state machine.

Valid status transitions:
    draft      → sent, terminated
    sent       → signed, terminated
    signed     → executed, terminated
    executed   → expired, terminated
    expired    → (terminal)
    terminated → (terminal)
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from app.core.exceptions import CBOSException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.events.bus import publish as publish_event
from app.events.types import (
    Event,
    CONTRACT_CREATED,
    CONTRACT_SENT,
    CONTRACT_SIGNED,
    CONTRACT_EXECUTED,
    CONTRACT_TERMINATED,
)
from app.modules.contracts.models import Contract, ContractClause
from app.modules.contracts.schemas import (
    ContractClauseCreate,
    ContractClauseUpdate,
    ContractCreate,
    ContractListItem,
    ContractRead,
    ContractUpdate,
)

logger = logging.getLogger(__name__)

# ── Allowed transitions ───────────────────────────────────────────────────────

_TRANSITIONS: dict[str, list[str]] = {
    "draft":      ["sent", "terminated"],
    "sent":       ["signed", "terminated"],
    "signed":     ["executed", "terminated"],
    "executed":   ["expired", "terminated"],
    "expired":    [],
    "terminated": [],
}

# Timestamp field to set on each transition
_TRANSITION_TIMESTAMPS: dict[str, str] = {
    "sent":       "sent_at",
    "signed":     "signed_at",
    "executed":   "executed_at",
    "terminated": "terminated_at",
    "expired":    "expired_at",
}

# Events to emit on each transition
_TRANSITION_EVENTS: dict[str, str] = {
    "sent":       CONTRACT_SENT,
    "signed":     CONTRACT_SIGNED,
    "executed":   CONTRACT_EXECUTED,
    "terminated": CONTRACT_TERMINATED,
}


# ── Numbering ─────────────────────────────────────────────────────────────────

async def _next_contract_number(db: AsyncSession, workspace_id: str) -> str:
    year = datetime.now().year
    prefix = f"CTR-{year}-"
    result = await db.execute(
        select(func.count(Contract.id)).where(
            Contract.workspace_id == workspace_id,
            Contract.contract_number.like(f"{prefix}%"),
        )
    )
    count = result.scalar() or 0
    return f"{prefix}{count + 1:04d}"


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_contract_or_404(
    db: AsyncSession, workspace_id: str, contract_id: str
) -> Contract:
    result = await db.execute(
        select(Contract)
        .where(Contract.id == contract_id, Contract.workspace_id == workspace_id)
        .options(selectinload(Contract.clauses))
        .execution_options(populate_existing=True)
    )
    contract = result.scalar_one_or_none()
    if not contract:
        raise CBOSException(
            status_code=404,
            code="CONTRACT_NOT_FOUND",
            message="Contract not found.",
            detail={"id": contract_id},
        )
    return contract


# ── CRUD ──────────────────────────────────────────────────────────────────────

async def list_contracts(
    db: AsyncSession,
    workspace_id: str,
    status: str | None = None,
    organization_id: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[ContractListItem]:
    q = select(Contract).where(Contract.workspace_id == workspace_id)
    if status:
        q = q.where(Contract.status == status)
    if organization_id:
        q = q.where(Contract.organization_id == organization_id)
    q = q.order_by(Contract.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    return [ContractListItem.model_validate(c) for c in result.scalars().all()]


async def get_contract(
    db: AsyncSession, workspace_id: str, contract_id: str
) -> Contract:
    return await _get_contract_or_404(db, workspace_id, contract_id)


async def create_contract(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str | None,
    data: ContractCreate,
) -> ContractRead:
    number = await _next_contract_number(db, workspace_id)

    contract = Contract(
        workspace_id=workspace_id,
        contract_number=number,
        title=data.title,
        description=data.description,
        value=data.value,
        currency=data.currency,
        start_date=data.start_date,
        end_date=data.end_date,
        notes=data.notes,
        sales_order_id=data.sales_order_id,
        opportunity_id=data.opportunity_id,
        contact_id=data.contact_id,
        organization_id=data.organization_id,
        owner_id=actor_id,
        status="draft",
    )
    db.add(contract)
    await db.flush()  # get contract.id

    for i, clause_data in enumerate(data.clauses):
        clause = ContractClause(
            contract_id=contract.id,
            clause_order=clause_data.clause_order if clause_data.clause_order else i,
            title=clause_data.title,
            body=clause_data.body,
        )
        db.add(clause)

    await db.commit()
    await db.refresh(contract)

    # Re-fetch with clauses
    contract = await _get_contract_or_404(db, workspace_id, contract.id)

    await publish_event(Event(
        event_type=CONTRACT_CREATED,
        source_module="contracts",
        workspace_id=workspace_id,
        actor_id=actor_id,
        entity_id=contract.id,
        payload={
            "contract_number": contract.contract_number,
            "title": contract.title,
            "value": contract.value,
            "currency": contract.currency,
        },
    ))

    return ContractRead.model_validate(contract)


async def update_contract(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str | None,
    contract_id: str,
    data: ContractUpdate,
) -> ContractRead:
    contract = await _get_contract_or_404(db, workspace_id, contract_id)

    # Status transition handling
    if data.status and data.status != contract.status:
        allowed = _TRANSITIONS.get(contract.status, [])
        if data.status not in allowed:
            raise CBOSException(
                status_code=422,
                code="CONTRACT_INVALID_TRANSITION",
                message=f"Invalid transition: {contract.status} -> {data.status}.",
                detail={"from": contract.status, "to": data.status, "allowed": allowed},
            )
        now = datetime.now(timezone.utc)
        ts_field = _TRANSITION_TIMESTAMPS.get(data.status)
        if ts_field:
            setattr(contract, ts_field, now)
        contract.status = data.status

        # Emit transition event
        event_type = _TRANSITION_EVENTS.get(data.status)
        if event_type:
            await publish_event(Event(
                event_type=event_type,
                source_module="contracts",
                workspace_id=workspace_id,
                actor_id=actor_id,
                entity_id=contract.id,
                payload={
                    "contract_number": contract.contract_number,
                    "title": contract.title,
                    "new_status": data.status,
                },
            ))

    # Field updates (only editable in non-terminal states)
    terminal = contract.status in ("executed", "expired", "terminated")

    if data.title is not None:
        contract.title = data.title
    if data.description is not None:
        contract.description = data.description
    if not terminal:
        if data.value is not None:
            contract.value = data.value
        if data.currency is not None:
            contract.currency = data.currency
        if data.start_date is not None:
            contract.start_date = data.start_date
        if data.end_date is not None:
            contract.end_date = data.end_date
    if data.notes is not None:
        contract.notes = data.notes
    if data.contact_id is not None:
        contract.contact_id = data.contact_id
    if data.organization_id is not None:
        contract.organization_id = data.organization_id

    await db.commit()

    contract = await _get_contract_or_404(db, workspace_id, contract.id)
    return ContractRead.model_validate(contract)


async def delete_contract(
    db: AsyncSession, workspace_id: str, contract_id: str
) -> None:
    contract = await _get_contract_or_404(db, workspace_id, contract_id)
    if contract.status not in ("draft",):
        raise CBOSException(
            status_code=409,
            code="CONTRACT_DELETE_NOT_DRAFT",
            message=f"Cannot delete a contract in '{contract.status}' status.",
            detail={"status": contract.status},
        )
    await db.delete(contract)
    await db.commit()


# ── Clauses ───────────────────────────────────────────────────────────────────

async def add_clause(
    db: AsyncSession,
    workspace_id: str,
    contract_id: str,
    data: ContractClauseCreate,
) -> ContractRead:
    contract = await _get_contract_or_404(db, workspace_id, contract_id)
    if contract.status in ("executed", "expired", "terminated"):
        raise CBOSException(
            status_code=409,
            code="CONTRACT_CLAUSES_LOCKED",
            message=f"Cannot modify clauses of a '{contract.status}' contract.",
            detail={"status": contract.status},
        )

    # Auto-assign order if not specified
    max_order = max((c.clause_order for c in contract.clauses), default=-1)
    clause_order = data.clause_order if data.clause_order > 0 else max_order + 1

    clause = ContractClause(
        contract_id=contract_id,
        clause_order=clause_order,
        title=data.title,
        body=data.body,
    )
    db.add(clause)
    await db.commit()

    contract = await _get_contract_or_404(db, workspace_id, contract_id)
    return ContractRead.model_validate(contract)


async def update_clause(
    db: AsyncSession,
    workspace_id: str,
    contract_id: str,
    clause_id: str,
    data: ContractClauseUpdate,
) -> ContractRead:
    contract = await _get_contract_or_404(db, workspace_id, contract_id)
    if contract.status in ("executed", "expired", "terminated"):
        raise CBOSException(
            status_code=409,
            code="CONTRACT_CLAUSES_LOCKED",
            message=f"Cannot modify clauses of a '{contract.status}' contract.",
            detail={"status": contract.status},
        )

    clause = next((c for c in contract.clauses if c.id == clause_id), None)
    if not clause:
        raise CBOSException(
            status_code=404,
            code="CONTRACT_CLAUSE_NOT_FOUND",
            message="Clause not found.",
            detail={"id": clause_id},
        )

    if data.title is not None:
        clause.title = data.title
    if data.body is not None:
        clause.body = data.body
    if data.clause_order is not None:
        clause.clause_order = data.clause_order

    await db.commit()

    contract = await _get_contract_or_404(db, workspace_id, contract_id)
    return ContractRead.model_validate(contract)


async def delete_clause(
    db: AsyncSession,
    workspace_id: str,
    contract_id: str,
    clause_id: str,
) -> ContractRead:
    contract = await _get_contract_or_404(db, workspace_id, contract_id)
    if contract.status in ("executed", "expired", "terminated"):
        raise CBOSException(
            status_code=409,
            code="CONTRACT_CLAUSES_LOCKED",
            message=f"Cannot modify clauses of a '{contract.status}' contract.",
            detail={"status": contract.status},
        )

    clause = next((c for c in contract.clauses if c.id == clause_id), None)
    if not clause:
        raise CBOSException(
            status_code=404,
            code="CONTRACT_CLAUSE_NOT_FOUND",
            message="Clause not found.",
            detail={"id": clause_id},
        )

    await db.delete(clause)
    await db.commit()

    contract = await _get_contract_or_404(db, workspace_id, contract_id)
    return ContractRead.model_validate(contract)
