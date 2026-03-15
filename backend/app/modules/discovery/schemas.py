from datetime import datetime
from pydantic import BaseModel, Field


# ── Sesión ────────────────────────────────────────────────────────────────────

class DiscoverySessionCreate(BaseModel):
    business_description: str | None = Field(None, description="Descripción inicial del negocio")
    industry: str | None = None
    company_size: str | None = None  # nano, small, medium, large


class DiscoverySessionRead(BaseModel):
    id: str
    workspace_id: str
    status: str
    business_description: str | None
    industry: str | None
    company_size: str | None
    detected_pain_points: list | None
    matched_capabilities: list | None
    recommended_package: str | None
    blueprint: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Mensajes ──────────────────────────────────────────────────────────────────

class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)


class MessageRead(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    token_count: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatResponse(BaseModel):
    message: MessageRead
    session: DiscoverySessionRead


# ── Blueprint ─────────────────────────────────────────────────────────────────

class BlueprintResponse(BaseModel):
    session_id: str
    blueprint: dict
    recommended_package: str
    matched_capabilities: list


# ── Apply ─────────────────────────────────────────────────────────────────────

class ApplyResult(BaseModel):
    success: bool
    message: str
    workspace_id: str
    activated_modules: list[str]
