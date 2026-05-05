from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── QuoteLine ────────────────────────────────────────────────────────────────

class QuoteLineCreate(BaseModel):
    description: str
    quantity: float = Field(default=1.0, gt=0)
    unit_price: float = Field(default=0.0, ge=0)
    discount_percent: float = Field(default=0.0, ge=0, le=100)
    tax_percent: float = Field(default=0.0, ge=0, le=100)
    line_order: int = Field(default=1, ge=1)
    sku: str | None = None
    unit: str | None = None
    notes: str | None = None
    product_id: str | None = None


class QuoteLineRead(BaseModel):
    id: str
    quote_id: str
    line_order: int
    sku: str | None
    description: str
    unit: str | None
    quantity: float
    unit_price: float
    discount_percent: float
    tax_percent: float
    amount: float
    notes: str | None
    product_id: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class QuoteLineUpdate(BaseModel):
    sku: str | None = None
    description: str | None = None
    unit: str | None = None
    quantity: float | None = Field(default=None, gt=0)
    unit_price: float | None = Field(default=None, ge=0)
    discount_percent: float | None = Field(default=None, ge=0, le=100)
    tax_percent: float | None = Field(default=None, ge=0, le=100)
    notes: str | None = None
    line_order: int | None = Field(default=None, ge=1)
    product_id: str | None = None


class QuoteLineUpsert(BaseModel):
    id: str | None = None
    sku: str | None = None
    description: str
    unit: str | None = None
    quantity: float = Field(default=1.0, gt=0)
    unit_price: float = Field(default=0.0, ge=0)
    discount_percent: float = Field(default=0.0, ge=0, le=100)
    tax_percent: float = Field(default=0.0, ge=0, le=100)
    notes: str | None = None
    line_order: int = Field(default=1, ge=1)
    product_id: str | None = None


# ── Quote ────────────────────────────────────────────────────────────────────

class QuoteCreate(BaseModel):
    title: str
    opportunity_id: str | None = None
    contact_id: str | None = None
    organization_id: str | None = None
    owner_id: str | None = None
    valid_until: date | None = None
    currency: str = "USD"
    tax_rate: float = Field(default=0.0, ge=0, le=100)
    discount_amount: float = Field(default=0.0, ge=0)
    notes: str | None = None
    terms: str | None = None
    lines: list[QuoteLineCreate] = []


class QuoteUpdate(BaseModel):
    title: str | None = None
    valid_until: date | None = None
    currency: str | None = None
    tax_rate: float | None = Field(default=None, ge=0, le=100)
    discount_amount: float | None = Field(default=None, ge=0)
    notes: str | None = None
    terms: str | None = None
    contact_id: str | None = None
    organization_id: str | None = None
    owner_id: str | None = None


class QuoteRead(BaseModel):
    id: str
    workspace_id: str
    quote_number: str
    title: str
    status: str
    valid_until: date | None
    currency: str
    subtotal: float
    discount_amount: float
    tax_rate: float
    tax_amount: float
    total: float
    notes: str | None
    terms: str | None
    sent_at: datetime | None
    accepted_at: datetime | None
    rejected_at: datetime | None
    opportunity_id: str | None
    contact_id: str | None
    organization_id: str | None
    owner_id: str | None
    lines: list[QuoteLineRead] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class QuoteReject(BaseModel):
    reason: str | None = None


class QuoteEventRead(BaseModel):
    id: str
    quote_id: str
    user_id: str | None
    event_type: str
    description: str
    event_metadata: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── SalesOrderLine ───────────────────────────────────────────────────────────

class SalesOrderLineRead(BaseModel):
    id: str
    order_id: str
    line_order: int
    description: str
    quantity: float
    unit_price: float
    discount_percent: float
    amount: float
    product_id: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── SalesOrder ───────────────────────────────────────────────────────────────

class SalesOrderRead(BaseModel):
    id: str
    workspace_id: str
    order_number: str
    status: str
    total: float
    currency: str
    notes: str | None
    confirmed_at: datetime | None
    fulfilled_at: datetime | None
    cancelled_at: datetime | None
    quote_id: str | None
    opportunity_id: str | None
    contact_id: str | None
    organization_id: str | None
    owner_id: str | None
    lines: list[SalesOrderLineRead] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SalesOrderCreate(BaseModel):
    """Crear una orden directa (sin cotización previa)."""
    title: str | None = None
    opportunity_id: str | None = None
    contact_id: str | None = None
    organization_id: str | None = None
    total: float = 0.0
    currency: str = "USD"
    notes: str | None = None


class SalesOrderConfirm(BaseModel):
    notes: str | None = None
