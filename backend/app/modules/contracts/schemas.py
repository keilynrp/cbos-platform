"""Pydantic schemas for the Contracts module."""
from datetime import date, datetime
from pydantic import BaseModel, Field


# ── Clause ────────────────────────────────────────────────────────────────────

class ContractClauseCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    body: str = ""
    clause_order: int = 0


class ContractClauseUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    body: str | None = None
    clause_order: int | None = None


class ContractClauseRead(BaseModel):
    id: str
    contract_id: str
    clause_order: int
    title: str
    body: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Contract ──────────────────────────────────────────────────────────────────

class ContractCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    value: float | None = Field(None, ge=0)
    currency: str = "USD"
    start_date: date | None = None
    end_date: date | None = None
    notes: str | None = None
    sales_order_id: str | None = None
    opportunity_id: str | None = None
    contact_id: str | None = None
    organization_id: str | None = None
    clauses: list[ContractClauseCreate] = []


class ContractUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    value: float | None = Field(None, ge=0)
    currency: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    notes: str | None = None
    contact_id: str | None = None
    organization_id: str | None = None
    status: str | None = None


class ContractRead(BaseModel):
    id: str
    workspace_id: str
    contract_number: str
    title: str
    description: str | None
    status: str
    value: float | None
    currency: str
    start_date: date | None
    end_date: date | None
    sent_at: datetime | None
    signed_at: datetime | None
    executed_at: datetime | None
    terminated_at: datetime | None
    expired_at: datetime | None
    notes: str | None
    sales_order_id: str | None
    opportunity_id: str | None
    contact_id: str | None
    organization_id: str | None
    owner_id: str | None
    clauses: list[ContractClauseRead]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ContractListItem(BaseModel):
    id: str
    contract_number: str
    title: str
    status: str
    value: float | None
    currency: str
    start_date: date | None
    end_date: date | None
    organization_id: str | None
    contact_id: str | None
    sales_order_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
