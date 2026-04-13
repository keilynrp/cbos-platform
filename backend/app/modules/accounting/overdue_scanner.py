"""
Overdue invoice scanner — background task that periodically checks for invoices
past their due date and transitions them to 'overdue' status.

Runs as an asyncio task alongside other background services (email notifier,
invoice consumer, workflow consumer).
"""
import asyncio
import logging
from datetime import date

from sqlalchemy import select, and_

from app.core.database import AsyncSessionLocal
from app.events.bus import publish as publish_event
from app.events.types import Event, INVOICE_OVERDUE
from app.modules.accounting.models import Invoice

logger = logging.getLogger(__name__)

# Scan interval in seconds (1 hour)
SCAN_INTERVAL = 3600


async def _scan_overdue_invoices() -> int:
    """
    Find invoices with status in (sent, partial) where due_date < today,
    transition them to 'overdue', and emit an event per invoice.

    Returns the number of invoices transitioned.
    """
    today = date.today()
    transitioned = 0

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Invoice).where(
                and_(
                    Invoice.status.in_(["sent", "partial"]),
                    Invoice.due_date.isnot(None),
                    Invoice.due_date < today,
                )
            )
        )
        invoices = result.scalars().all()

        for inv in invoices:
            inv.status = "overdue"
            transitioned += 1

        if transitioned > 0:
            await db.commit()

        # Emit events after commit (outside the transaction)
        for inv in invoices:
            try:
                await publish_event(Event(
                    event_type=INVOICE_OVERDUE,
                    source_module="accounting",
                    workspace_id=inv.workspace_id,
                    entity_id=inv.id,
                    payload={
                        "invoice_number": inv.invoice_number,
                        "total": inv.total,
                        "amount_due": inv.amount_due,
                        "currency": inv.currency,
                        "due_date": str(inv.due_date),
                    },
                ))
            except Exception as e:
                logger.error(f"Failed to emit INVOICE_OVERDUE for {inv.invoice_number}: {e}")

    return transitioned


async def run_overdue_scanner() -> None:
    """
    Background task: periodically scans for overdue invoices.
    Runs every SCAN_INTERVAL seconds (default: 1 hour).
    """
    logger.info("Overdue invoice scanner starting...")
    while True:
        try:
            count = await _scan_overdue_invoices()
            if count > 0:
                logger.info(f"Overdue scanner: transitioned {count} invoice(s) to overdue")
            else:
                logger.debug("Overdue scanner: no invoices to transition")
        except asyncio.CancelledError:
            logger.info("Overdue invoice scanner cancelled")
            break
        except Exception as e:
            logger.error(f"Overdue scanner error: {e}")

        try:
            await asyncio.sleep(SCAN_INTERVAL)
        except asyncio.CancelledError:
            logger.info("Overdue invoice scanner cancelled during sleep")
            break
