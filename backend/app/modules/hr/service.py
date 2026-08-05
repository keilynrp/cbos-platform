"""
HR service — departments CRUD + employee CRUD + state machine.

Employee status transitions:
    active    → on_leave, terminated
    on_leave  → active, terminated
    terminated → (terminal)
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.events.bus import publish as publish_event
from app.events.types import (
    Event,
    EMPLOYEE_ONBOARDED,
    EMPLOYEE_TERMINATED,
    EMPLOYEE_STATUS_CHANGED,
    DEPARTMENT_CREATED,
)
from app.modules.hr.models import Department, Employee
from app.modules.hr.schemas import (
    DepartmentCreate,
    DepartmentRead,
    DepartmentUpdate,
    EmployeeCreate,
    EmployeeListItem,
    EmployeeRead,
    EmployeeUpdate,
)

logger = logging.getLogger(__name__)

# ── Allowed transitions ───────────────────────────────────────────────────────

_TRANSITIONS: dict[str, list[str]] = {
    "active":     ["on_leave", "terminated"],
    "on_leave":   ["active", "terminated"],
    "terminated": [],
}

_TRANSITION_TIMESTAMPS: dict[str, str] = {
    "on_leave":   "on_leave_since",
    "terminated": "terminated_at",
}


# ── Numbering ─────────────────────────────────────────────────────────────────

async def _next_employee_number(db: AsyncSession, workspace_id: str) -> str:
    year = datetime.now().year
    prefix = f"EMP-{year}-"
    result = await db.execute(
        select(func.count(Employee.id)).where(
            Employee.workspace_id == workspace_id,
            Employee.employee_number.like(f"{prefix}%"),
        )
    )
    count = result.scalar() or 0
    return f"{prefix}{count + 1:04d}"


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_employee_or_404(
    db: AsyncSession, workspace_id: str, employee_id: str
) -> Employee:
    result = await db.execute(
        select(Employee)
        .where(Employee.id == employee_id, Employee.workspace_id == workspace_id)
        .execution_options(populate_existing=True)
    )
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return emp


async def _get_department_or_404(
    db: AsyncSession, workspace_id: str, department_id: str
) -> Department:
    result = await db.execute(
        select(Department).where(
            Department.id == department_id, Department.workspace_id == workspace_id
        )
    )
    dept = result.scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=404, detail="Departamento no encontrado")
    return dept


# ── Departments ───────────────────────────────────────────────────────────────

async def list_departments(
    db: AsyncSession, workspace_id: str
) -> list[DepartmentRead]:
    result = await db.execute(
        select(Department)
        .where(Department.workspace_id == workspace_id)
        .order_by(Department.name)
    )
    return [DepartmentRead.model_validate(d) for d in result.scalars().all()]


async def create_department(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str | None,
    data: DepartmentCreate,
) -> DepartmentRead:
    dept = Department(
        workspace_id=workspace_id,
        name=data.name,
        description=data.description,
    )
    db.add(dept)
    await db.commit()
    await db.refresh(dept)

    await publish_event(Event(
        event_type=DEPARTMENT_CREATED,
        source_module="hr",
        workspace_id=workspace_id,
        actor_id=actor_id,
        entity_id=dept.id,
        payload={"name": dept.name},
    ))

    return DepartmentRead.model_validate(dept)


async def update_department(
    db: AsyncSession,
    workspace_id: str,
    department_id: str,
    data: DepartmentUpdate,
) -> DepartmentRead:
    dept = await _get_department_or_404(db, workspace_id, department_id)
    if data.name is not None:
        dept.name = data.name
    if data.description is not None:
        dept.description = data.description
    await db.commit()
    await db.refresh(dept)
    return DepartmentRead.model_validate(dept)


async def delete_department(
    db: AsyncSession, workspace_id: str, department_id: str
) -> None:
    dept = await _get_department_or_404(db, workspace_id, department_id)
    # Unlink employees before deleting
    await db.execute(
        Employee.__table__.update()  # type: ignore[attr-defined]
        .where(Employee.department_id == department_id)
        .values(department_id=None)
    )
    await db.delete(dept)
    await db.commit()


# ── Employees ─────────────────────────────────────────────────────────────────

async def list_employees(
    db: AsyncSession,
    workspace_id: str,
    status: str | None = None,
    department_id: str | None = None,
    employment_type: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[EmployeeListItem]:
    q = select(Employee).where(Employee.workspace_id == workspace_id)
    if status:
        q = q.where(Employee.status == status)
    if department_id:
        q = q.where(Employee.department_id == department_id)
    if employment_type:
        q = q.where(Employee.employment_type == employment_type)
    q = q.order_by(Employee.full_name).limit(limit).offset(offset)
    result = await db.execute(q)
    return [EmployeeListItem.model_validate(e) for e in result.scalars().all()]


async def get_employee(
    db: AsyncSession, workspace_id: str, employee_id: str
) -> Employee:
    return await _get_employee_or_404(db, workspace_id, employee_id)


async def create_employee(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str | None,
    data: EmployeeCreate,
) -> EmployeeRead:
    # Validate department belongs to workspace if provided
    if data.department_id:
        await _get_department_or_404(db, workspace_id, data.department_id)

    number = await _next_employee_number(db, workspace_id)

    emp = Employee(
        workspace_id=workspace_id,
        employee_number=number,
        full_name=data.full_name,
        email=data.email,
        phone=data.phone,
        position=data.position,
        employment_type=data.employment_type,
        department_id=data.department_id,
        start_date=data.start_date,
        end_date=data.end_date,
        salary=data.salary,
        currency=data.currency,
        notes=data.notes,
        status="active",
    )
    db.add(emp)
    await db.commit()
    await db.refresh(emp)

    await publish_event(Event(
        event_type=EMPLOYEE_ONBOARDED,
        source_module="hr",
        workspace_id=workspace_id,
        actor_id=actor_id,
        entity_id=emp.id,
        payload={
            "employee_number": emp.employee_number,
            "full_name": emp.full_name,
            "position": emp.position,
            "employment_type": emp.employment_type,
        },
    ))

    return EmployeeRead.model_validate(emp)


async def update_employee(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str | None,
    employee_id: str,
    data: EmployeeUpdate,
) -> EmployeeRead:
    emp = await _get_employee_or_404(db, workspace_id, employee_id)

    # Status transition
    if data.status and data.status != emp.status:
        allowed = _TRANSITIONS.get(emp.status, [])
        if data.status not in allowed:
            raise HTTPException(
                status_code=422,
                detail=f"Transicion invalida: {emp.status} -> {data.status}. "
                       f"Permitidas: {allowed or 'ninguna (estado final)'}",
            )
        now = datetime.now(timezone.utc)
        ts_field = _TRANSITION_TIMESTAMPS.get(data.status)
        if ts_field:
            setattr(emp, ts_field, now)
        # Reset on_leave_since if returning to active
        if data.status == "active":
            emp.on_leave_since = None
        emp.status = data.status

        event_type = EMPLOYEE_TERMINATED if data.status == "terminated" else EMPLOYEE_STATUS_CHANGED
        await publish_event(Event(
            event_type=event_type,
            source_module="hr",
            workspace_id=workspace_id,
            actor_id=actor_id,
            entity_id=emp.id,
            payload={
                "employee_number": emp.employee_number,
                "full_name": emp.full_name,
                "new_status": data.status,
            },
        ))

    # Field updates (blocked for terminated)
    terminal = emp.status == "terminated"

    if data.full_name is not None:
        emp.full_name = data.full_name
    if data.email is not None:
        emp.email = data.email
    if data.phone is not None:
        emp.phone = data.phone
    if data.position is not None:
        emp.position = data.position
    if data.notes is not None:
        emp.notes = data.notes
    if not terminal:
        if data.employment_type is not None:
            emp.employment_type = data.employment_type
        if data.department_id is not None:
            if data.department_id:
                await _get_department_or_404(db, workspace_id, data.department_id)
            emp.department_id = data.department_id
        if data.start_date is not None:
            emp.start_date = data.start_date
        if data.end_date is not None:
            emp.end_date = data.end_date
        if data.salary is not None:
            emp.salary = data.salary
        if data.currency is not None:
            emp.currency = data.currency

    await db.commit()
    emp = await _get_employee_or_404(db, workspace_id, emp.id)
    return EmployeeRead.model_validate(emp)


async def delete_employee(
    db: AsyncSession, workspace_id: str, employee_id: str
) -> None:
    emp = await _get_employee_or_404(db, workspace_id, employee_id)
    if emp.status == "terminated":
        raise HTTPException(
            status_code=409,
            detail="No se puede eliminar el registro de un empleado dado de baja. Se conservan para la traza de auditoria.",
        )
    await db.delete(emp)
    await db.commit()
