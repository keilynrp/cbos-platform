from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_admin_user, get_current_user, get_current_workspace_id
from app.modules.identity import schemas, service

router = APIRouter()


# ── Auth ───────────────────────────────────────────────────

@router.post("/auth/register", response_model=schemas.TokenResponse, status_code=201)
async def register(data: schemas.RegisterRequest, db: AsyncSession = Depends(get_db)):
    return await service.register(data, db)


@router.post("/auth/login", response_model=schemas.TokenResponse)
async def login(data: schemas.LoginRequest, db: AsyncSession = Depends(get_db)):
    return await service.login(data, db)


@router.post("/auth/refresh", response_model=schemas.TokenResponse)
async def refresh(data: schemas.RefreshRequest):
    return await service.refresh_tokens(data.refresh_token)


@router.get("/auth/me", response_model=schemas.UserRead)
async def me(current_user=Depends(get_current_user)):
    return current_user


# ── Workspace ──────────────────────────────────────────────

@router.get("/workspaces/me", response_model=schemas.WorkspaceRead)
async def get_my_workspace(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from app.modules.identity.models import Workspace

    result = await db.execute(
        select(Workspace).where(Workspace.id == current_user.workspace_id)
    )
    return result.scalar_one()


# ── Persons ────────────────────────────────────────────────

@router.post("/persons", response_model=schemas.PersonRead, status_code=201)
async def create_person(
    data: schemas.PersonCreate,
    workspace_id: str = Depends(get_current_workspace_id),
    db: AsyncSession = Depends(get_db),
):
    return await service.create_person(workspace_id, data, db)


# ── Organizations ──────────────────────────────────────────

@router.get("/organizations", response_model=list[schemas.OrganizationRead])
async def list_organizations(
    workspace_id: str = Depends(get_current_workspace_id),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_organizations(workspace_id, db)


@router.post("/organizations", response_model=schemas.OrganizationRead, status_code=201)
async def create_organization(
    data: schemas.OrganizationCreate,
    workspace_id: str = Depends(get_current_workspace_id),
    db: AsyncSession = Depends(get_db),
):
    return await service.create_organization(workspace_id, data, db)


def _public_site_response(site, include_secret: bool = False):
    payload = {
        "id": site.id,
        "workspace_id": site.workspace_id,
        "site_slug": site.site_slug,
        "domain": site.domain,
        "allowed_origins": site.allowed_origins,
        "is_active": site.is_active,
        "api_key_hint": service._api_key_hint(site.api_key),
        "created_at": site.created_at,
        "updated_at": site.updated_at,
    }
    if include_secret:
        payload["api_key"] = site.api_key
    return payload


@router.get("/public-sites", response_model=list[schemas.PublicSiteRead])
async def list_public_sites(
    _=Depends(get_current_admin_user),
    workspace_id: str = Depends(get_current_workspace_id),
    db: AsyncSession = Depends(get_db),
):
    sites = await service.list_public_sites(workspace_id, db)
    return [_public_site_response(site) for site in sites]


@router.post("/public-sites", response_model=schemas.PublicSiteSecretRead, status_code=201)
async def create_public_site(
    data: schemas.PublicSiteCreate,
    _=Depends(get_current_admin_user),
    workspace_id: str = Depends(get_current_workspace_id),
    db: AsyncSession = Depends(get_db),
):
    site = await service.create_public_site(workspace_id, data, db)
    return _public_site_response(site, include_secret=True)


@router.patch("/public-sites/{site_id}", response_model=schemas.PublicSiteRead)
async def update_public_site(
    site_id: str,
    data: schemas.PublicSiteUpdate,
    _=Depends(get_current_admin_user),
    workspace_id: str = Depends(get_current_workspace_id),
    db: AsyncSession = Depends(get_db),
):
    site = await service.update_public_site(workspace_id, site_id, data, db)
    return _public_site_response(site)


@router.post("/public-sites/{site_id}/rotate-key", response_model=schemas.PublicSiteSecretRead)
async def rotate_public_site_key(
    site_id: str,
    _=Depends(get_current_admin_user),
    workspace_id: str = Depends(get_current_workspace_id),
    db: AsyncSession = Depends(get_db),
):
    site = await service.rotate_public_site_key(workspace_id, site_id, db)
    return _public_site_response(site, include_secret=True)
