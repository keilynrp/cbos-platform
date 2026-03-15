from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.events.bus import publish as publish_event
from app.events.types import (
    QUOTE_ACCEPTED,
    QUOTE_CREATED,
    QUOTE_REJECTED,
    QUOTE_SENT,
    SALES_ORDER_CREATED,
    SALES_ORDER_CONFIRMED,
    Event,
)
from app.modules.identity.models import Organization, Person
from app.modules.sales.models import Quote, QuoteLine, SalesOrder
from app.modules.sales.schemas import (
    QuoteCreate,
    QuoteLineCreate,
    QuoteReject,
    QuoteUpdate,
    SalesOrderConfirm,
    SalesOrderCreate,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _calc_line_amount(quantity: float, unit_price: float, discount_percent: float) -> float:
    return round(quantity * unit_price * (1 - discount_percent / 100), 4)


async def _recalculate_totals(db: AsyncSession, quote: Quote) -> None:
    """Recompute subtotal / tax_amount / total from current lines."""
    subtotal = sum(line.amount for line in quote.lines)
    tax_amount = round(subtotal * quote.tax_rate / 100, 4)
    total = round(subtotal - quote.discount_amount + tax_amount, 4)
    quote.subtotal = subtotal
    quote.tax_amount = tax_amount
    quote.total = total


async def _next_quote_number(db: AsyncSession, workspace_id: str) -> str:
    year = datetime.now().year
    result = await db.execute(
        select(func.count(Quote.id)).where(Quote.workspace_id == workspace_id)
    )
    count = (result.scalar() or 0) + 1
    return f"Q-{year}-{count:04d}"


async def _next_order_number(db: AsyncSession, workspace_id: str) -> str:
    year = datetime.now().year
    result = await db.execute(
        select(func.count(SalesOrder.id)).where(SalesOrder.workspace_id == workspace_id)
    )
    count = (result.scalar() or 0) + 1
    return f"SO-{year}-{count:04d}"


async def _load_quote(db: AsyncSession, workspace_id: str, quote_id: str) -> Quote:
    result = await db.execute(
        select(Quote)
        .options(selectinload(Quote.lines))
        .where(Quote.id == quote_id, Quote.workspace_id == workspace_id)
    )
    quote = result.scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return quote


async def _reload_quote(db: AsyncSession, workspace_id: str, quote_id: str) -> Quote:
    """Fresh SELECT after commit — prevents MissingGreenlet on async sessions."""
    return await _load_quote(db, workspace_id, quote_id)


# ── Quotes ────────────────────────────────────────────────────────────────────

async def create_quote(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str,
    data: QuoteCreate,
) -> Quote:
    quote_number = await _next_quote_number(db, workspace_id)

    quote = Quote(
        workspace_id=workspace_id,
        quote_number=quote_number,
        title=data.title,
        opportunity_id=data.opportunity_id,
        contact_id=data.contact_id,
        organization_id=data.organization_id,
        owner_id=data.owner_id or actor_id,
        valid_until=data.valid_until,
        currency=data.currency,
        tax_rate=data.tax_rate,
        discount_amount=data.discount_amount,
        notes=data.notes,
        terms=data.terms,
    )
    db.add(quote)
    await db.flush()

    # Add lines
    for i, line_data in enumerate(data.lines, start=1):
        amount = _calc_line_amount(line_data.quantity, line_data.unit_price, line_data.discount_percent)
        line = QuoteLine(
            workspace_id=workspace_id,
            quote_id=quote.id,
            line_order=line_data.line_order or i,
            description=line_data.description,
            quantity=line_data.quantity,
            unit_price=line_data.unit_price,
            discount_percent=line_data.discount_percent,
            amount=amount,
            product_id=line_data.product_id,
        )
        db.add(line)

    await db.flush()

    # Load lines for total calculation (still inside transaction)
    await db.refresh(quote, attribute_names=["lines"])
    await _recalculate_totals(db, quote)

    await publish_event(Event(
        event_type=QUOTE_CREATED,
        source_module="sales",
        workspace_id=workspace_id,
        actor_id=actor_id,
        entity_id=quote.id,
        payload={
            "quote_number": quote_number,
            "title": quote.title,
            "total": quote.total,
            "currency": quote.currency,
            "opportunity_id": quote.opportunity_id,
        },
    ))

    await db.commit()
    return await _reload_quote(db, workspace_id, quote.id)


async def list_quotes(
    db: AsyncSession,
    workspace_id: str,
    status: str | None = None,
    opportunity_id: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    q = (
        select(Quote)
        .options(selectinload(Quote.lines))
        .where(Quote.workspace_id == workspace_id)
    )
    if status:
        q = q.where(Quote.status == status)
    if opportunity_id:
        q = q.where(Quote.opportunity_id == opportunity_id)
    q = q.order_by(Quote.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    return result.scalars().all()


async def get_quote(db: AsyncSession, workspace_id: str, quote_id: str) -> Quote:
    return await _load_quote(db, workspace_id, quote_id)


async def update_quote(
    db: AsyncSession,
    workspace_id: str,
    quote_id: str,
    data: QuoteUpdate,
) -> Quote:
    quote = await _load_quote(db, workspace_id, quote_id)
    if quote.status not in ("draft",):
        raise HTTPException(status_code=409, detail="Only draft quotes can be edited")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(quote, field, value)

    await _recalculate_totals(db, quote)
    await db.commit()
    return await _reload_quote(db, workspace_id, quote_id)


async def add_line(
    db: AsyncSession,
    workspace_id: str,
    quote_id: str,
    data: QuoteLineCreate,
) -> Quote:
    quote = await _load_quote(db, workspace_id, quote_id)
    if quote.status != "draft":
        raise HTTPException(status_code=409, detail="Only draft quotes can be modified")

    amount = _calc_line_amount(data.quantity, data.unit_price, data.discount_percent)
    line = QuoteLine(
        workspace_id=workspace_id,
        quote_id=quote.id,
        line_order=data.line_order,
        description=data.description,
        quantity=data.quantity,
        unit_price=data.unit_price,
        discount_percent=data.discount_percent,
        amount=amount,
        product_id=data.product_id,
    )
    db.add(line)
    await db.flush()

    await db.refresh(quote, attribute_names=["lines"])
    await _recalculate_totals(db, quote)
    await db.commit()
    return await _reload_quote(db, workspace_id, quote_id)


async def remove_line(
    db: AsyncSession,
    workspace_id: str,
    quote_id: str,
    line_id: str,
) -> Quote:
    quote = await _load_quote(db, workspace_id, quote_id)
    if quote.status != "draft":
        raise HTTPException(status_code=409, detail="Only draft quotes can be modified")

    line = next((l for l in quote.lines if l.id == line_id), None)
    if not line:
        raise HTTPException(status_code=404, detail="Line not found")

    await db.delete(line)
    await db.flush()
    await db.refresh(quote, attribute_names=["lines"])
    await _recalculate_totals(db, quote)
    await db.commit()
    return await _reload_quote(db, workspace_id, quote_id)


async def send_quote(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str,
    quote_id: str,
) -> Quote:
    quote = await _load_quote(db, workspace_id, quote_id)
    if quote.status not in ("draft",):
        raise HTTPException(status_code=409, detail=f"Cannot send a quote in status '{quote.status}'")
    if not quote.lines:
        raise HTTPException(status_code=422, detail="Quote must have at least one line")

    quote.status = "sent"
    quote.sent_at = datetime.now(timezone.utc)

    await publish_event(Event(
        event_type=QUOTE_SENT,
        source_module="sales",
        workspace_id=workspace_id,
        actor_id=actor_id,
        entity_id=quote.id,
        payload={"quote_number": quote.quote_number, "total": quote.total},
    ))

    await db.commit()
    return await _reload_quote(db, workspace_id, quote_id)


async def accept_quote(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str,
    quote_id: str,
) -> tuple[Quote, SalesOrder]:
    quote = await _load_quote(db, workspace_id, quote_id)
    if quote.status not in ("sent", "draft"):
        raise HTTPException(status_code=409, detail=f"Cannot accept a quote in status '{quote.status}'")

    now = datetime.now(timezone.utc)
    quote.status = "accepted"
    quote.accepted_at = now

    # Auto-generate SalesOrder
    order_number = await _next_order_number(db, workspace_id)
    order = SalesOrder(
        workspace_id=workspace_id,
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

    await publish_event(Event(
        event_type=QUOTE_ACCEPTED,
        source_module="sales",
        workspace_id=workspace_id,
        actor_id=actor_id,
        entity_id=quote.id,
        payload={"quote_number": quote.quote_number, "sales_order_id": order.id},
    ))
    await publish_event(Event(
        event_type=SALES_ORDER_CREATED,
        source_module="sales",
        workspace_id=workspace_id,
        actor_id=actor_id,
        entity_id=order.id,
        payload={
            "order_number": order_number,
            "total": order.total,
            "currency": order.currency,
            "quote_id": quote.id,
            "opportunity_id": order.opportunity_id,
            "organization_id": order.organization_id,
        },
    ))

    await db.commit()
    await db.refresh(order)
    quote = await _reload_quote(db, workspace_id, quote_id)
    return quote, order


async def reject_quote(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str,
    quote_id: str,
    data: QuoteReject,
) -> Quote:
    quote = await _load_quote(db, workspace_id, quote_id)
    if quote.status not in ("sent", "draft"):
        raise HTTPException(status_code=409, detail=f"Cannot reject a quote in status '{quote.status}'")

    quote.status = "rejected"
    quote.rejected_at = datetime.now(timezone.utc)
    if data.reason:
        quote.notes = (quote.notes or "") + f"\nRejection reason: {data.reason}"

    await publish_event(Event(
        event_type=QUOTE_REJECTED,
        source_module="sales",
        workspace_id=workspace_id,
        actor_id=actor_id,
        entity_id=quote.id,
        payload={"quote_number": quote.quote_number, "reason": data.reason},
    ))

    await db.commit()
    return await _reload_quote(db, workspace_id, quote_id)


# ── PDF ───────────────────────────────────────────────────────────────────────

async def get_quote_pdf_data(
    db: AsyncSession,
    workspace_id: str,
    quote_id: str,
) -> tuple[Quote, str | None, str | None]:
    """Returns (quote, contact_name, org_name) for PDF generation."""
    quote = await _load_quote(db, workspace_id, quote_id)

    contact_name: str | None = None
    org_name: str | None = None

    if quote.contact_id:
        result = await db.execute(
            select(Person).where(Person.id == quote.contact_id)
        )
        person = result.scalar_one_or_none()
        if person:
            contact_name = person.full_name

    if quote.organization_id:
        result = await db.execute(
            select(Organization).where(Organization.id == quote.organization_id)
        )
        org = result.scalar_one_or_none()
        if org:
            org_name = org.brand_name or org.legal_name

    return quote, contact_name, org_name


# ── Sales Orders ──────────────────────────────────────────────────────────────

async def list_orders(
    db: AsyncSession,
    workspace_id: str,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    q = select(SalesOrder).where(SalesOrder.workspace_id == workspace_id)
    if status:
        q = q.where(SalesOrder.status == status)
    q = q.order_by(SalesOrder.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    return result.scalars().all()


async def get_order(db: AsyncSession, workspace_id: str, order_id: str) -> SalesOrder:
    result = await db.execute(
        select(SalesOrder).where(
            SalesOrder.id == order_id, SalesOrder.workspace_id == workspace_id
        )
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Sales order not found")
    return order


async def confirm_order(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str,
    order_id: str,
    data: SalesOrderConfirm,
) -> SalesOrder:
    order = await get_order(db, workspace_id, order_id)
    if order.status != "draft":
        raise HTTPException(status_code=409, detail="Order is not in draft status")

    order.status = "confirmed"
    order.confirmed_at = datetime.now(timezone.utc)
    if data.notes:
        order.notes = data.notes

    await publish_event(Event(
        event_type=SALES_ORDER_CONFIRMED,
        source_module="sales",
        workspace_id=workspace_id,
        actor_id=actor_id,
        entity_id=order.id,
        payload={"order_number": order.order_number, "total": order.total},
    ))

    await db.commit()
    await db.refresh(order)
    return order
