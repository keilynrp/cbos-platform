"""
Auto-invoice consumer — listens for SalesOrderFulfilled events and
automatically creates a draft invoice linked to the order.

Uses Redis Streams with a dedicated consumer group (cbos-invoice) so it
processes events independently of the workflow consumer. Both groups
receive all events; each ACKs independently.

Idempotency: checks if an invoice already exists for the sales_order_id
before creating a new one. Also uses Redis-based event_id dedup (24h TTL).
"""

import asyncio
import json
import logging
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import selectinload
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.events.bus import get_redis
from app.events.types import SALES_ORDER_FULFILLED
from app.modules.sales.models import SalesOrder

logger = logging.getLogger(__name__)

STREAM_KEY = "cbos:events"
CONSUMER_GROUP = "cbos-invoice"
CONSUMER_NAME = "invoice-worker-1"
IDEMPOTENCY_TTL = 86400  # 24 hours

_consumer_task: asyncio.Task | None = None


async def _ensure_group(r) -> None:
    """Create the consumer group if it doesn't exist."""
    try:
        await r.xgroup_create(STREAM_KEY, CONSUMER_GROUP, id="0", mkstream=True)
        logger.info(f"Consumer group '{CONSUMER_GROUP}' created")
    except Exception as e:
        if "BUSYGROUP" in str(e):
            pass  # Group already exists
        else:
            raise


async def _is_duplicate(r, event_id: str) -> bool:
    """Redis-based idempotency: returns True if this event was already processed."""
    key = f"cbos:invoice:processed:{event_id}"
    result = await r.set(key, "1", nx=True, ex=IDEMPOTENCY_TTL)
    return result is None


async def _create_invoice_for_order(session: AsyncSession, event: dict) -> bool:
    """
    Load the SalesOrder, check for existing invoice, create a new one if needed.
    Returns True if invoice was created (or already existed), False on error.
    """
    from app.modules.accounting.models import Invoice, InvoiceLine, Payment
    from app.modules.accounting.service import create_invoice
    from app.modules.accounting.schemas import InvoiceCreate, InvoiceLineCreate

    order_id = event.get("entity_id")
    workspace_id = event.get("workspace_id")
    actor_id = event.get("actor_id")

    if not order_id or not workspace_id:
        logger.warning(f"SalesOrderFulfilled missing entity_id or workspace_id: {event}")
        return True  # ACK to avoid reprocessing bad data

    # Check if invoice already exists for this order (DB-level idempotency)
    existing = (await session.execute(
        select(Invoice).where(
            Invoice.sales_order_id == order_id,
            Invoice.workspace_id == workspace_id,
        )
    )).scalar_one_or_none()

    if existing:
        logger.info(
            f"Invoice {existing.invoice_number} already exists for order {order_id} — skipping"
        )
        return True

    # Load the SalesOrder with lines
    order = (await session.execute(
        select(SalesOrder)
        .options(selectinload(SalesOrder.lines))
        .where(SalesOrder.id == order_id, SalesOrder.workspace_id == workspace_id)
    )).scalar_one_or_none()

    if not order:
        logger.warning(f"SalesOrder {order_id} not found in workspace {workspace_id}")
        return True  # ACK — order might have been deleted

    if order.status != "fulfilled":
        logger.warning(
            f"SalesOrder {order_id} status is '{order.status}', expected 'fulfilled' — skipping"
        )
        return True

    # Transform SalesOrderLines → InvoiceLineCreate
    invoice_lines = [
        InvoiceLineCreate(
            description=line.description,
            quantity=line.quantity,
            unit_price=line.unit_price,
            discount_pct=line.discount_percent,
            product_id=line.product_id,
            line_order=line.line_order,
        )
        for line in sorted(order.lines, key=lambda l: l.line_order)
    ]

    if not invoice_lines:
        logger.warning(f"SalesOrder {order_id} has no lines — cannot create invoice")
        return True

    # Create the invoice
    invoice_data = InvoiceCreate(
        issue_date=date.today(),
        due_date=None,
        currency=order.currency,
        tax_rate=0.0,
        discount_amount=0.0,
        notes=f"Auto-generated from {order.order_number}",
        contact_id=order.contact_id,
        organization_id=order.organization_id,
        sales_order_id=order.id,
        lines=invoice_lines,
    )

    invoice = await create_invoice(session, workspace_id, actor_id, invoice_data)
    logger.info(
        f"Auto-invoice created: {invoice.invoice_number} "
        f"(${invoice.total} {invoice.currency}) for order {order.order_number}"
    )
    return True


async def _process_message(r, session_factory, msg_id: str, data: dict) -> bool:
    """Process a single stream message. Returns True if should ACK."""
    try:
        raw = data.get(b"data") or data.get("data")
        if not raw:
            return True  # Malformed — ACK to discard

        if isinstance(raw, bytes):
            raw = raw.decode()
        event = json.loads(raw)

        event_type = event.get("event_type", "")
        if event_type != SALES_ORDER_FULFILLED:
            return True  # Not our event — ACK

        event_id = event.get("event_id", "")
        if await _is_duplicate(r, event_id):
            logger.debug(f"Duplicate event {event_id} — skipping")
            return True

        logger.info(f"Processing {event_type} for order {event.get('entity_id')}")

        async with session_factory() as session:
            success = await _create_invoice_for_order(session, event)
            if success:
                await session.commit()
            return success

    except Exception as e:
        logger.error(f"Error processing message {msg_id}: {e}", exc_info=True)
        return True  # ACK to avoid infinite retry — log the error


async def run_invoice_consumer() -> None:
    """Main consumer loop — runs until cancellation."""
    logger.info("Invoice consumer starting...")

    # Create a dedicated engine for the consumer (separate from the web app)
    engine = create_async_engine(
        str(settings.DATABASE_URL),
        echo=False,
        poolclass=NullPool,
    )
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    try:
        r = await get_redis()
        await _ensure_group(r)
        logger.info(f"Invoice consumer listening on {STREAM_KEY} (group: {CONSUMER_GROUP})")

        while True:
            try:
                messages = await r.xreadgroup(
                    CONSUMER_GROUP,
                    CONSUMER_NAME,
                    {STREAM_KEY: ">"},
                    count=10,
                    block=2000,
                )

                if not messages:
                    continue

                for stream, entries in messages:
                    for msg_id, data in entries:
                        should_ack = await _process_message(r, session_factory, msg_id, data)
                        if should_ack:
                            await r.xack(STREAM_KEY, CONSUMER_GROUP, msg_id)

            except asyncio.CancelledError:
                raise
            except Exception as e:
                logger.error(f"Invoice consumer error: {e}", exc_info=True)
                await asyncio.sleep(5)  # Back off on error

    except asyncio.CancelledError:
        logger.info("Invoice consumer shutting down")
    finally:
        await engine.dispose()


def start_invoice_consumer() -> None:
    """Launch the invoice consumer as a background task."""
    global _consumer_task
    _consumer_task = asyncio.create_task(
        run_invoice_consumer(), name="invoice-consumer"
    )
    logger.info("Invoice consumer task started")


async def stop_invoice_consumer() -> None:
    """Gracefully cancel the invoice consumer."""
    global _consumer_task
    if _consumer_task and not _consumer_task.done():
        _consumer_task.cancel()
        try:
            await asyncio.wait_for(_consumer_task, timeout=5.0)
        except (asyncio.CancelledError, asyncio.TimeoutError):
            pass
    _consumer_task = None
