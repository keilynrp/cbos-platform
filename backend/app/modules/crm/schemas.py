from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, model_validator


# ── Lead ────────────────────────────────────────────────────────────────────

class LeadCreate(BaseModel):
    first_name: str
    last_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    company_name: str | None = None
    source: str = "manual"
    notes: str | None = None
    organization_id: str | None = None
    owner_id: str | None = None


class LeadUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    company_name: str | None = None
    source: str | None = None
    status: str | None = None
    notes: str | None = None
    organization_id: str | None = None
    owner_id: str | None = None


class LeadRead(BaseModel):
    id: str
    workspace_id: str
    first_name: str
    last_name: str | None
    email: str | None
    phone: str | None
    company_name: str | None
    source: str
    status: str
    notes: str | None
    organization_id: str | None
    owner_id: str | None
    opportunity_id: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PublicLeadCampaign(BaseModel):
    utm_source: str | None = None
    utm_medium: str | None = None
    utm_campaign: str | None = None


class PublicLeadConsent(BaseModel):
    accepted: bool
    accepted_at: datetime | None = None


class PublicLeadCreate(BaseModel):
    first_name: str
    last_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    company_name: str | None = None
    notes: str | None = None
    source_page: str | None = None
    form_id: str | None = None
    campaign: PublicLeadCampaign | None = None
    consent: PublicLeadConsent | None = None

    @model_validator(mode="after")
    def email_or_phone_required(self) -> "PublicLeadCreate":
        if not self.email and not self.phone:
            raise ValueError("email or phone is required")
        return self


class PublicLeadCaptureResponse(BaseModel):
    id: str
    status: str
    source: str
    message: str


class LeadConvert(BaseModel):
    """Payload para convertir un lead en oportunidad."""
    title: str
    value: float | None = None
    close_date: date | None = None
    owner_id: str | None = None


# ── Opportunity ──────────────────────────────────────────────────────────────

VALID_STAGES = ("new", "qualified", "proposal", "negotiation", "won", "lost")


class OpportunityCreate(BaseModel):
    title: str
    stage: str = "new"
    value: float | None = None
    currency: str = "USD"
    probability: int | None = Field(default=None, ge=0, le=100)
    close_date: date | None = None
    description: str | None = None
    contact_id: str | None = None
    organization_id: str | None = None
    owner_id: str | None = None


class OpportunityUpdate(BaseModel):
    title: str | None = None
    value: float | None = None
    currency: str | None = None
    probability: int | None = Field(default=None, ge=0, le=100)
    close_date: date | None = None
    description: str | None = None
    contact_id: str | None = None
    organization_id: str | None = None
    owner_id: str | None = None


class OpportunityStageChange(BaseModel):
    stage: str
    lost_reason: str | None = None  # requerido si stage == "lost"

    @model_validator(mode="after")
    def lost_reason_required_when_lost(self) -> "OpportunityStageChange":
        if self.stage == "lost" and not self.lost_reason:
            raise ValueError("lost_reason is required when stage='lost'")
        return self


class OpportunityRead(BaseModel):
    id: str
    workspace_id: str
    title: str
    stage: str
    value: float | None
    currency: str
    probability: int | None
    close_date: date | None
    description: str | None
    lost_reason: str | None
    contact_id: str | None
    organization_id: str | None
    owner_id: str | None
    won_at: datetime | None
    lost_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Activity ─────────────────────────────────────────────────────────────────

class ActivityCreate(BaseModel):
    activity_type: str  # call | email | meeting | note | task
    title: str
    description: str | None = None
    entity_type: str  # lead | opportunity
    entity_id: str
    due_date: datetime | None = None


class ActivityRead(BaseModel):
    id: str
    workspace_id: str
    activity_type: str
    title: str
    description: str | None
    entity_type: str
    entity_id: str
    user_id: str | None
    due_date: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Pipeline summary ─────────────────────────────────────────────────────────

class PipelineStageCount(BaseModel):
    stage: str
    count: int
    total_value: float


class PipelineSummary(BaseModel):
    stages: list[PipelineStageCount]
    total_opportunities: int
    total_value: float
    weighted_value: float  # sum(value * probability / 100)
