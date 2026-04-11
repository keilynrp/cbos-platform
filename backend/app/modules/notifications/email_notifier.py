"""
Email notification service.
Subscribes to Redis pub/sub and sends emails for key business events.
Runs as a background task alongside the WebSocket notification handler.
"""
import asyncio
import json
import logging

from sqlalchemy import select

from app.core.email import (
    send_email,
    low_stock_email,
    quote_accepted_email,
    sales_order_created_email,
    workflow_failed_email,
)
from app.core.database import AsyncSessionLocal
from app.events.bus import get_redis

logger = logging.getLogger(__name__)

# Events that trigger email notifications
EMAIL_NOTIFY_EVENTS = {
    "QuoteAccepted",
    "SalesOrderCreated",
    "WorkflowFailed",
    "InventoryLowThresholdDetected",
}


async def _get_workspace_owner_email(workspace_id: str) -> str | None:
    """Look up the workspace owner's email address."""
    try:
        from app.modules.identity.models import User
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(User.email)
                .where(User.workspace_id == workspace_id)
                .where(User.is_owner == True)  # noqa: E712
                .limit(1)
            )
            return result.scalar_one_or_none()
    except Exception as e:
        logger.error(f"Failed to look up workspace owner email: {e}")
        return None


async def _send_event_email(event: dict) -> None:
    """Build and send email for a specific event type."""
    event_type = event.get("event_type", "")
    workspace_id = event.get("workspace_id", "")
    payload = event.get("payload", {})

    to_email = await _get_workspace_owner_email(workspace_id)
    if not to_email:
        logger.debug(f"No owner email for workspace {workspace_id}, skipping email for {event_type}")
        return

    try:
        if event_type == "QuoteAccepted":
            subject, text, html = quote_accepted_email(
                contact_name="",
                quote_number=payload.get("quote_number", ""),
                total=payload.get("total", 0.0),
                currency=payload.get("currency", "USD"),
                order_number=payload.get("order_number", ""),
            )
        elif event_type == "SalesOrderCreated":
            subject, text, html = sales_order_created_email(
                order_number=payload.get("order_number", ""),
                total=payload.get("total", 0.0),
                currency=payload.get("currency", "USD"),
            )
        elif event_type == "WorkflowFailed":
            subject, text, html = workflow_failed_email(
                workflow_name=payload.get("workflow_name", "Unknown"),
                error=payload.get("error", "Unknown error"),
            )
        elif event_type == "InventoryLowThresholdDetected":
            subject, text, html = low_stock_email(
                product_name=payload.get("product_name", ""),
                sku=payload.get("sku", ""),
                current_stock=payload.get("current_stock", 0),
                min_stock=payload.get("min_stock", 0),
            )
        else:
            return

        await send_email(to=to_email, subject=subject, html_body=html, text_body=text)
        logger.info(f"Email sent for {event_type} to {to_email}")

    except Exception as e:
        logger.error(f"Failed to send email for {event_type}: {e}")


async def run_email_notifier() -> None:
    """
    Background task: subscribes to all workspace notification channels
    and sends emails for EMAIL_NOTIFY_EVENTS.
    Uses the global cbos:notifications:* pub/sub pattern.
    """
    logger.info("Email notifier starting...")
    while True:
        try:
            r = await get_redis()
            pubsub = r.pubsub()
            # Subscribe to all workspace notification channels via pattern
            await pubsub.psubscribe("cbos:notifications:*")
            logger.info("Email notifier subscribed to cbos:notifications:*")

            async for message in pubsub.listen():
                if message["type"] not in ("pmessage", "message"):
                    continue
                try:
                    data = message.get("data", "")
                    event = json.loads(data)
                except Exception:
                    continue

                event_type = event.get("event_type", "")
                if event_type not in EMAIL_NOTIFY_EVENTS:
                    continue

                # Fire-and-forget email — don't block the listener
                asyncio.create_task(_send_event_email(event))

        except asyncio.CancelledError:
            logger.info("Email notifier cancelled")
            break
        except Exception as e:
            logger.error(f"Email notifier error: {e} — reconnecting in 5s")
            await asyncio.sleep(5)
