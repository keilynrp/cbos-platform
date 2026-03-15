"""
Workflow Event Consumer
Lee eventos del Redis Stream y dispara workflows matching.
Se ejecuta como tarea asyncio en background desde el lifespan de FastAPI.
"""

import asyncio
import json
import logging

import redis.asyncio as aioredis

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.events.bus import CONSUMER_GROUP, STREAM_KEY
from app.events.types import Event
from app.modules.workflows.service import dispatch_event

logger = logging.getLogger(__name__)

CONSUMER_NAME = "workflow-engine"
BLOCK_MS = 2000       # espera máx 2s por nuevos mensajes
MAX_RETRIES = 3       # reintentos en caso de error transitorio


async def _ensure_group(r: aioredis.Redis) -> None:
    """Crea el consumer group si no existe."""
    try:
        await r.xgroup_create(STREAM_KEY, CONSUMER_GROUP, id="0", mkstream=True)
        logger.info("Consumer group '%s' created on stream '%s'", CONSUMER_GROUP, STREAM_KEY)
    except Exception as e:
        # BUSYGROUP = ya existe, ignorar
        if "BUSYGROUP" not in str(e):
            logger.warning("xgroup_create: %s", e)


async def _process_message(data: dict) -> None:
    """Parsea un mensaje del stream y dispara dispatch_event."""
    raw = data.get("data", "{}")
    try:
        event = Event.model_validate_json(raw)
    except Exception as e:
        logger.warning("Could not parse event: %s — raw: %s", e, raw[:200])
        return

    try:
        async with AsyncSessionLocal() as db:
            await dispatch_event(db, event)
    except Exception as e:
        logger.error("dispatch_event error for %s: %s", event.event_type, e)


async def run_consumer() -> None:
    """Loop principal del consumer. Corre indefinidamente hasta cancelación."""
    logger.info("WorkflowConsumer starting...")
    r: aioredis.Redis | None = None

    while True:
        try:
            if r is None:
                r = aioredis.from_url(settings.redis_url, decode_responses=True)
                await _ensure_group(r)
                logger.info("WorkflowConsumer connected to Redis")

            # Read new messages ("> = only new since last ack)
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
                    await _process_message(data)
                    # ACK después de procesar exitosamente
                    await r.xack(STREAM_KEY, CONSUMER_GROUP, msg_id)
                except Exception as e:
                    logger.error("Error processing message %s: %s", msg_id, e)
                    # No ACK — el mensaje queda en PEL para reintento

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
    """Lanza el consumer como background task asyncio."""
    global _consumer_task
    _consumer_task = asyncio.create_task(run_consumer(), name="workflow-consumer")
    logger.info("WorkflowConsumer task started")


async def stop_consumer() -> None:
    """Cancela el consumer task gracefully."""
    global _consumer_task
    if _consumer_task and not _consumer_task.done():
        _consumer_task.cancel()
        try:
            await asyncio.wait_for(_consumer_task, timeout=5.0)
        except (asyncio.CancelledError, asyncio.TimeoutError):
            pass
    _consumer_task = None
    logger.info("WorkflowConsumer task stopped")
