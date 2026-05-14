import json
import logging
import asyncio
from typing import Callable, Awaitable

import redis.asyncio as aioredis

from app.core.config import settings
from app.events.types import Event

logger = logging.getLogger(__name__)

_redis: aioredis.Redis | None = None
_redis_loop: asyncio.AbstractEventLoop | None = None

STREAM_KEY = "cbos:events"
CONSUMER_GROUP = "cbos-workers"


async def get_redis() -> aioredis.Redis:
    global _redis, _redis_loop
    current_loop = asyncio.get_running_loop()

    if _redis is not None and _redis_loop is not current_loop:
        try:
            await _redis.aclose()
        except RuntimeError:
            # A test or script may reuse this module from a fresh event loop after
            # the prior loop was already torn down. In that case, drop the stale
            # client and recreate it on the current loop.
            pass
        _redis = None
        _redis_loop = None

    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
        _redis_loop = current_loop
    return _redis


async def publish(event: Event) -> None:
    """Publica un evento en el stream de Redis y notifica vía pub/sub a WS clients."""
    try:
        r = await get_redis()
        data = event.model_dump_json()
        # Stream para el workflow consumer
        await r.xadd(STREAM_KEY, {"data": data})
        # Pub/Sub para notificaciones WebSocket en tiempo real
        channel = f"cbos:notifications:{event.workspace_id}"
        await r.publish(channel, data)
        logger.info(f"Event published: {event.event_type} [{event.entity_id}]")
    except Exception as e:
        logger.error(f"Failed to publish event {event.event_type}: {e}")


async def close() -> None:
    global _redis, _redis_loop
    if _redis:
        await _redis.aclose()
        _redis = None
        _redis_loop = None
