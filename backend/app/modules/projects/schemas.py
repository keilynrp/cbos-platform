"""Pydantic schemas for the Projects module."""
from datetime import date, datetime
from pydantic import BaseModel, Field


# ── Task ─────────────────────────────────────────────────────────────────────

class ProjectTaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    status: str = "todo"
    due_date: date | None = None
    assignee_id: str | None = None
    task_order: int = 0


class ProjectTaskUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    status: str | None = None
    due_date: date | None = None
    assignee_id: str | None = None
    task_order: int | None = None


class ProjectTaskRead(BaseModel):
    id: str
    project_id: str
    task_order: int
    title: str
    description: str | None
    status: str
    due_date: date | None
    assignee_id: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Project ───────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    budget: float | None = Field(None, ge=0)
    currency: str = "USD"
    start_date: date | None = None
    end_date: date | None = None
    notes: str | None = None
    contract_id: str | None = None
    sales_order_id: str | None = None
    contact_id: str | None = None
    organization_id: str | None = None
    tasks: list[ProjectTaskCreate] = []


class ProjectUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    budget: float | None = Field(None, ge=0)
    currency: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    notes: str | None = None
    contact_id: str | None = None
    organization_id: str | None = None
    status: str | None = None


class ProjectRead(BaseModel):
    id: str
    workspace_id: str
    project_number: str
    title: str
    description: str | None
    status: str
    budget: float | None
    currency: str
    start_date: date | None
    end_date: date | None
    activated_at: datetime | None
    completed_at: datetime | None
    cancelled_at: datetime | None
    notes: str | None
    contract_id: str | None
    sales_order_id: str | None
    contact_id: str | None
    organization_id: str | None
    owner_id: str | None
    tasks: list[ProjectTaskRead]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectListItem(BaseModel):
    id: str
    project_number: str
    title: str
    status: str
    budget: float | None
    currency: str
    start_date: date | None
    end_date: date | None
    organization_id: str | None
    contact_id: str | None
    contract_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
