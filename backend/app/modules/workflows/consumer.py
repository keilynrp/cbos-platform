"""
Workflow Event Consumer
Lee eventos del Redis Stream y dispara workflows matching.
Se ejecuta como tarea asyncio en background desde el lifespan de FastAPI.

Reliability features:
- Idempotency: event_id deduplication via Redis key with 24h TTL
- Poison pill: invalid JSON/schema → DLQ + ACK (never blocks the pipeline)
- Dead letter queue: messages exceeding MAX_RETRIES → DLQ stream
- PEL reclaim: orphaned messages (>30s unacked) are reclaimed and retried
"""

import asyncio
import logging

import redis.asyncio as aioredis
from pydantic import ValidationError

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.events.bus import CONSUMER_GROUP, STREAM_KEY
from app.events.types import Event
from app.modules.workflows.service import dispatch_event

logger = logging.getLogger(__name__)

CONSUMER_NAME = "workflow-engine"
BLOCK_MS = 2000            # max wait for new messages
MAX_RETRIES = 3            # deliveries before moving to DLQ
DLQ_STREAM = "cbos:events:dlq"
IDEMPOTENCY_TTL = 86400    # 24 h in seconds
PEL_CLAIM_IDLE_MS = 30_000 # reclaim messages idle > 30s


async def _ensure_group(r: aioredis.Redis) -> None:
    """Creates the consumer group if it doesn't exist."""
    try:
        await r.xgroup_create(STREAM_KEY, CONSUMER_GROUP, id="0", mkstream=True)
        logger.info("consumer_group_created", extra={"stream": STREAM_KEY, "group": CONSUMER_GROUP})
    except Exception as e:
        if "BUSYGROUP" not in str(e):
            logger.warning("xgroup_create error: %s", e)


async def _is_duplicate(r: aioredis.Redis, event_id: str) -> bool:
    """Returns True if this event_id was already processed (idempotency check)."""
    key = f"cbos:processed:{event_id}"
    # SET NX EX — returns True only if the key was newly set
    result = await r.set(key, "1", nx=True, ex=IDEMPOTENCY_TTL)
    return result is None  # None means key already existed


async def _move_to_dlq(r: aioredis.Redis, msg_id: str, raw: str, error: str) -> None:
    """Moves a message to the Dead Letter Queue stream."""
    await r.xadd(DLQ_STREAM, {"msg_id": msg_id, "data": raw, "error": error})
    logger.error(
        "message_moved_to_dlq",
        extra={"msg_id": msg_id, "error": error},
    )


async def _get_delivery_count(r: aioredis.Redis, msg_id: str) -> int:
    """Returns the number of times a message has been delivered."""
    try:
        pending = await r.xpending_range(STREAM_KEY, CONSUMER_GROUP, msg_id, msg_id, 1)
        if pending:
            return pending[0].get("times_delivered", 1)
    except Exception:
        pass
    return 1


async def _process_message(r: aioredis.Redis, msg_id: str, data: dict) -> bool:
    """
    Parses and dispatches a single stream message.
    Returns True if the message should be ACKed, False if it should stay in PEL.
    """
    raw = data.get("data", "{}")

    # Poison pill: invalid JSON or schema → DLQ + ACK
    try:
        event = Event.model_validate_json(raw)
    except (ValidationError, Exception) as e:
        await _move_to_dlq(r, msg_id, raw, f"parse_error: {e}")
        return True  # ACK to unblock pipeline

    # Idempotency check
    if await _is_duplicate(r, event.event_id):
        logger.info(
            "event_skipped_duplicate",
            extra={"event_id": event.event_id, "event_type": event.event_type},
        )
        return True  # ACK — already processed

    # Check delivery count — if exceeded, move to DLQ
    delivery_count = await _get_delivery_count(r, msg_id)
    if delivery_count > MAX_RETRIES:
        await _move_to_dlq(r, msg_id, raw, f"max_retries_exceeded: {delivery_count} deliveries")
        return True  # ACK

    # Dispatch
    try:
        async with AsyncSessionLocal() as db:
            await dispatch_event(db, event)
        logger.info(
            "event_dispatched",
            extra={
                "event_id": event.event_id,
                "event_type": event.event_type,
                "workspace_id": event.workspace_id,
            },
        )
        return True  # ACK after successful dispatch
    except Exception as e:
        logger.error(
            "dispatch_error",
            extra={
                "event_id": event.event_id,
                "event_type": event.event_type,
                "error": str(e),
                "delivery_count": delivery_count,
            },
        )
        return False  # No ACK — stays in PEL for retry


async def _reclaim_pending(r: aioredis.Redis) -> None:
    """Reclaims messages idle > PEL_CLAIM_IDLE_MS that were left unacked by this consumer."""
    try:
        claimed = await r.xautoclaim(
            STREAM_KEY,
            CONSUMER_GROUP,
            CONSUMER_NAME,
            min_idle_time=PEL_CLAIM_IDLE_MS,
            start_id="0",
            count=10,
        )
        # xautoclaim returns (next_start_id, entries, deleted_ids)
        entries = claimed[1] if isinstance(claimed, (list, tuple)) and len(claimed) > 1 else []
        if entries:
            logger.info("reclaimed_pending_messages", extra={"count": len(entries)})
            for msg_id, data in entries:
                should_ack = await _process_message(r, msg_id, data)
                if should_ack:
                    await r.xack(STREAM_KEY, CONSUMER_GROUP, msg_id)
    except Exception as e:
        logger.warning("reclaim_pending_error: %s", e)


async def run_consumer() -> None:
    """Main consumer loop. Runs until cancellation."""
    logger.info("WorkflowConsumer starting...")
    r: aioredis.Redis | None = None
    iteration = 0

    while True:
        try:
            if r is None:
                r = aioredis.from_url(settings.redis_url, decode_responses=True)
                await _ensure_group(r)
                logger.info("WorkflowConsumer connected to Redis")

            # Periodically reclaim orphaned PEL messages (every 30 iterations ≈ 60s)
            iteration += 1
            if iteration % 30 == 0:
                await _reclaim_pending(r)

            # Read new messages (">": only new since last ack)
            messages = await r.xreadgroup(
                CONSUMER_GROUP,
                CONSUMER_NAME,
                {STREAM_KEY: ">"},
                count=10,
                block=BLOCK_MS,
            )

            if not messages:
                continue

            stream_name, entries = messages[0]
            for msg_id, data in entries:
                try:
                    should_ack = await _process_message(r, msg_id, data)
                    if should_ack:
                        await r.xack(STREAM_KEY, CONSUMER_GROUP, msg_id)
                except Exception as e:
                    logger.error("Unhandled error processing message %s: %s", msg_id, e)
                    # No ACK — stays in PEL

        except asyncio.CancelledError:
            logger.info("WorkflowConsumer cancelled, shutting down")
            break
        except Exception as e:
            logger.error("WorkflowConsumer error: %s — reconnecting in 5s", e)
            if r:
                try:
                    await r.aclose()
                except Exception:
                    pass
                r = None
            await asyncio.sleep(5)

    if r:
        await r.aclose()
    logger.info("WorkflowConsumer stopped")


# ── Lifecycle helpers for FastAPI lifespan ────────────────────────────────────

_consumer_task: asyncio.Task | None = None


def start_consumer() -> None:
    """Launches the consumer as an asyncio background task."""
    global _consumer_task
    _consumer_task = asyncio.create_task(run_consumer(), name="workflow-consumer")
    logger.info("WorkflowConsumer task started")


async def stop_consumer() -> None:
    """Cancels the consumer task gracefully."""
    global _consumer_task
    if _consumer_task and not _consumer_task.done():
        _consumer_task.cancel()
        try:
            await asyncio.wait_for(_consumer_task, timeout=5.0)
        except (asyncio.CancelledError, asyncio.TimeoutError):
            pass
    _consumer_task = None
    logger.info("WorkflowConsumer task stopped")
