import logging
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.events.bus import publish as publish_event
from app.events.types import (
    WORKFLOW_COMPLETED,
    WORKFLOW_FAILED,
    WORKFLOW_TRIGGERED,
    Event,
)
from app.modules.workflows.executor import evaluate_conditions, run_workflow
from app.modules.workflows.models import Workflow, WorkflowRun
from app.modules.workflows.schemas import (
    WorkflowCreate,
    WorkflowRead,
    WorkflowRunRead,
    WorkflowTestRequest,
    WorkflowTestResult,
    WorkflowUpdate,
)

logger = logging.getLogger(__name__)


# ── CRUD ──────────────────────────────────────────────────────────────────────

async def create_workflow(
    db: AsyncSession, workspace_id: str, data: WorkflowCreate
) -> WorkflowRead:
    wf = Workflow(
        workspace_id=workspace_id,
        name=data.name,
        description=data.description,
        trigger_type=data.trigger_type,
        trigger_config=data.trigger_config,
        conditions=data.conditions,
        actions=data.actions,
        enabled=data.enabled,
    )
    db.add(wf)
    await db.commit()
    await db.refresh(wf)
    return WorkflowRead.model_validate(wf)


async def list_workflows(
    db: AsyncSession, workspace_id: str
) -> list[WorkflowRead]:
    result = await db.execute(
        select(Workflow)
        .where(Workflow.workspace_id == workspace_id)
        .order_by(Workflow.created_at.desc())
    )
    return [WorkflowRead.model_validate(wf) for wf in result.scalars().all()]


async def get_workflow(
    db: AsyncSession, workspace_id: str, workflow_id: str
) -> Workflow:
    result = await db.execute(
        select(Workflow).where(
            Workflow.id == workflow_id,
            Workflow.workspace_id == workspace_id,
        )
    )
    wf = result.scalar_one_or_none()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return wf


async def update_workflow(
    db: AsyncSession, workspace_id: str, workflow_id: str, data: WorkflowUpdate
) -> WorkflowRead:
    wf = await get_workflow(db, workspace_id, workflow_id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(wf, field, value)
    await db.commit()
    await db.refresh(wf)
    return WorkflowRead.model_validate(wf)


async def toggle_workflow(
    db: AsyncSession, workspace_id: str, workflow_id: str
) -> WorkflowRead:
    wf = await get_workflow(db, workspace_id, workflow_id)
    wf.enabled = not wf.enabled
    await db.commit()
    await db.refresh(wf)
    return WorkflowRead.model_validate(wf)


async def delete_workflow(
    db: AsyncSession, workspace_id: str, workflow_id: str
) -> None:
    wf = await get_workflow(db, workspace_id, workflow_id)
    await db.delete(wf)
    await db.commit()


# ── Workflow runs ─────────────────────────────────────────────────────────────

async def list_runs(
    db: AsyncSession, workspace_id: str, workflow_id: str, limit: int = 50
) -> list[WorkflowRunRead]:
    await get_workflow(db, workspace_id, workflow_id)  # access check
    result = await db.execute(
        select(WorkflowRun)
        .where(WorkflowRun.workflow_id == workflow_id)
        .order_by(WorkflowRun.created_at.desc())
        .limit(limit)
    )
    return [WorkflowRunRead.model_validate(r) for r in result.scalars().all()]


# ── Dispatch (called by event consumer) ──────────────────────────────────────

async def dispatch_event(db: AsyncSession, event: Event) -> None:
    """
    Busca todos los workflows habilitados que escuchan este event_type
    y los ejecuta si sus condiciones se cumplen.
    Llamado por el WorkflowConsumer en background.
    """
    result = await db.execute(
        select(Workflow).where(
            Workflow.workspace_id == event.workspace_id,
            Workflow.enabled == True,
            Workflow.trigger_type == "event",
        )
    )
    workflows = result.scalars().all()

    context = {
        "event_type": event.event_type,
        "source_module": event.source_module,
        "workspace_id": event.workspace_id,
        "actor_id": event.actor_id,
        "entity_id": event.entity_id,
        "payload": event.payload,
        "event_id": event.event_id,
    }

    for wf in workflows:
        trigger_event = wf.trigger_config.get("event_type", "")
        if trigger_event != event.event_type:
            continue

        # Source module filter (optional)
        trigger_module = wf.trigger_config.get("source_module")
        if trigger_module and trigger_module != event.source_module:
            continue

        # Evaluate conditions
        conditions_ok = evaluate_conditions(wf.conditions or [], context)
        if not conditions_ok:
            logger.debug("Workflow %s skipped: conditions not met", wf.id)
            run = WorkflowRun(
                workflow_id=wf.id,
                workspace_id=event.workspace_id,
                status="skipped",
                trigger_event_type=event.event_type,
                trigger_event_id=event.event_id,
                trigger_payload=event.payload,
                steps_result=[],
            )
            db.add(run)
            await db.commit()
            continue

        # Execute workflow
        logger.info("Executing workflow %s (%s) for event %s", wf.id, wf.name, event.event_type)
        run = WorkflowRun(
            workflow_id=wf.id,
            workspace_id=event.workspace_id,
            status="running",
            trigger_event_type=event.event_type,
            trigger_event_id=event.event_id,
            trigger_payload=event.payload,
        )
        db.add(run)
        await db.flush()

        await publish_event(Event(
            event_type=WORKFLOW_TRIGGERED,
            source_module="workflows",
            workspace_id=event.workspace_id,
            entity_id=wf.id,
            payload={"workflow_name": wf.name, "trigger_event": event.event_type},
        ))

        status, steps, error = await run_workflow(
            wf.id, wf.actions, context, event.workspace_id, db=db
        )
        run.status = status
        run.steps_result = steps
        run.error = error

        # Refresh wf in case it was expired by nested flush/commit inside actions
        await db.refresh(wf)

        # Update workflow metadata
        wf.run_count = (wf.run_count or 0) + 1
        wf.last_triggered_at = datetime.now(timezone.utc).isoformat()

        await publish_event(Event(
            event_type=WORKFLOW_COMPLETED if status == "completed" else WORKFLOW_FAILED,
            source_module="workflows",
            workspace_id=event.workspace_id,
            entity_id=wf.id,
            payload={
                "workflow_name": wf.name,
                "run_id": run.id,
                "status": status,
                "steps": len(steps),
                "error": error,
            },
        ))

        await db.commit()
        logger.info("Workflow %s run %s — status: %s", wf.id, run.id, status)


# ── Test endpoint ─────────────────────────────────────────────────────────────

async def test_workflow(
    db: AsyncSession, workspace_id: str, workflow_id: str, data: WorkflowTestRequest
) -> WorkflowTestResult:
    wf = await get_workflow(db, workspace_id, workflow_id)

    context = {
        "event_type": data.event_type,
        "workspace_id": workspace_id,
        "payload": data.payload,
    }

    # Check trigger match
    trigger_event = wf.trigger_config.get("event_type", "")
    matched = (trigger_event == data.event_type)

    # Check conditions (dry run)
    conditions_ok = evaluate_conditions(wf.conditions or [], context) if matched else False

    steps_preview = [
        {"action_type": a.get("type"), "config_keys": list(a.get("config", {}).keys())}
        for a in wf.actions
    ]

    if not matched:
        msg = f"Trigger mismatch: workflow listens to '{trigger_event}', got '{data.event_type}'"
    elif not conditions_ok:
        msg = "Trigger matched but conditions NOT satisfied (dry run, no actions executed)"
    else:
        msg = f"Would execute {len(wf.actions)} action(s) (dry run, no actions executed)"

    return WorkflowTestResult(
        matched=matched,
        conditions_passed=conditions_ok,
        dry_run=True,
        steps_preview=steps_preview,
        message=msg,
    )
