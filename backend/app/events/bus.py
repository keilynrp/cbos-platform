import json
import logging
from typing import Callable, Awaitable

import redis.asyncio as aioredis

from app.core.config import settings
from app.events.types import Event

logger = logging.getLogger(__name__)

_redis: aioredis.Redis | None = None

STREAM_KEY = "cbos:events"
CONSUMER_GROUP = "cbos-workers"


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
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
    global _redis
    if _redis:
        await _redis.aclose()
        _redis = None
