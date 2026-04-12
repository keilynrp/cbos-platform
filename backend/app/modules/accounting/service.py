import logging
from datetime import date, datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.events.bus import publish as publish_event
from app.events.types import (
    Event,
    INVOICE_CREATED,
    INVOICE_SENT,
    INVOICE_PAID,
    PAYMENT_RECORDED,
)
from app.modules.accounting.models import Invoice, InvoiceLine, Payment
from app.modules.accounting.schemas import (
    AccountingSummary,
    InvoiceCreate,
    InvoiceListItem,
    InvoiceRead,
    InvoiceUpdate,
    PaymentCreate,
    PaymentRead,
)

logger = logging.getLogger(__name__)

# ── Numbering ─────────────────────────────────────────────────────────────────

async def _next_invoice_number(db: AsyncSession, workspace_id: str) -> str:
    year = datetime.now().year
    prefix = f"INV-{year}-"
    result = await db.execute(
        select(func.count(Invoice.id)).where(
            Invoice.workspace_id == workspace_id,
            Invoice.invoice_number.like(f"{prefix}%"),
        )
    )
    count = result.scalar() or 0
    return f"{prefix}{count + 1:04d}"


# ── Invoice CRUD ──────────────────────────────────────────────────────────────

async def list_invoices(
    db: AsyncSession,
    workspace_id: str,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[InvoiceListItem]:
    q = select(Invoice).where(Invoice.workspace_id == workspace_id)
    if status:
        q = q.where(Invoice.status == status)
    q = q.order_by(Invoice.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    return [InvoiceListItem.model_validate(inv) for inv in result.scalars().all()]


async def get_invoice(db: AsyncSession, workspace_id: str, invoice_id: str) -> Invoice:
    result = await db.execute(
        select(Invoice)
        .where(Invoice.id == invoice_id, Invoice.workspace_id == workspace_id)
        .options(selectinload(Invoice.lines), selectinload(Invoice.payments))
    )
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(404, detail="Invoice not found")
    return inv


async def create_invoice(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str | None,
    data: InvoiceCreate,
) -> InvoiceRead:
    number = await _next_invoice_number(db, workspace_id)

    inv = Invoice(
        workspace_id=workspace_id,
        invoice_number=number,
        status="draft",
        issue_date=data.issue_date,
        due_date=data.due_date,
        currency=data.currency,
        tax_rate=data.tax_rate,
        discount_amount=data.discount_amount,
        notes=data.notes,
        contact_id=data.contact_id,
        organization_id=data.organization_id,
        sales_order_id=data.sales_order_id,
        owner_id=actor_id,
    )
    db.add(inv)
    await db.flush()

    # Create lines and compute totals
    subtotal = 0.0
    for i, line_data in enumerate(data.lines):
        line_sub = round(line_data.quantity * line_data.unit_price * (1 - line_data.discount_pct / 100), 2)
        line = InvoiceLine(
            invoice_id=inv.id,
            line_order=line_data.line_order or i,
            description=line_data.description,
            quantity=line_data.quantity,
            unit_price=line_data.unit_price,
            discount_pct=line_data.discount_pct,
            subtotal=line_sub,
            product_id=line_data.product_id,
        )
        db.add(line)
        subtotal += line_sub

    inv.subtotal = round(subtotal, 2)
    inv.subtotal -= data.discount_amount
    inv.tax_amount = round(inv.subtotal * data.tax_rate / 100, 2)
    inv.total = round(inv.subtotal + inv.tax_amount, 2)
    inv.amount_due = inv.total

    await db.commit()
    await db.refresh(inv)

    # Reload with relationships
    inv = await get_invoice(db, workspace_id, inv.id)

    await publish_event(Event(
        event_type=INVOICE_CREATED,
        source_module="accounting",
        workspace_id=workspace_id,
        actor_id=actor_id,
        entity_id=inv.id,
        payload={"invoice_number": inv.invoice_number, "total": inv.total, "currency": inv.currency},
    ))

    return InvoiceRead.model_validate(inv)


async def update_invoice(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str | None,
    invoice_id: str,
    data: InvoiceUpdate,
) -> InvoiceRead:
    inv = await get_invoice(db, workspace_id, invoice_id)

    if data.status is not None:
        if inv.status in ("paid", "void"):
            raise HTTPException(409, detail=f"Cannot update a {inv.status} invoice")
        old_status = inv.status
        inv.status = data.status
        if data.status == "sent" and old_status != "sent":
            await publish_event(Event(
                event_type=INVOICE_SENT,
                source_module="accounting",
                workspace_id=workspace_id,
                actor_id=actor_id,
                entity_id=inv.id,
                payload={"invoice_number": inv.invoice_number, "total": inv.total},
            ))

    if data.due_date is not None:
        inv.due_date = data.due_date
    if data.notes is not None:
        inv.notes = data.notes

    await db.commit()
    await db.refresh(inv)
    inv = await get_invoice(db, workspace_id, inv.id)
    return InvoiceRead.model_validate(inv)


async def delete_invoice(db: AsyncSession, workspace_id: str, invoice_id: str) -> None:
    inv = await get_invoice(db, workspace_id, invoice_id)
    if inv.status not in ("draft", "void", "cancelled"):
        raise HTTPException(409, detail="Only draft, void, or cancelled invoices can be deleted")
    await db.delete(inv)
    await db.commit()


# ── Payments ──────────────────────────────────────────────────────────────────

async def record_payment(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str | None,
    invoice_id: str,
    data: PaymentCreate,
) -> PaymentRead:
    inv = await get_invoice(db, workspace_id, invoice_id)

    if inv.status in ("void", "cancelled"):
        raise HTTPException(409, detail=f"Cannot add payment to a {inv.status} invoice")

    if data.amount > inv.amount_due + 0.01:
        raise HTTPException(400, detail=f"Payment amount ({data.amount}) exceeds amount due ({inv.amount_due})")

    payment = Payment(
        workspace_id=workspace_id,
        invoice_id=invoice_id,
        amount=data.amount,
        currency=data.currency,
        method=data.method,
        reference=data.reference,
        notes=data.notes,
        payment_date=data.payment_date,
        recorded_by_id=actor_id,
    )
    db.add(payment)

    inv.amount_paid = round(inv.amount_paid + data.amount, 2)
    inv.amount_due = round(inv.total - inv.amount_paid, 2)

    if inv.amount_due <= 0:
        inv.status = "paid"
        inv.paid_at = datetime.now(timezone.utc)
        await publish_event(Event(
            event_type=INVOICE_PAID,
            source_module="accounting",
            workspace_id=workspace_id,
            actor_id=actor_id,
            entity_id=inv.id,
            payload={"invoice_number": inv.invoice_number, "total": inv.total, "currency": inv.currency},
        ))
    elif inv.amount_paid > 0:
        inv.status = "partial"

    await db.commit()
    await db.refresh(payment)

    await publish_event(Event(
        event_type=PAYMENT_RECORDED,
        source_module="accounting",
        workspace_id=workspace_id,
        actor_id=actor_id,
        entity_id=invoice_id,
        payload={"amount": data.amount, "method": data.method, "invoice_number": inv.invoice_number},
    ))

    return PaymentRead.model_validate(payment)


async def list_payments(
    db: AsyncSession, workspace_id: str, invoice_id: str
) -> list[PaymentRead]:
    inv = await get_invoice(db, workspace_id, invoice_id)
    return [PaymentRead.model_validate(p) for p in inv.payments]


# ── Summary ───────────────────────────────────────────────────────────────────

async def get_summary(db: AsyncSession, workspace_id: str) -> AccountingSummary:
    result = await db.execute(
        select(Invoice).where(Invoice.workspace_id == workspace_id)
    )
    invoices = result.scalars().all()

    today = date.today()
    total_invoiced = sum(i.total for i in invoices if i.status != "void")
    total_paid = sum(i.amount_paid for i in invoices)
    total_outstanding = sum(i.amount_due for i in invoices if i.status not in ("paid", "void", "cancelled"))
    overdue = [i for i in invoices if i.status not in ("paid", "void", "cancelled") and i.due_date and i.due_date < today]

    return AccountingSummary(
        total_invoiced=round(total_invoiced, 2),
        total_paid=round(total_paid, 2),
        total_outstanding=round(total_outstanding, 2),
        overdue_count=len(overdue),
        overdue_amount=round(sum(i.amount_due for i in overdue), 2),
        draft_count=sum(1 for i in invoices if i.status == "draft"),
        sent_count=sum(1 for i in invoices if i.status in ("sent", "partial")),
        paid_count=sum(1 for i in invoices if i.status == "paid"),
    )
