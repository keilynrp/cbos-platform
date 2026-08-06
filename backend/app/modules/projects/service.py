"""
Projects service — CRUD + state machine + task management.

Valid project status transitions:
    planning  → active, cancelled
    active    → on_hold, completed, cancelled
    on_hold   → active, cancelled
    completed → (terminal)
    cancelled → (terminal)

Valid task status transitions:
    todo        → in_progress, cancelled
    in_progress → done, todo, cancelled
    done        → todo  (can reopen)
    cancelled   → (terminal)
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from app.core.exceptions import CBOSException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.events.bus import publish as publish_event
from app.events.types import (
    Event,
    PROJECT_CREATED,
    PROJECT_ACTIVATED,
    PROJECT_COMPLETED,
    PROJECT_CANCELLED,
    PROJECT_TASK_COMPLETED,
)
from app.modules.projects.models import Project, ProjectTask
from app.modules.projects.schemas import (
    ProjectCreate,
    ProjectListItem,
    ProjectRead,
    ProjectTaskCreate,
    ProjectTaskUpdate,
    ProjectUpdate,
)

logger = logging.getLogger(__name__)

# ── Allowed transitions ───────────────────────────────────────────────────────

_PROJECT_TRANSITIONS: dict[str, list[str]] = {
    "planning":  ["active", "cancelled"],
    "active":    ["on_hold", "completed", "cancelled"],
    "on_hold":   ["active", "cancelled"],
    "completed": [],
    "cancelled": [],
}

_PROJECT_TRANSITION_TIMESTAMPS: dict[str, str] = {
    "active":    "activated_at",
    "completed": "completed_at",
    "cancelled": "cancelled_at",
}

_PROJECT_TRANSITION_EVENTS: dict[str, str] = {
    "active":    PROJECT_ACTIVATED,
    "completed": PROJECT_COMPLETED,
    "cancelled": PROJECT_CANCELLED,
}

_TASK_TRANSITIONS: dict[str, list[str]] = {
    "todo":        ["in_progress", "cancelled"],
    "in_progress": ["done", "todo", "cancelled"],
    "done":        ["todo"],
    "cancelled":   [],
}

_TERMINAL_PROJECT_STATUSES = {"completed", "cancelled"}


# ── Numbering ─────────────────────────────────────────────────────────────────

async def _next_project_number(db: AsyncSession, workspace_id: str) -> str:
    year = datetime.now().year
    prefix = f"PRJ-{year}-"
    result = await db.execute(
        select(func.count(Project.id)).where(
            Project.workspace_id == workspace_id,
            Project.project_number.like(f"{prefix}%"),
        )
    )
    count = result.scalar() or 0
    return f"{prefix}{count + 1:04d}"


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_project_or_404(
    db: AsyncSession, workspace_id: str, project_id: str
) -> Project:
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id, Project.workspace_id == workspace_id)
        .options(selectinload(Project.tasks))
        .execution_options(populate_existing=True)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise CBOSException(
            status_code=404,
            code="PROJECT_NOT_FOUND",
            message="Project not found.",
            detail={"id": project_id},
        )
    return project


# ── CRUD ──────────────────────────────────────────────────────────────────────

async def list_projects(
    db: AsyncSession,
    workspace_id: str,
    status: str | None = None,
    organization_id: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[ProjectListItem]:
    q = select(Project).where(Project.workspace_id == workspace_id)
    if status:
        q = q.where(Project.status == status)
    if organization_id:
        q = q.where(Project.organization_id == organization_id)
    q = q.order_by(Project.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    return [ProjectListItem.model_validate(p) for p in result.scalars().all()]


async def get_project(
    db: AsyncSession, workspace_id: str, project_id: str
) -> Project:
    return await _get_project_or_404(db, workspace_id, project_id)


async def create_project(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str | None,
    data: ProjectCreate,
) -> ProjectRead:
    number = await _next_project_number(db, workspace_id)

    project = Project(
        workspace_id=workspace_id,
        project_number=number,
        title=data.title,
        description=data.description,
        budget=data.budget,
        currency=data.currency,
        start_date=data.start_date,
        end_date=data.end_date,
        notes=data.notes,
        contract_id=data.contract_id,
        sales_order_id=data.sales_order_id,
        contact_id=data.contact_id,
        organization_id=data.organization_id,
        owner_id=actor_id,
        status="planning",
    )
    db.add(project)
    await db.flush()

    for i, task_data in enumerate(data.tasks):
        task = ProjectTask(
            project_id=project.id,
            task_order=task_data.task_order if task_data.task_order else i,
            title=task_data.title,
            description=task_data.description,
            status=task_data.status or "todo",
            due_date=task_data.due_date,
            assignee_id=task_data.assignee_id,
        )
        db.add(task)

    await db.commit()
    await db.refresh(project)

    project = await _get_project_or_404(db, workspace_id, project.id)

    await publish_event(Event(
        event_type=PROJECT_CREATED,
        source_module="projects",
        workspace_id=workspace_id,
        actor_id=actor_id,
        entity_id=project.id,
        payload={
            "project_number": project.project_number,
            "title": project.title,
            "budget": project.budget,
            "currency": project.currency,
        },
    ))

    return ProjectRead.model_validate(project)


async def update_project(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str | None,
    project_id: str,
    data: ProjectUpdate,
) -> ProjectRead:
    project = await _get_project_or_404(db, workspace_id, project_id)

    # Status transition handling
    if data.status and data.status != project.status:
        allowed = _PROJECT_TRANSITIONS.get(project.status, [])
        if data.status not in allowed:
            raise CBOSException(
                status_code=422,
                code="PROJECT_INVALID_TRANSITION",
                message=f"Invalid transition: {project.status} -> {data.status}.",
                detail={"from": project.status, "to": data.status, "allowed": allowed},
            )
        now = datetime.now(timezone.utc)
        ts_field = _PROJECT_TRANSITION_TIMESTAMPS.get(data.status)
        if ts_field:
            setattr(project, ts_field, now)
        project.status = data.status

        event_type = _PROJECT_TRANSITION_EVENTS.get(data.status)
        if event_type:
            await publish_event(Event(
                event_type=event_type,
                source_module="projects",
                workspace_id=workspace_id,
                actor_id=actor_id,
                entity_id=project.id,
                payload={
                    "project_number": project.project_number,
                    "title": project.title,
                    "new_status": data.status,
                },
            ))

    terminal = project.status in _TERMINAL_PROJECT_STATUSES

    if data.title is not None:
        project.title = data.title
    if data.description is not None:
        project.description = data.description
    if not terminal:
        if data.budget is not None:
            project.budget = data.budget
        if data.currency is not None:
            project.currency = data.currency
        if data.start_date is not None:
            project.start_date = data.start_date
        if data.end_date is not None:
            project.end_date = data.end_date
    if data.notes is not None:
        project.notes = data.notes
    if data.contact_id is not None:
        project.contact_id = data.contact_id
    if data.organization_id is not None:
        project.organization_id = data.organization_id

    await db.commit()
    project = await _get_project_or_404(db, workspace_id, project.id)
    return ProjectRead.model_validate(project)


async def delete_project(
    db: AsyncSession, workspace_id: str, project_id: str
) -> None:
    project = await _get_project_or_404(db, workspace_id, project_id)
    if project.status != "planning":
        raise CBOSException(
            status_code=409,
            code="PROJECT_DELETE_NOT_PLANNING",
            message=f"Cannot delete a project in '{project.status}' status.",
            detail={"status": project.status},
        )
    await db.delete(project)
    await db.commit()


# ── Tasks ─────────────────────────────────────────────────────────────────────

async def add_task(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str | None,
    project_id: str,
    data: ProjectTaskCreate,
) -> ProjectRead:
    project = await _get_project_or_404(db, workspace_id, project_id)
    if project.status in _TERMINAL_PROJECT_STATUSES:
        raise CBOSException(
            status_code=409,
            code="PROJECT_TASK_ADD_BLOCKED",
            message=f"Cannot add tasks to a '{project.status}' project.",
            detail={"status": project.status},
        )

    max_order = max((t.task_order for t in project.tasks), default=-1)
    task_order = data.task_order if data.task_order > 0 else max_order + 1

    task = ProjectTask(
        project_id=project_id,
        task_order=task_order,
        title=data.title,
        description=data.description,
        status=data.status or "todo",
        due_date=data.due_date,
        assignee_id=data.assignee_id,
    )
    db.add(task)
    await db.commit()

    project = await _get_project_or_404(db, workspace_id, project_id)
    return ProjectRead.model_validate(project)


async def update_task(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str | None,
    project_id: str,
    task_id: str,
    data: ProjectTaskUpdate,
) -> ProjectRead:
    project = await _get_project_or_404(db, workspace_id, project_id)
    if project.status in _TERMINAL_PROJECT_STATUSES:
        raise CBOSException(
            status_code=409,
            code="PROJECT_TASK_MODIFY_BLOCKED",
            message=f"Cannot modify tasks of a '{project.status}' project.",
            detail={"status": project.status},
        )

    task = next((t for t in project.tasks if t.id == task_id), None)
    if not task:
        raise CBOSException(
            status_code=404,
            code="PROJECT_TASK_NOT_FOUND",
            message="Task not found.",
            detail={"id": task_id},
        )

    # Validate task status transition
    if data.status and data.status != task.status:
        allowed = _TASK_TRANSITIONS.get(task.status, [])
        if data.status not in allowed:
            raise CBOSException(
                status_code=422,
                code="PROJECT_TASK_INVALID_TRANSITION",
                message=f"Invalid task transition: {task.status} -> {data.status}.",
                detail={"from": task.status, "to": data.status, "allowed": allowed},
            )
        task.status = data.status
        if data.status == "done":
            await publish_event(Event(
                event_type=PROJECT_TASK_COMPLETED,
                source_module="projects",
                workspace_id=workspace_id,
                actor_id=actor_id,
                entity_id=task_id,
                payload={
                    "project_id": project_id,
                    "project_number": project.project_number,
                    "task_title": task.title,
                },
            ))

    if data.title is not None:
        task.title = data.title
    if data.description is not None:
        task.description = data.description
    if data.due_date is not None:
        task.due_date = data.due_date
    if data.assignee_id is not None:
        task.assignee_id = data.assignee_id
    if data.task_order is not None:
        task.task_order = data.task_order

    await db.commit()
    project = await _get_project_or_404(db, workspace_id, project_id)
    return ProjectRead.model_validate(project)


async def delete_task(
    db: AsyncSession,
    workspace_id: str,
    project_id: str,
    task_id: str,
) -> ProjectRead:
    project = await _get_project_or_404(db, workspace_id, project_id)
    if project.status in _TERMINAL_PROJECT_STATUSES:
        raise CBOSException(
            status_code=409,
            code="PROJECT_TASK_DELETE_BLOCKED",
            message=f"Cannot delete tasks from a '{project.status}' project.",
            detail={"status": project.status},
        )

    task = next((t for t in project.tasks if t.id == task_id), None)
    if not task:
        raise CBOSException(
            status_code=404,
            code="PROJECT_TASK_NOT_FOUND",
            message="Task not found.",
            detail={"id": task_id},
        )

    await db.delete(task)
    await db.commit()

    project = await _get_project_or_404(db, workspace_id, project_id)
    return ProjectRead.model_validate(project)
