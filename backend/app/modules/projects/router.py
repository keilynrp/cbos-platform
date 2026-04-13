"""Projects router — full CRUD + task management + state transitions."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_workspace_id
from app.modules.projects import service
from app.modules.projects.schemas import (
    ProjectCreate,
    ProjectListItem,
    ProjectRead,
    ProjectTaskCreate,
    ProjectTaskUpdate,
    ProjectUpdate,
)
from app.modules.identity.models import User

router = APIRouter(prefix="/projects", tags=["Projects"])


# ── Projects ──────────────────────────────────────────────────────────────────

@router.get("", response_model=list[ProjectListItem])
async def list_projects(
    status: str | None = Query(None),
    organization_id: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.list_projects(
        db, workspace_id, status=status, organization_id=organization_id,
        limit=limit, offset=offset,
    )


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    project = await service.get_project(db, workspace_id, project_id)
    return ProjectRead.model_validate(project)


@router.post("", response_model=ProjectRead, status_code=201)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.create_project(db, workspace_id, current_user.id, data)


@router.patch("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.update_project(db, workspace_id, current_user.id, project_id, data)


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    await service.delete_project(db, workspace_id, project_id)


# ── Tasks ─────────────────────────────────────────────────────────────────────

@router.post("/{project_id}/tasks", response_model=ProjectRead, status_code=201)
async def add_task(
    project_id: str,
    data: ProjectTaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.add_task(db, workspace_id, current_user.id, project_id, data)


@router.patch("/{project_id}/tasks/{task_id}", response_model=ProjectRead)
async def update_task(
    project_id: str,
    task_id: str,
    data: ProjectTaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.update_task(db, workspace_id, current_user.id, project_id, task_id, data)


@router.delete("/{project_id}/tasks/{task_id}", response_model=ProjectRead)
async def delete_task(
    project_id: str,
    task_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.delete_task(db, workspace_id, project_id, task_id)
