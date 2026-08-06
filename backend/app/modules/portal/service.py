import logging
import secrets
from datetime import datetime, timedelta, timezone

from app.core.exceptions import CBOSException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.email import (
    client_confirmation_email,
    quote_portal_email,
    seller_accept_email,
    seller_reject_email,
    send_email,
)
from app.events.bus import publish as publish_event
from app.events.types import (
    CUSTOMER_ACTION_PERFORMED,
    PORTAL_SESSION_ACCESSED,
    PORTAL_SESSION_CREATED,
    QUOTE_ACCEPTED,
    QUOTE_REJECTED,
    SALES_ORDER_CREATED,
    Event,
)
from app.modules.identity.models import Organization, Person, User, Workspace
from app.modules.portal.models import PortalSession
from app.modules.portal.schemas import (
    PortalAccept,
    PortalActionResult,
    PortalOrderView,
    PortalQuoteLine,
    PortalQuoteView,
    PortalReject,
    PortalSessionCreate,
    PortalSessionRead,
)
from app.modules.sales.models import Quote, QuoteLine, SalesOrder
from app.modules.sales.service import _next_order_number

logger = logging.getLogger(__name__)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _portal_url(token: str) -> str:
    return f"{settings.portal_base_url}/portal/{token}"


async def _load_session(db: AsyncSession, token: str) -> PortalSession:
    result = await db.execute(
        select(PortalSession).where(PortalSession.token == token)
    )
    session = result.scalar_one_or_none()
    if not session:
        # Sin detail a proposito: aqui la sesion se busca por token, y el token
        # es la credencial de acceso al portal. Devolverlo en el cuerpo lo
        # sembraria en logs de cliente y trazas de error.
        raise CBOSException(
            status_code=404,
            code="PORTAL_SESSION_NOT_FOUND",
            message="Portal session not found.",
        )
    if datetime.now(timezone.utc) > session.expires_at:
        raise CBOSException(
            status_code=410,
            code="PORTAL_LINK_EXPIRED",
            message="Portal link has expired.",
            detail={"expires_at": session.expires_at.isoformat()},
        )
    return session


async def _load_quote_with_lines(db: AsyncSession, quote_id: str) -> Quote:
    result = await db.execute(
        select(Quote)
        .options(selectinload(Quote.lines))
        .where(Quote.id == quote_id)
    )
    quote = result.scalar_one_or_none()
    if not quote:
        raise CBOSException(
            status_code=404,
            code="PORTAL_QUOTE_NOT_FOUND",
            message="Quote not found.",
            detail={"id": quote_id},
        )
    return quote


async def _get_workspace_name(db: AsyncSession, workspace_id: str) -> str:
    result = await db.execute(
        select(Workspace.name).where(Workspace.id == workspace_id)
    )
    return result.scalar_one_or_none() or workspace_id


async def _get_names(
    db: AsyncSession, contact_id: str | None, org_id: str | None
) -> tuple[str | None, str | None]:
    contact_name: str | None = None
    org_name: str | None = None
    if contact_id:
        r = await db.execute(select(Person.full_name).where(Person.id == contact_id))
        contact_name = r.scalar_one_or_none()
    if org_id:
        r = await db.execute(
            select(Organization.brand_name, Organization.legal_name)
            .where(Organization.id == org_id)
        )
        row = r.one_or_none()
        if row:
            org_name = row[0] or row[1]
    return contact_name, org_name


# ── Session management (internal) ────────────────────────────────────────────

async def create_session(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str,
    data: PortalSessionCreate,
) -> PortalSessionRead:
    # Validate quote belongs to workspace
    result = await db.execute(
        select(Quote).where(Quote.id == data.quote_id, Quote.workspace_id == workspace_id)
    )
    quote = result.scalar_one_or_none()
    if not quote:
        raise CBOSException(
            status_code=404,
            code="PORTAL_QUOTE_NOT_FOUND",
            message="Quote not found.",
            detail={"id": data.quote_id},
        )
    if quote.status not in ("draft", "sent"):
        raise CBOSException(
            status_code=409,
            code="PORTAL_QUOTE_NOT_SHAREABLE",
            message=f"Cannot create portal session for quote in status '{quote.status}'.",
            detail={"status": quote.status},
        )

    expire_hours = data.expire_hours or settings.portal_token_expire_hours
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=expire_hours)

    session = PortalSession(
        workspace_id=workspace_id,
        quote_id=data.quote_id,
        token=token,
        expires_at=expires_at,
        client_name=data.client_name,
        client_email=data.client_email,
        created_by_id=actor_id,
    )
    db.add(session)

    await db.commit()
    await db.refresh(session)

    await publish_event(Event(
        event_type=PORTAL_SESSION_CREATED,
        source_module="portal",
        workspace_id=session.workspace_id,
        entity_id=session.id,
        actor_id=session.created_by_id,
        payload={
            "quote_id": session.quote_id,
            "token": session.token,
            "expires_at": session.expires_at.isoformat(),
            "client_email": session.client_email,
        },
    ))

    return PortalSessionRead(
        **{c: getattr(session, c) for c in [
            "id", "workspace_id", "quote_id", "token", "expires_at",
            "accessed_at", "completed_at", "action",
            "client_name", "client_email", "created_by_id", "created_at",
        ]},
        portal_url=_portal_url(session.token),
    )


async def send_session_email(
    db: AsyncSession,
    workspace_id: str,
    session_id: str,
) -> bool:
    """Send the portal link email to the client. Returns True if sent/logged."""
    result = await db.execute(
        select(PortalSession).where(
            PortalSession.id == session_id,
            PortalSession.workspace_id == workspace_id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise CBOSException(
            status_code=404,
            code="PORTAL_SESSION_NOT_FOUND",
            message="Portal session not found.",
            detail={"id": session_id},
        )
    if not session.client_email:
        raise CBOSException(
            status_code=422,
            code="PORTAL_SESSION_NO_CLIENT_EMAIL",
            message="Session has no client_email set.",
            detail={"id": session_id},
        )

    quote = await _load_quote_with_lines(db, session.quote_id)
    workspace_name = await _get_workspace_name(db, workspace_id)
    contact_name, _ = await _get_names(db, quote.contact_id, None)
    name = session.client_name or contact_name

    subject, text_body, html_body = quote_portal_email(
        contact_name=name,
        workspace_name=workspace_name,
        quote_number=quote.quote_number,
        total=quote.total,
        currency=quote.currency,
        valid_until=quote.valid_until,
        portal_url=_portal_url(session.token),
    )

    return await send_email(session.client_email, subject, html_body, text_body)


async def list_sessions(
    db: AsyncSession, workspace_id: str, quote_id: str | None = None
) -> list[PortalSessionRead]:
    q = select(PortalSession).where(PortalSession.workspace_id == workspace_id)
    if quote_id:
        q = q.where(PortalSession.quote_id == quote_id)
    q = q.order_by(PortalSession.created_at.desc())
    result = await db.execute(q)
    sessions = result.scalars().all()
    return [
        PortalSessionRead(
            **{c: getattr(s, c) for c in [
                "id", "workspace_id", "quote_id", "token", "expires_at",
                "accessed_at", "completed_at", "action",
                "client_name", "client_email", "created_by_id", "created_at",
            ]},
            portal_url=_portal_url(s.token),
        )
        for s in sessions
    ]


# ── Public portal views ───────────────────────────────────────────────────────

async def get_portal_quote(
    db: AsyncSession, token: str
) -> PortalQuoteView:
    """Public endpoint — validate token, return customer-safe quote view."""
    session = await _load_session(db, token)
    quote = await _load_quote_with_lines(db, session.quote_id)

    # Mark first access
    if not session.accessed_at:
        session.accessed_at = datetime.now(timezone.utc)
        await publish_event(Event(
            event_type=PORTAL_SESSION_ACCESSED,
            source_module="portal",
            workspace_id=session.workspace_id,
            entity_id=quote.id,
            payload={"token": token[:8] + "...", "quote_number": quote.quote_number},
        ))
        await db.commit()

    workspace_name = await _get_workspace_name(db, session.workspace_id)
    contact_name, org_name = await _get_names(db, quote.contact_id, quote.organization_id)

    return PortalQuoteView(
        quote_number=quote.quote_number,
        title=quote.title,
        status=quote.status,
        valid_until=quote.valid_until,
        currency=quote.currency,
        subtotal=quote.subtotal,
        discount_amount=quote.discount_amount,
        tax_rate=quote.tax_rate,
        tax_amount=quote.tax_amount,
        total=quote.total,
        notes=quote.notes,
        terms=quote.terms,
        lines=[
            PortalQuoteLine(
                description=line.description,
                quantity=line.quantity,
                unit_price=line.unit_price,
                discount_percent=line.discount_percent,
                amount=line.amount,
            )
            for line in quote.lines
        ],
        workspace_name=workspace_name,
        org_name=org_name,
        contact_name=contact_name,
        can_accept=quote.status in ("sent", "draft") and not session.action,
        session_expires_at=session.expires_at,
        already_acted=session.action is not None,
    )


async def portal_accept(
    db: AsyncSession, token: str, data: PortalAccept
) -> PortalActionResult:
    session = await _load_session(db, token)

    if session.action:
        return PortalActionResult(
            success=False,
            action=session.action,
            message=f"Ya realizaste una acción ({session.action}) en esta cotización.",
        )

    quote = await _load_quote_with_lines(db, session.quote_id)
    if quote.status not in ("sent", "draft"):
        raise CBOSException(
            status_code=409,
            code="PORTAL_QUOTE_ACCEPT_INVALID_STATUS",
            message=f"Quote cannot be accepted in status '{quote.status}'.",
            detail={"status": quote.status},
        )

    now = datetime.now(timezone.utc)

    # Accept the quote
    quote.status = "accepted"
    quote.accepted_at = now

    # Create SalesOrder
    order_number = await _next_order_number(db, session.workspace_id)
    order = SalesOrder(
        workspace_id=session.workspace_id,
        order_number=order_number,
        quote_id=quote.id,
        opportunity_id=quote.opportunity_id,
        contact_id=quote.contact_id,
        organization_id=quote.organization_id,
        owner_id=quote.owner_id,
        total=quote.total,
        currency=quote.currency,
        status="confirmed",
        confirmed_at=now,
    )
    db.add(order)
    await db.flush()

    # Update session
    session.completed_at = now
    session.action = "accepted"
    if data.client_name:
        session.client_name = data.client_name
    if data.client_email:
        session.client_email = str(data.client_email)
    if data.client_notes:
        session.client_notes = data.client_notes

    await publish_event(Event(
        event_type=QUOTE_ACCEPTED,
        source_module="portal",
        workspace_id=session.workspace_id,
        entity_id=quote.id,
        payload={
            "quote_number": quote.quote_number,
            "sales_order_id": order.id,
            "via": "customer_portal",
            "client_name": data.client_name,
            "client_email": str(data.client_email) if data.client_email else None,
        },
    ))
    await publish_event(Event(
        event_type=SALES_ORDER_CREATED,
        source_module="portal",
        workspace_id=session.workspace_id,
        entity_id=order.id,
        payload={
            "order_number": order_number,
            "total": order.total,
            "currency": order.currency,
            "quote_id": quote.id,
            "via": "customer_portal",
        },
    ))
    await publish_event(Event(
        event_type=CUSTOMER_ACTION_PERFORMED,
        source_module="portal",
        workspace_id=session.workspace_id,
        entity_id=session.id,
        payload={
            "action": "accepted",
            "quote_number": quote.quote_number,
            "order_number": order_number,
            "client_name": data.client_name,
        },
    ))

    await db.commit()

    # Email notifications — non-blocking, log on failure
    workspace_name = await _get_workspace_name(db, session.workspace_id)
    creator = await db.get(User, session.created_by_id)
    seller_email = creator.email if creator else None

    if seller_email:
        subj, text, html = seller_accept_email(
            client_name=data.client_name or session.client_name or "Cliente",
            workspace_name=workspace_name,
            quote_number=quote.quote_number,
            order_number=order_number,
            total=quote.total,
            currency=quote.currency,
        )
        try:
            await send_email(seller_email, subj, html, text)
        except Exception as exc:
            logger.warning("Seller accept email failed: %s", exc)

    client_email_addr = (
        str(data.client_email) if data.client_email else session.client_email
    )
    if client_email_addr:
        subj, text, html = client_confirmation_email(
            workspace_name=workspace_name,
            quote_number=quote.quote_number,
            order_number=order_number,
        )
        try:
            await send_email(client_email_addr, subj, html, text)
        except Exception as exc:
            logger.warning("Client confirmation email failed: %s", exc)

    # Best-effort auto-reserve through the Sales→Inventory gateway boundary.
    lines_with_product = [l for l in quote.lines if l.product_id]
    if lines_with_product:
        from app.modules.sales.inventory_gateway import reserve_for_order

        result = await reserve_for_order(
            db,
            session.workspace_id,
            session.created_by_id or "",
            order.id,
            [
                {"product_id": line.product_id, "quantity": line.quantity}
                for line in lines_with_product
            ],
        )
        if result.get("partial"):
            logger.warning(
                "Portal auto-reserve partial for order %s: %s",
                order.id,
                result,
            )

    return PortalActionResult(
        success=True,
        action="accepted",
        message="Cotización aceptada. Tu orden de compra ha sido creada.",
        order_number=order_number,
    )


async def portal_reject(
    db: AsyncSession, token: str, data: PortalReject
) -> PortalActionResult:
    session = await _load_session(db, token)

    if session.action:
        return PortalActionResult(
            success=False,
            action=session.action,
            message=f"Ya realizaste una acción ({session.action}) en esta cotización.",
        )

    quote = await _load_quote_with_lines(db, session.quote_id)
    if quote.status not in ("sent", "draft"):
        raise CBOSException(
            status_code=409,
            code="PORTAL_QUOTE_REJECT_INVALID_STATUS",
            message=f"Quote cannot be rejected in status '{quote.status}'.",
            detail={"status": quote.status},
        )

    now = datetime.now(timezone.utc)
    quote.status = "rejected"
    quote.rejected_at = now
    if data.reason:
        quote.notes = (quote.notes or "") + f"\n[Portal] Razón de rechazo: {data.reason}"

    session.completed_at = now
    session.action = "rejected"
    if data.client_name:
        session.client_name = data.client_name
    if data.client_email:
        session.client_email = str(data.client_email)

    await publish_event(Event(
        event_type=QUOTE_REJECTED,
        source_module="portal",
        workspace_id=session.workspace_id,
        entity_id=quote.id,
        payload={
            "quote_number": quote.quote_number,
            "via": "customer_portal",
            "reason": data.reason,
        },
    ))
    await publish_event(Event(
        event_type=CUSTOMER_ACTION_PERFORMED,
        source_module="portal",
        workspace_id=session.workspace_id,
        entity_id=session.id,
        payload={"action": "rejected", "quote_number": quote.quote_number, "reason": data.reason},
    ))

    await db.commit()

    # Seller notification — non-blocking
    workspace_name = await _get_workspace_name(db, session.workspace_id)
    creator = await db.get(User, session.created_by_id)
    seller_email = creator.email if creator else None

    if seller_email:
        subj, text, html = seller_reject_email(
            client_name=data.client_name or session.client_name or "Cliente",
            workspace_name=workspace_name,
            quote_number=quote.quote_number,
            reason=data.reason,
        )
        try:
            await send_email(seller_email, subj, html, text)
        except Exception as exc:
            logger.warning("Seller reject email failed: %s", exc)

    return PortalActionResult(
        success=True,
        action="rejected",
        message="Cotización rechazada. Hemos notificado al equipo.",
    )


async def get_portal_order(
    db: AsyncSession, token: str
) -> PortalOrderView:
    """Customer checks their order status via portal token."""
    session = await _load_session(db, token)

    result = await db.execute(
        select(SalesOrder).where(SalesOrder.quote_id == session.quote_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise CBOSException(
            status_code=404,
            code="PORTAL_ORDER_NOT_FOUND",
            message="No order found. The quote may not have been accepted yet.",
        )

    workspace_name = await _get_workspace_name(db, session.workspace_id)
    _, org_name = await _get_names(db, None, order.organization_id)

    return PortalOrderView(
        order_number=order.order_number,
        status=order.status,
        total=order.total,
        currency=order.currency,
        confirmed_at=order.confirmed_at,
        fulfilled_at=order.fulfilled_at,
        workspace_name=workspace_name,
        org_name=org_name,
    )
