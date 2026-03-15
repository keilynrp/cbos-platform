"""
WebSocket endpoint para notificaciones en tiempo real.
Autenticación via JWT como query param (no se puede enviar header en WS nativo).
"""
import asyncio
import json
import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.core.security import verify_token
from app.core.ws_manager import manager
from app.events.bus import get_redis

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Notifications"])

# Tipos de evento que se muestran como notificaciones en la UI
NOTIFY_EVENTS = {
    "WorkflowTriggered",
    "WorkflowCompleted",
    "WorkflowFailed",
    "InventoryLowThresholdDetected",
    "QuoteAccepted",
    "QuoteRejected",
    "SalesOrderCreated",
    "CustomerActionPerformed",
    "OpportunityWon",
    "OpportunityLost",
}

NOTIFY_LABELS = {
    "WorkflowTriggered":              "Workflow ejecutado",
    "WorkflowCompleted":              "Workflow completado",
    "WorkflowFailed":                 "Workflow falló",
    "InventoryLowThresholdDetected":  "Stock bajo",
    "QuoteAccepted":                  "Cotización aceptada",
    "QuoteRejected":                  "Cotización rechazada",
    "SalesOrderCreated":              "Nueva orden de venta",
    "CustomerActionPerformed":        "Acción del cliente",
    "OpportunityWon":                 "Deal ganado 🎉",
    "OpportunityLost":                "Deal perdido",
}


@router.websocket("/ws/notifications")
async def notifications_ws(
    websocket: WebSocket,
    token: str = Query(..., description="JWT access token"),
):
    """
    WebSocket de notificaciones.
    Conectar con: ws://host/api/v1/ws/notifications?token=<access_token>
    """
    payload = verify_token(token, token_type="access")
    if not payload:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    workspace_id: str = payload.get("workspace_id", "")
    if not workspace_id:
        await websocket.close(code=4003, reason="No workspace")
        return

    await manager.connect(workspace_id, websocket)

    r = await get_redis()
    pubsub = r.pubsub()
    channel = f"cbos:notifications:{workspace_id}"
    await pubsub.subscribe(channel)

    async def forward_events():
        """Lee mensajes de Redis pub/sub y los reenvía al cliente WS."""
        try:
            async for message in pubsub.listen():
                if message["type"] != "message":
                    continue
                try:
                    event = json.loads(message["data"])
                except Exception:
                    continue
                event_type = event.get("event_type", "")
                if event_type not in NOTIFY_EVENTS:
                    continue
                await websocket.send_json({
                    "type": "notification",
                    "event_type": event_type,
                    "title": NOTIFY_LABELS.get(event_type, event_type),
                    "payload": event.get("payload", {}),
                    "entity_id": event.get("entity_id"),
                    "timestamp": event.get("timestamp"),
                })
        except Exception as e:
            logger.debug(f"WS forward_events ended: {e}")

    async def wait_for_disconnect():
        """Detecta cuando el cliente cierra la conexión."""
        try:
            while True:
                await websocket.receive_text()
        except (WebSocketDisconnect, Exception):
            pass

    fwd_task = asyncio.create_task(forward_events())
    disc_task = asyncio.create_task(wait_for_disconnect())

    try:
        done, pending = await asyncio.wait(
            [fwd_task, disc_task],
            return_when=asyncio.FIRST_COMPLETED,
        )
    finally:
        for task in [fwd_task, disc_task]:
            if not task.done():
                task.cancel()
        try:
            await pubsub.unsubscribe(channel)
            await pubsub.aclose()
        except Exception:
            pass
        manager.disconnect(workspace_id, websocket)
