from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.events.bus import publish as publish_event
from app.events.types import (
    FULFILLMENT_COMPLETED,
    QUOTE_ACCEPTED,
    QUOTE_CREATED,
    QUOTE_REJECTED,
    QUOTE_SENT,
    SALES_ORDER_CANCELLED,
    SALES_ORDER_CONFIRMED,
    SALES_ORDER_CREATED,
    SALES_ORDER_FULFILLED,
    SALES_ORDER_IN_FULFILLMENT,
    Event,
)
from app.core.validators import validate_workspace_ownership
from app.modules.identity.models import Organization, Person, User
from app.modules.sales.models import Quote, QuoteLine, QuoteEvent, SalesOrder, SalesOrderLine
from app.modules.sales.schemas import (
    QuoteCreate,
    QuoteLineCreate,
    QuoteLineUpdate,
    QuoteLineUpsert,
    QuoteReject,
    QuoteUpdate,
    SalesOrderConfirm,
    SalesOrderCreate,
)


# ── State machine ─────────────────────────────────────────────────────────────

_ORDER_TRANSITIONS: dict[str, set[str]] = {
    "draft":          {"confirmed", "cancelled"},
    "confirmed":      {"in_fulfillment", "cancelled"},
    "in_fulfillment": {"fulfilled", "cancelled"},
    "fulfilled":      set(),
    "cancelled":      set(),
}


def _assert_order_transition(current: str, target: str) -> None:
    allowed = _ORDER_TRANSITIONS.get(current, set())
    if target not in allowed:
        terminal = not allowed
        raise HTTPException(
            status_code=422,
            detail=(
                f"Cannot transition order from '{current}' to '{target}'. "
                + ("Terminal state — no further transitions allowed."
                   if terminal
                   else f"Allowed transitions: {sorted(allowed)}")
            ),
        )


# ── Helpers ───────────────────────────────────────────────────────────────────

def _calc_line_amount(
    quantity: float,
    unit_price: float,
    discount_percent: float,
    tax_percent: float = 0.0,
) -> float:
    pretax = quantity * unit_price * (1 - discount_percent / 100)
    return round(pretax * (1 + tax_percent / 100), 4)


async def _recalculate_totals(db: AsyncSession, quote: Quote) -> None:
    lines = quote.lines
    subtotal = round(sum(
        l.quantity * l.unit_price * (1 - l.discount_percent / 100)
        for l in lines
    ), 4)
    tax_amount = round(sum(
        l.quantity * l.unit_price * (1 - l.discount_percent / 100) * l.tax_percent / 100
        for l in lines
    ), 4)
    total = round(subtotal - quote.discount_amount + tax_amount, 4)
    quote.subtotal = subtotal
    quote.tax_amount = tax_amount
    quote.total = total


def _log_event(
    db: AsyncSession,
    workspace_id: str,
    quote_id: str,
    actor_id: str | None,
    event_type: str,
    description: str,
    metadata: dict | None = None,
) -> None:
    db.add(QuoteEvent(
        workspace_id=workspace_id,
        quote_id=quote_id,
        user_id=actor_id,
        event_type=event_type,
        description=description,
        event_metadata=metadata,
    ))


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
    return await _load_quote(db, workspace_id, quote_id)


async def _load_order_with_lines(
    db: AsyncSession, workspace_id: str, order_id: str
) -> SalesOrder:
    result = await db.execute(
        select(SalesOrder)
        .options(selectinload(SalesOrder.lines))
        .where(SalesOrder.id == order_id, SalesOrder.workspace_id == workspace_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Sales order not found")
    return order


# ── Quotes ────────────────────────────────────────────────────────────────────

async def create_quote(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str,
    data: QuoteCreate,
) -> Quote:
    if data.contact_id:
        await validate_workspace_ownership(db, Person, data.contact_id, workspace_id, "contact_id")
    if data.organization_id:
        await validate_workspace_ownership(db, Organization, data.organization_id, workspace_id, "organization_id")
    if data.owner_id:
        await validate_workspace_ownership(db, User, data.owner_id, workspace_id, "owner_id")

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

    for i, line_data in enumerate(data.lines, start=1):
        amount = _calc_line_amount(
            line_data.quantity, line_data.unit_price,
            line_data.discount_percent, line_data.tax_percent,
        )
        line = QuoteLine(
            workspace_id=workspace_id,
            quote_id=quote.id,
            line_order=line_data.line_order or i,
            sku=line_data.sku,
            description=line_data.description,
            unit=line_data.unit,
            quantity=line_data.quantity,
            unit_price=line_data.unit_price,
            discount_percent=line_data.discount_percent,
            tax_percent=line_data.tax_percent,
            notes=line_data.notes,
            amount=amount,
            product_id=line_data.product_id,
        )
        db.add(line)

    await db.flush()
    await db.refresh(quote, attribute_names=["lines"])
    await _recalculate_totals(db, quote)

    _log_event(db, workspace_id, quote.id, actor_id, "created", f"Cotización creada: {quote.quote_number}")

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

    amount = _calc_line_amount(data.quantity, data.unit_price, data.discount_percent, data.tax_percent)
    line = QuoteLine(
        workspace_id=workspace_id,
        quote_id=quote.id,
        line_order=data.line_order,
        sku=data.sku,
        description=data.description,
        unit=data.unit,
        quantity=data.quantity,
        unit_price=data.unit_price,
        discount_percent=data.discount_percent,
        tax_percent=data.tax_percent,
        notes=data.notes,
        amount=amount,
        product_id=data.product_id,
    )
    db.add(line)
    await db.flush()

    await db.refresh(quote, attribute_names=["lines"])
    await _recalculate_totals(db, quote)
    _log_event(db, workspace_id, quote_id, None, "line_added", f"Línea agregada: {data.description}")
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
    _log_event(db, workspace_id, quote_id, None, "line_removed", f"Línea eliminada: {line.description}")
    await db.commit()
    return await _reload_quote(db, workspace_id, quote_id)


async def update_line(
    db: AsyncSession,
    workspace_id: str,
    quote_id: str,
    line_id: str,
    actor_id: str,
    data: QuoteLineUpdate,
) -> Quote:
    quote = await _load_quote(db, workspace_id, quote_id)
    if quote.status != "draft":
        raise HTTPException(status_code=409, detail="Only draft quotes can be modified")

    line = next((l for l in quote.lines if l.id == line_id), None)
    if not line:
        raise HTTPException(status_code=404, detail="Line not found")

    changes = data.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(line, field, value)

    line.amount = _calc_line_amount(line.quantity, line.unit_price, line.discount_percent, line.tax_percent)

    await db.flush()
    await db.refresh(quote, attribute_names=["lines"])
    await _recalculate_totals(db, quote)

    desc_parts = [f"{k}: {v}" for k, v in changes.items()]
    _log_event(
        db, workspace_id, quote_id, actor_id, "line_updated",
        f"Línea modificada — {', '.join(desc_parts)}",
        metadata=changes,
    )

    await db.commit()
    return await _reload_quote(db, workspace_id, quote_id)


async def replace_lines(
    db: AsyncSession,
    workspace_id: str,
    quote_id: str,
    actor_id: str,
    lines_data: list[QuoteLineUpsert],
) -> Quote:
    quote = await _load_quote(db, workspace_id, quote_id)
    if quote.status != "draft":
        raise HTTPException(status_code=409, detail="Only draft quotes can be modified")

    if not lines_data:
        raise HTTPException(status_code=422, detail="Quote must have at least one line")

    incoming_ids = [d.id for d in lines_data if d.id]
    if len(incoming_ids) != len(set(incoming_ids)):
        raise HTTPException(status_code=422, detail="Duplicate line IDs in payload")
    incoming_ids_set = set(incoming_ids)

    # Delete lines not in payload
    for line in list(quote.lines):
        if line.id not in incoming_ids_set:
            await db.delete(line)

    await db.flush()
    await db.refresh(quote, attribute_names=["lines"])

    existing_by_id = {l.id: l for l in quote.lines}

    for i, ld in enumerate(lines_data, start=1):
        amount = _calc_line_amount(ld.quantity, ld.unit_price, ld.discount_percent, ld.tax_percent)
        if ld.id and ld.id in existing_by_id:
            line = existing_by_id[ld.id]
            line.line_order = ld.line_order or i
            line.sku = ld.sku
            line.description = ld.description
            line.unit = ld.unit
            line.quantity = ld.quantity
            line.unit_price = ld.unit_price
            line.discount_percent = ld.discount_percent
            line.tax_percent = ld.tax_percent
            line.notes = ld.notes
            line.product_id = ld.product_id
            line.amount = amount
        else:
            db.add(QuoteLine(
                workspace_id=workspace_id,
                quote_id=quote_id,
                line_order=ld.line_order or i,
                sku=ld.sku,
                description=ld.description,
                unit=ld.unit,
                quantity=ld.quantity,
                unit_price=ld.unit_price,
                discount_percent=ld.discount_percent,
                tax_percent=ld.tax_percent,
                notes=ld.notes,
                product_id=ld.product_id,
                amount=amount,
            ))

    await db.flush()
    await db.refresh(quote, attribute_names=["lines"])
    await _recalculate_totals(db, quote)
    _log_event(db, workspace_id, quote_id, actor_id, "updated", "Líneas actualizadas (batch)")

    await db.commit()
    return await _reload_quote(db, workspace_id, quote_id)


async def get_history(
    db: AsyncSession,
    workspace_id: str,
    quote_id: str,
) -> list[QuoteEvent]:
    await _load_quote(db, workspace_id, quote_id)  # 404 if not found / wrong workspace
    result = await db.execute(
        select(QuoteEvent)
        .where(QuoteEvent.workspace_id == workspace_id, QuoteEvent.quote_id == quote_id)
        .order_by(QuoteEvent.created_at.desc())
    )
    return result.scalars().all()


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
    _log_event(db, workspace_id, quote_id, actor_id, "sent", "Cotización enviada")

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
    _log_event(db, workspace_id, quote_id, actor_id, "accepted", "Cotización aceptada — orden de venta creada")

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
        status="draft",
    )
    db.add(order)
    await db.flush()

    # Copy QuoteLines → SalesOrderLines
    for ql in quote.lines:
        db.add(SalesOrderLine(
            workspace_id=workspace_id,
            order_id=order.id,
            line_order=ql.line_order,
            description=ql.description,
            quantity=ql.quantity,
            unit_price=ql.unit_price,
            discount_percent=ql.discount_percent,
            amount=ql.amount,
            product_id=ql.product_id,
        ))

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
    order = await _load_order_with_lines(db, workspace_id, order.id)
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
    _log_event(db, workspace_id, quote_id, actor_id, "rejected", f"Cotización rechazada. Razón: {data.reason or '—'}")
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
    quote = await _load_quote(db, workspace_id, quote_id)

    contact_name: str | None = None
    org_name: str | None = None

    if quote.contact_id:
        result = await db.execute(select(Person).where(Person.id == quote.contact_id))
        person = result.scalar_one_or_none()
        if person:
            contact_name = person.full_name

    if quote.organization_id:
        result = await db.execute(select(Organization).where(Organization.id == quote.organization_id))
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
    q = (
        select(SalesOrder)
        .options(selectinload(SalesOrder.lines))
        .where(SalesOrder.workspace_id == workspace_id)
    )
    if status:
        q = q.where(SalesOrder.status == status)
    q = q.order_by(SalesOrder.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    return result.scalars().all()


async def get_order(db: AsyncSession, workspace_id: str, order_id: str) -> SalesOrder:
    return await _load_order_with_lines(db, workspace_id, order_id)


async def confirm_order(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str,
    order_id: str,
    data: SalesOrderConfirm,
) -> SalesOrder:
    order = await _load_order_with_lines(db, workspace_id, order_id)
    _assert_order_transition(order.status, "confirmed")

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
    return await _load_order_with_lines(db, workspace_id, order_id)


async def start_fulfillment(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str,
    order_id: str,
) -> SalesOrder:
    order = await _load_order_with_lines(db, workspace_id, order_id)
    _assert_order_transition(order.status, "in_fulfillment")
    order.status = "in_fulfillment"

    await publish_event(Event(
        event_type=SALES_ORDER_IN_FULFILLMENT,
        source_module="sales",
        workspace_id=workspace_id,
        actor_id=actor_id,
        entity_id=order.id,
        payload={"order_number": order.order_number, "total": order.total},
    ))

    await db.commit()
    return await _load_order_with_lines(db, workspace_id, order_id)


async def fulfill_order(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str,
    order_id: str,
) -> SalesOrder:
    order = await _load_order_with_lines(db, workspace_id, order_id)
    _assert_order_transition(order.status, "fulfilled")

    order.status = "fulfilled"
    order.fulfilled_at = datetime.now(timezone.utc)

    # Consume reserved stock for all lines that have a product_id
    from app.modules.sales.inventory_gateway import consume_for_order
    await consume_for_order(db, workspace_id, actor_id, order_id)

    await publish_event(Event(
        event_type=SALES_ORDER_FULFILLED,
        source_module="sales",
        workspace_id=workspace_id,
        actor_id=actor_id,
        entity_id=order.id,
        payload={"order_number": order.order_number, "total": order.total},
    ))
    await publish_event(Event(
        event_type=FULFILLMENT_COMPLETED,
        source_module="sales",
        workspace_id=workspace_id,
        actor_id=actor_id,
        entity_id=order.id,
        payload={
            "order_number": order.order_number,
            "order_id": order.id,
            "organization_id": order.organization_id,
        },
    ))

    await db.commit()
    return await _load_order_with_lines(db, workspace_id, order_id)


async def cancel_order(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str,
    order_id: str,
) -> SalesOrder:
    order = await _load_order_with_lines(db, workspace_id, order_id)
    _assert_order_transition(order.status, "cancelled")

    order.status = "cancelled"
    order.cancelled_at = datetime.now(timezone.utc)

    # Release any inventory reservations tied to this order
    from app.modules.sales.inventory_gateway import release_for_order
    await release_for_order(db, workspace_id, actor_id, order_id)

    await publish_event(Event(
        event_type=SALES_ORDER_CANCELLED,
        source_module="sales",
        workspace_id=workspace_id,
        actor_id=actor_id,
        entity_id=order.id,
        payload={"order_number": order.order_number, "total": order.total},
    ))

    await db.commit()
    return await _load_order_with_lines(db, workspace_id, order_id)
