import uuid
from contextvars import ContextVar
from typing import Callable

from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Receive, Scope, Send

# ContextVar accessible from anywhere in the request lifecycle
correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="")


def get_correlation_id() -> str:
    """Returns the correlation ID for the current request, or empty string."""
    return correlation_id_var.get()


class CorrelationIDMiddleware:
    """
    Pure ASGI middleware (no BaseHTTPMiddleware / anyio task groups).

    Reads X-Request-ID from the incoming header (or generates a UUID).
    Propagates it via ContextVar for logging and events, and echoes it
    back in the X-Request-ID response header.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        # Extract or generate request ID
        headers = dict(scope.get("headers", []))
        request_id = (
            headers.get(b"x-request-id", b"").decode("latin-1")
            or str(uuid.uuid4())
        )
        token = correlation_id_var.set(request_id)

        async def send_with_header(message: dict) -> None:
            if message["type"] == "http.response.start":
                mutable = MutableHeaders(scope=message)
                mutable.append("X-Request-ID", request_id)
            await send(message)

        try:
            await self.app(scope, receive, send_with_header)
        finally:
            correlation_id_var.reset(token)
