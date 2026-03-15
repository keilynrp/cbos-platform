from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_workspace_id
from app.modules.identity.models import User
from app.modules.workflows import service
from app.modules.workflows.schemas import (
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
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.list_workflows(db, workspace_id)


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
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.list_runs(db, workspace_id, workflow_id, limit)


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
