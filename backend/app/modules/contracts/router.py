"""Contracts router — full CRUD + clause management + state transitions."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_workspace_id
from app.modules.contracts import service
from app.modules.contracts.schemas import (
    ContractClauseCreate,
    ContractClauseRead,
    ContractClauseUpdate,
    ContractCreate,
    ContractListItem,
    ContractRead,
    ContractUpdate,
)
from app.modules.identity.models import User

router = APIRouter(prefix="/contracts", tags=["Contracts"])


# ── Contracts ─────────────────────────────────────────────────────────────────

@router.get("", response_model=list[ContractListItem])
async def list_contracts(
    status: str | None = Query(None),
    organization_id: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.list_contracts(
        db, workspace_id, status=status, organization_id=organization_id,
        limit=limit, offset=offset,
    )


@router.get("/{contract_id}", response_model=ContractRead)
async def get_contract(
    contract_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    contract = await service.get_contract(db, workspace_id, contract_id)
    return ContractRead.model_validate(contract)


@router.post("", response_model=ContractRead, status_code=201)
async def create_contract(
    data: ContractCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.create_contract(db, workspace_id, current_user.id, data)


@router.patch("/{contract_id}", response_model=ContractRead)
async def update_contract(
    contract_id: str,
    data: ContractUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.update_contract(db, workspace_id, current_user.id, contract_id, data)


@router.delete("/{contract_id}", status_code=204)
async def delete_contract(
    contract_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    await service.delete_contract(db, workspace_id, contract_id)


# ── Clauses ───────────────────────────────────────────────────────────────────

@router.post("/{contract_id}/clauses", response_model=ContractRead, status_code=201)
async def add_clause(
    contract_id: str,
    data: ContractClauseCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.add_clause(db, workspace_id, contract_id, data)


@router.patch("/{contract_id}/clauses/{clause_id}", response_model=ContractRead)
async def update_clause(
    contract_id: str,
    clause_id: str,
    data: ContractClauseUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.update_clause(db, workspace_id, contract_id, clause_id, data)


@router.delete("/{contract_id}/clauses/{clause_id}", response_model=ContractRead)
async def delete_clause(
    contract_id: str,
    clause_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.delete_clause(db, workspace_id, contract_id, clause_id)
