"""Pydantic schemas for the HR module."""
from datetime import date, datetime
from pydantic import BaseModel, Field, EmailStr


# ── Department ────────────────────────────────────────────────────────────────

class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None


class DepartmentUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None


class DepartmentRead(BaseModel):
    id: str
    workspace_id: str
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Employee ──────────────────────────────────────────────────────────────────

class EmployeeCreate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    email: str | None = None
    phone: str | None = None
    position: str | None = None
    employment_type: str = "full_time"
    department_id: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    salary: float | None = Field(None, ge=0)
    currency: str = "USD"
    notes: str | None = None


class EmployeeUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=255)
    email: str | None = None
    phone: str | None = None
    position: str | None = None
    employment_type: str | None = None
    department_id: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    salary: float | None = Field(None, ge=0)
    currency: str | None = None
    notes: str | None = None
    status: str | None = None


class EmployeeRead(BaseModel):
    id: str
    workspace_id: str
    employee_number: str
    full_name: str
    email: str | None
    phone: str | None
    status: str
    employment_type: str
    position: str | None
    department_id: str | None
    start_date: date | None
    end_date: date | None
    on_leave_since: datetime | None
    terminated_at: datetime | None
    salary: float | None
    currency: str
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EmployeeListItem(BaseModel):
    id: str
    employee_number: str
    full_name: str
    email: str | None
    status: str
    employment_type: str
    position: str | None
    department_id: str | None
    start_date: date | None
    created_at: datetime

    model_config = {"from_attributes": True}
