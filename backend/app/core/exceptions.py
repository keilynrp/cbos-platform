from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse


class CBOSException(HTTPException):
    """
    Excepción base de CBOS con error shape estándar.

    Shape de respuesta:
        {
            "error": {
                "code": "SNAKE_CASE_CODE",
                "message": "Human readable message",
                "detail": { ... }   # opcional
            }
        }
    """

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        detail: dict | None = None,
    ):
        super().__init__(status_code=status_code, detail=message)
        self.code = code
        self.message = message
        self.extra_detail = detail


# ── Subclasses de uso común ───────────────────────────────────────────────────

class NotFoundError(CBOSException):
    def __init__(self, resource: str, resource_id: str | None = None):
        detail = {"resource": resource}
        if resource_id:
            detail["id"] = resource_id
        super().__init__(
            status_code=404,
            code="NOT_FOUND",
            message=f"{resource} not found.",
            detail=detail,
        )


class ConflictError(CBOSException):
    def __init__(self, message: str, detail: dict | None = None):
        super().__init__(status_code=409, code="CONFLICT", message=message, detail=detail)


class ValidationError(CBOSException):
    def __init__(self, message: str, detail: dict | None = None):
        super().__init__(status_code=422, code="VALIDATION_ERROR", message=message, detail=detail)


class ForbiddenError(CBOSException):
    def __init__(self, message: str = "You do not have permission to perform this action."):
        super().__init__(status_code=403, code="FORBIDDEN", message=message)


# ── Exception handler para FastAPI ───────────────────────────────────────────

async def cbos_exception_handler(request: Request, exc: CBOSException) -> JSONResponse:
    body: dict = {"code": exc.code, "message": exc.message}
    if exc.extra_detail:
        body["detail"] = exc.extra_detail
    return JSONResponse(status_code=exc.status_code, content={"error": body})
