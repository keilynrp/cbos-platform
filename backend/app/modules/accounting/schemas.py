from datetime import date, datetime
from pydantic import BaseModel, Field


# ── Invoice Line ──────────────────────────────────────────────────────────────

class InvoiceLineCreate(BaseModel):
    description: str = Field(..., min_length=1, max_length=500)
    quantity: float = Field(1.0, gt=0)
    unit_price: float = Field(0.0, ge=0)
    discount_pct: float = Field(0.0, ge=0, le=100)
    product_id: str | None = None
    line_order: int = 0


class InvoiceLineRead(BaseModel):
    id: str
    invoice_id: str
    line_order: int
    description: str
    quantity: float
    unit_price: float
    discount_pct: float
    subtotal: float
    product_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Invoice ───────────────────────────────────────────────────────────────────

class InvoiceCreate(BaseModel):
    issue_date: date
    due_date: date | None = None
    currency: str = "USD"
    tax_rate: float = Field(0.0, ge=0, le=100)
    discount_amount: float = Field(0.0, ge=0)
    notes: str | None = None
    contact_id: str | None = None
    organization_id: str | None = None
    sales_order_id: str | None = None
    lines: list[InvoiceLineCreate] = []


class InvoiceUpdate(BaseModel):
    status: str | None = None
    due_date: date | None = None
    notes: str | None = None
    tax_rate: float | None = None
    discount_amount: float | None = None


class InvoiceRead(BaseModel):
    id: str
    workspace_id: str
    invoice_number: str
    status: str
    issue_date: date
    due_date: date | None
    paid_at: datetime | None
    currency: str
    subtotal: float
    discount_amount: float
    tax_rate: float
    tax_amount: float
    total: float
    amount_paid: float
    amount_due: float
    notes: str | None
    contact_id: str | None
    organization_id: str | None
    sales_order_id: str | None
    owner_id: str | None
    lines: list[InvoiceLineRead]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class InvoiceListItem(BaseModel):
    id: str
    invoice_number: str
    status: str
    issue_date: date
    due_date: date | None
    total: float
    amount_due: float
    currency: str
    organization_id: str | None
    contact_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Payment ───────────────────────────────────────────────────────────────────

class PaymentCreate(BaseModel):
    amount: float = Field(..., gt=0)
    method: str = "transfer"
    reference: str | None = None
    notes: str | None = None
    payment_date: date
    currency: str = "USD"


class PaymentRead(BaseModel):
    id: str
    invoice_id: str
    workspace_id: str
    amount: float
    currency: str
    method: str
    reference: str | None
    notes: str | None
    payment_date: date
    recorded_by_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Summary ───────────────────────────────────────────────────────────────────

class AccountingSummary(BaseModel):
    total_invoiced: float
    total_paid: float
    total_outstanding: float
    overdue_count: int
    overdue_amount: float
    draft_count: int
    sent_count: int
    paid_count: int
