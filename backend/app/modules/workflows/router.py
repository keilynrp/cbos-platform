import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_workspace_id
from app.events.bus import get_redis
from app.modules.identity.models import User
from app.modules.workflows import service
from app.modules.workflows.schemas import (
    DLQEntryRead,
    DLQListResponse,
    WorkflowCreate,
    WorkflowRead,
    WorkflowRunRead,
    WorkflowTestRequest,
    WorkflowTestResult,
    WorkflowUpdate,
)

router = APIRouter(prefix="/workflows", tags=["Workflow Engine"])


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[WorkflowRead])
async def list_workflows(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.list_workflows(db, workspace_id, limit, offset)


@router.post("", response_model=WorkflowRead, status_code=201)
async def create_workflow(
    data: WorkflowCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.create_workflow(db, workspace_id, data)


@router.get("/{workflow_id}", response_model=WorkflowRead)
async def get_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    wf = await service.get_workflow(db, workspace_id, workflow_id)
    return WorkflowRead.model_validate(wf)


@router.patch("/{workflow_id}", response_model=WorkflowRead)
async def update_workflow(
    workflow_id: str,
    data: WorkflowUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.update_workflow(db, workspace_id, workflow_id, data)


@router.post("/{workflow_id}/toggle", response_model=WorkflowRead)
async def toggle_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    """Habilita o deshabilita un workflow."""
    return await service.toggle_workflow(db, workspace_id, workflow_id)


@router.delete("/{workflow_id}", status_code=204)
async def delete_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    await service.delete_workflow(db, workspace_id, workflow_id)


# ── Runs ──────────────────────────────────────────────────────────────────────

@router.get("/{workflow_id}/runs", response_model=list[WorkflowRunRead])
async def list_runs(
    workflow_id: str,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.list_runs(db, workspace_id, workflow_id, limit, offset)


# ── Test ──────────────────────────────────────────────────────────────────────

@router.post("/{workflow_id}/test", response_model=WorkflowTestResult)
async def test_workflow(
    workflow_id: str,
    data: WorkflowTestRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    """
    Simula la ejecución de un workflow con un evento de prueba.
    Dry run — no ejecuta acciones reales.
    """
    return await service.test_workflow(db, workspace_id, workflow_id, data)


# ── DLQ Monitoring ────────────────────────────────────────────────────────────

@router.get("/dlq", response_model=DLQListResponse)
async def list_dlq_entries(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user=Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    """List messages in the Dead Letter Queue (failed workflow events)."""
    r = await get_redis()
    raw_entries = await r.xrange("cbos:events:dlq", "-", "+", count=offset + limit)
    raw_entries = raw_entries[offset:]

    entries: list[DLQEntryRead] = []
    for entry_id, fields in raw_entries:
        # Parse timestamp from Redis stream ID (format: "<ms>-<seq>")
        try:
            ms = int(entry_id.split("-")[0])
            failed_at = datetime.fromtimestamp(ms / 1000, tz=timezone.utc)
        except Exception:
            failed_at = datetime.now(timezone.utc)

        # Parse event data
        try:
            data = json.loads(fields.get("data", "{}"))
        except Exception:
            data = {"raw": fields.get("data", "")}

        entries.append(DLQEntryRead(
            entry_id=entry_id,
            msg_id=fields.get("msg_id", ""),
            data=data,
            error=fields.get("error", "unknown"),
            failed_at=failed_at,
        ))

    return DLQListResponse(total=len(entries), entries=entries)


@router.delete("/dlq/{entry_id}", status_code=204)
async def delete_dlq_entry(
    entry_id: str,
    current_user=Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    """Remove a specific entry from the Dead Letter Queue (acknowledge/resolve)."""
    r = await get_redis()
    deleted = await r.xdel("cbos:events:dlq", entry_id)
    if deleted == 0:
        raise HTTPException(status_code=404, detail="DLQ entry not found")
