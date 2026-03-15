from datetime import date, datetime

from pydantic import BaseModel, EmailStr


# ── Internal — session management (requires JWT) ─────────────────────────────

class PortalSessionCreate(BaseModel):
    quote_id: str
    client_name: str | None = None
    client_email: str | None = None
    expire_hours: int = 72  # override default


class PortalSessionRead(BaseModel):
    id: str
    workspace_id: str
    quote_id: str
    token: str
    expires_at: datetime
    accessed_at: datetime | None
    completed_at: datetime | None
    action: str | None
    client_name: str | None
    client_email: str | None
    created_by_id: str | None
    portal_url: str  # computed full URL for sharing
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Public — customer-facing views (no JWT, token-based) ─────────────────────

class PortalQuoteLine(BaseModel):
    description: str
    quantity: float
    unit_price: float
    discount_percent: float
    amount: float


class PortalQuoteView(BaseModel):
    """Read-only view of a quote for the customer portal."""
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
    lines: list[PortalQuoteLine]

    # Context
    workspace_name: str
    org_name: str | None
    contact_name: str | None

    # Session metadata
    can_accept: bool       # quote is in a state where customer can act
    session_expires_at: datetime
    already_acted: bool    # customer already accepted/rejected in this session


class PortalAccept(BaseModel):
    client_name: str | None = None
    client_email: EmailStr | None = None
    client_notes: str | None = None


class PortalReject(BaseModel):
    client_name: str | None = None
    client_email: EmailStr | None = None
    reason: str | None = None


class PortalActionResult(BaseModel):
    success: bool
    action: str          # accepted | rejected
    message: str
    order_number: str | None = None  # set when accepted


# ── Order status view for customer ───────────────────────────────────────────

class PortalOrderView(BaseModel):
    order_number: str
    status: str
    total: float
    currency: str
    confirmed_at: datetime | None
    fulfilled_at: datetime | None
    workspace_name: str
    org_name: str | None
