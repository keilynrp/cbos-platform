from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_workspace_id
from app.modules.identity.models import User
from app.modules.portal import service
from app.modules.portal.schemas import (
    PortalAccept,
    PortalActionResult,
    PortalOrderView,
    PortalQuoteView,
    PortalReject,
    PortalSessionCreate,
    PortalSessionRead,
)

# ── Internal router (JWT required) ───────────────────────────────────────────
router = APIRouter(prefix="/portal", tags=["Portal Builder"])

# ── Public router (no auth — token-based) ────────────────────────────────────
public_router = APIRouter(prefix="/portal", tags=["Portal — Public"])


# ── Internal endpoints ────────────────────────────────────────────────────────

@router.post("/sessions", response_model=PortalSessionRead, status_code=201)
async def create_session(
    data: PortalSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    """Create a portal access session for a quote. Returns the shareable URL."""
    return await service.create_session(db, workspace_id, current_user.id, data)


@router.post("/sessions/{session_id}/send-email", status_code=200)
async def send_email(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    """Send the portal link to the client's email (SMTP or dev-mode log)."""
    sent = await service.send_session_email(db, workspace_id, session_id)
    return {"sent": sent, "message": "Email sent" if sent else "Email failed"}


@router.get("/sessions", response_model=list[PortalSessionRead])
async def list_sessions(
    quote_id: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.list_sessions(db, workspace_id, quote_id)


# ── Public endpoints (no JWT — token in path) ─────────────────────────────────

@public_router.get("/quote/{token}", response_model=PortalQuoteView)
async def get_portal_quote(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Public: customer views their quote via portal token."""
    return await service.get_portal_quote(db, token)


@public_router.post("/quote/{token}/accept", response_model=PortalActionResult)
async def accept_quote(
    token: str,
    data: PortalAccept,
    db: AsyncSession = Depends(get_db),
):
    """Public: customer accepts the quote from the portal."""
    return await service.portal_accept(db, token, data)


@public_router.post("/quote/{token}/reject", response_model=PortalActionResult)
async def reject_quote(
    token: str,
    data: PortalReject,
    db: AsyncSession = Depends(get_db),
):
    """Public: customer rejects the quote from the portal."""
    return await service.portal_reject(db, token, data)


@public_router.get("/order/{token}", response_model=PortalOrderView)
async def get_portal_order(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Public: customer checks their order status via portal token."""
    return await service.get_portal_order(db, token)
