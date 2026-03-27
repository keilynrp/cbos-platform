import uuid
from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# ContextVar accesible desde cualquier parte del request lifecycle
correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="")


def get_correlation_id() -> str:
    """Retorna el correlation ID del request actual, o string vacío si no hay."""
    return correlation_id_var.get()


class CorrelationIDMiddleware(BaseHTTPMiddleware):
    """
    Lee X-Request-ID del header entrante (o genera un UUID si no viene).
    Lo propaga en el ContextVar para logging y eventos, y lo devuelve
    en el header X-Request-ID de la respuesta.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        token = correlation_id_var.set(request_id)
        try:
            response = await call_next(request)
        finally:
            correlation_id_var.reset(token)

        response.headers["X-Request-ID"] = request_id
        return response
