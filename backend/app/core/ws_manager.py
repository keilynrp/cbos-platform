"""
WebSocket Connection Manager
Mantiene conexiones activas por workspace para enviar notificaciones en tiempo real.
"""
import logging
from collections import defaultdict
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, workspace_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._connections[workspace_id].add(ws)
        logger.info(f"WS connected workspace={workspace_id} total={len(self._connections[workspace_id])}")

    def disconnect(self, workspace_id: str, ws: WebSocket) -> None:
        self._connections[workspace_id].discard(ws)
        logger.info(f"WS disconnected workspace={workspace_id}")

    async def broadcast(self, workspace_id: str, message: dict) -> None:
        """Envía un mensaje a todas las conexiones activas del workspace."""
        dead: set[WebSocket] = set()
        for ws in list(self._connections.get(workspace_id, set())):
            try:
                await ws.send_json(message)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self._connections[workspace_id].discard(ws)


manager = ConnectionManager()
