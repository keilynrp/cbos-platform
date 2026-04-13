"""HR router — departments CRUD + employee CRUD + status transitions."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_workspace_id
from app.modules.hr import service
from app.modules.hr.schemas import (
    DepartmentCreate,
    DepartmentRead,
    DepartmentUpdate,
    EmployeeCreate,
    EmployeeListItem,
    EmployeeRead,
    EmployeeUpdate,
)
from app.modules.identity.models import User

# Two sub-routers, both registered in main.py with their own prefix
employees_router = APIRouter(prefix="/employees", tags=["HR — Employees"])
departments_router = APIRouter(prefix="/departments", tags=["HR — Departments"])


# ── Departments ───────────────────────────────────────────────────────────────

@departments_router.get("", response_model=list[DepartmentRead])
async def list_departments(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.list_departments(db, workspace_id)


@departments_router.post("", response_model=DepartmentRead, status_code=201)
async def create_department(
    data: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.create_department(db, workspace_id, current_user.id, data)


@departments_router.patch("/{department_id}", response_model=DepartmentRead)
async def update_department(
    department_id: str,
    data: DepartmentUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.update_department(db, workspace_id, department_id, data)


@departments_router.delete("/{department_id}", status_code=204)
async def delete_department(
    department_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    await service.delete_department(db, workspace_id, department_id)


# ── Employees ─────────────────────────────────────────────────────────────────

@employees_router.get("", response_model=list[EmployeeListItem])
async def list_employees(
    status: str | None = Query(None),
    department_id: str | None = Query(None),
    employment_type: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.list_employees(
        db, workspace_id,
        status=status, department_id=department_id, employment_type=employment_type,
        limit=limit, offset=offset,
    )


@employees_router.get("/{employee_id}", response_model=EmployeeRead)
async def get_employee(
    employee_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    emp = await service.get_employee(db, workspace_id, employee_id)
    return EmployeeRead.model_validate(emp)


@employees_router.post("", response_model=EmployeeRead, status_code=201)
async def create_employee(
    data: EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.create_employee(db, workspace_id, current_user.id, data)


@employees_router.patch("/{employee_id}", response_model=EmployeeRead)
async def update_employee(
    employee_id: str,
    data: EmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.update_employee(db, workspace_id, current_user.id, employee_id, data)


@employees_router.delete("/{employee_id}", status_code=204)
async def delete_employee(
    employee_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    await service.delete_employee(db, workspace_id, employee_id)
