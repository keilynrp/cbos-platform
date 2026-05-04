"""
Public health endpoint — no authentication required.
Always returns HTTP 200; health state is in the JSON body.
"""
import time
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import text

from app.core.database import AsyncSessionLocal
from app.core.config import settings

router = APIRouter(tags=["System"])

POSTGRES_DEGRADED_THRESHOLD_MS = 200

StatusValue = Literal["healthy", "degraded", "unhealthy"]


class CheckResult(BaseModel):
    name: str
    status: StatusValue
    latency_ms: float


class HealthResponse(BaseModel):
    status: StatusValue
    version: str
    checks: list[CheckResult]


def _worst(statuses: list[StatusValue]) -> StatusValue:
    if "unhealthy" in statuses:
        return "unhealthy"
    if "degraded" in statuses:
        return "degraded"
    return "healthy"


async def _check_postgres() -> CheckResult:
    try:
        start = time.perf_counter()
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        latency_ms = (time.perf_counter() - start) * 1000
        status: StatusValue = (
            "degraded" if latency_ms > POSTGRES_DEGRADED_THRESHOLD_MS else "healthy"
        )
        return CheckResult(name="postgres", status=status, latency_ms=round(latency_ms, 2))
    except Exception:
        return CheckResult(name="postgres", status="unhealthy", latency_ms=0)


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    api_check = CheckResult(name="api", status="healthy", latency_ms=0)
    postgres_check = await _check_postgres()
    checks = [api_check, postgres_check]
    overall = _worst([c.status for c in checks])
    return HealthResponse(status=overall, version=settings.app_version, checks=checks)
