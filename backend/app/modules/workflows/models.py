from sqlalchemy import String, Text, JSON, Boolean, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Workflow(Base):
    """
    Definición de un workflow de automatización.

    trigger_type: "event" | "schedule" (schedule = futuro)
    trigger_config: {"event_type": "QuoteCreated"} | {"cron": "0 9 * * 1"}

    conditions: lista de condiciones AND (todas deben cumplirse)
    [{"field": "payload.status", "op": "eq", "value": "sent"}]

    actions: lista de acciones en orden
    [{"type": "send_email", "config": {...}},
     {"type": "update_status", "config": {...}}]
    """
    __tablename__ = "workflows"

    workspace_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    trigger_type: Mapped[str] = mapped_column(String(30))   # event | schedule
    trigger_config: Mapped[dict] = mapped_column(JSON)       # {event_type: ...}

    conditions: Mapped[list | None] = mapped_column(JSON, nullable=True)  # [] = always match
    actions: Mapped[list] = mapped_column(JSON)

    run_count: Mapped[int] = mapped_column(Integer, default=0)
    last_triggered_at: Mapped[str | None] = mapped_column(String(50), nullable=True)

    runs: Mapped[list["WorkflowRun"]] = relationship(
        "WorkflowRun",
        back_populates="workflow",
        order_by="WorkflowRun.created_at.desc()",
        lazy="noload",
    )


class WorkflowRun(Base):
    """Registro de una ejecución de workflow."""
    __tablename__ = "workflow_runs"

    workflow_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workflows.id"), nullable=False, index=True
    )
    workspace_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)

    status: Mapped[str] = mapped_column(String(30), default="running")
    # running | completed | failed | skipped

    trigger_event_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    trigger_event_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    trigger_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    steps_result: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # [{action_type, status, detail, duration_ms}]

    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    workflow: Mapped["Workflow"] = relationship("Workflow", back_populates="runs")
