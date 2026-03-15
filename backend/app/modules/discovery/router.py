from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_workspace_id
from app.modules.discovery import service
from app.modules.discovery.capability_registry import CAPABILITIES, SOLUTION_PACKAGES
from app.modules.discovery.schemas import (
    ApplyResult,
    BlueprintResponse,
    ChatResponse,
    DiscoverySessionCreate,
    DiscoverySessionRead,
    MessageCreate,
)
from app.modules.identity.models import User

router = APIRouter(prefix="/discovery", tags=["Solution Discovery"])


# ── Capabilities & packages (public info) ─────────────────────────────────────

@router.get("/capabilities")
async def list_capabilities():
    """Retorna el catálogo completo de capabilities CBOS."""
    return {"capabilities": CAPABILITIES}


@router.get("/packages")
async def list_packages():
    """Retorna los paquetes de solución disponibles."""
    return {"packages": SOLUTION_PACKAGES}


# ── Sessions ──────────────────────────────────────────────────────────────────

@router.post("/sessions", response_model=DiscoverySessionRead, status_code=201)
async def create_session(
    data: DiscoverySessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    """Inicia una nueva sesión de discovery."""
    return await service.create_session(db, workspace_id, current_user.id, data)


@router.get("/sessions", response_model=list[DiscoverySessionRead])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.list_sessions(db, workspace_id)


@router.get("/sessions/{session_id}", response_model=DiscoverySessionRead)
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    session = await service.get_session(db, workspace_id, session_id)
    return DiscoverySessionRead.model_validate(session)


# ── Chat ──────────────────────────────────────────────────────────────────────

@router.post("/sessions/{session_id}/messages", response_model=ChatResponse)
async def send_message(
    session_id: str,
    data: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    """Envía un mensaje al AI assistant y recibe la respuesta."""
    return await service.send_message(
        db, workspace_id, session_id, current_user.id, data
    )


# ── Blueprint ─────────────────────────────────────────────────────────────────

@router.post("/sessions/{session_id}/generate-blueprint", response_model=BlueprintResponse)
async def generate_blueprint(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    """Genera el blueprint de implementación basado en la sesión de discovery."""
    return await service.generate_blueprint(db, workspace_id, session_id)


@router.post("/sessions/{session_id}/apply", response_model=ApplyResult)
async def apply_blueprint(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    """Aplica el blueprint: activa los módulos para el workspace."""
    return await service.apply_blueprint(db, workspace_id, session_id)
