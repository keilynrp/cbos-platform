from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field


# ── Condition / Action building blocks ───────────────────────────────────────

class Condition(BaseModel):
    """
    Evalúa un campo del contexto del evento.
    field: dot-notation path, e.g. "payload.status" o "event_type"
    op: eq | neq | gt | lt | gte | lte | contains | not_contains | in | not_in | exists
    value: valor a comparar
    """
    field: str
    op: str
    value: Any = None


class Action(BaseModel):
    """
    Una acción a ejecutar.
    type: send_email | update_status | create_activity | emit_event | webhook
    config: parámetros específicos del tipo de acción
    """
    type: str
    config: dict[str, Any] = {}


# ── Trigger configs ───────────────────────────────────────────────────────────

class EventTriggerConfig(BaseModel):
    event_type: str
    # Opcional: filtrar por source_module
    source_module: str | None = None


class ScheduleTriggerConfig(BaseModel):
    cron: str  # e.g. "0 9 * * 1"  (lunes 9am)


# ── Workflow CRUD ─────────────────────────────────────────────────────────────

class WorkflowCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    trigger_type: str = Field("event", pattern="^(event|schedule)$")
    trigger_config: dict[str, Any]
    conditions: list[dict[str, Any]] = []
    actions: list[dict[str, Any]] = Field(..., min_length=1)
    enabled: bool = True


class WorkflowUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    trigger_config: dict[str, Any] | None = None
    conditions: list[dict[str, Any]] | None = None
    actions: list[dict[str, Any]] | None = None
    enabled: bool | None = None


class WorkflowRead(BaseModel):
    id: str
    workspace_id: str
    name: str
    description: str | None
    enabled: bool
    trigger_type: str
    trigger_config: dict
    conditions: list | None
    actions: list
    run_count: int
    last_triggered_at: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Workflow Runs ─────────────────────────────────────────────────────────────

class WorkflowRunRead(BaseModel):
    id: str
    workflow_id: str
    workspace_id: str
    status: str
    trigger_event_type: str | None
    trigger_event_id: str | None
    trigger_payload: dict | None
    steps_result: list | None
    error: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Test ──────────────────────────────────────────────────────────────────────

class WorkflowTestRequest(BaseModel):
    """Payload simulado para probar un workflow sin esperar el evento real."""
    event_type: str
    payload: dict[str, Any] = {}


class WorkflowTestResult(BaseModel):
    matched: bool
    conditions_passed: bool
    dry_run: bool = True
    steps_preview: list[dict]
    message: str


# ── DLQ Monitoring ────────────────────────────────────────────────────────────

class DLQEntryRead(BaseModel):
    """A single entry in the Dead Letter Queue."""
    entry_id: str          # Redis stream entry ID (e.g. "1712345678000-0")
    msg_id: str            # Original stream message ID
    data: dict             # Parsed event payload (or {"raw": ...} if unparseable)
    error: str             # Reason for DLQ placement
    failed_at: datetime    # Derived from entry_id timestamp (ms since epoch)

class DLQListResponse(BaseModel):
    total: int
    entries: list[DLQEntryRead]
