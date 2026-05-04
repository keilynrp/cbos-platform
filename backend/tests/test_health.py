"""Integration tests for GET /health endpoint."""
import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch

from app.health import CheckResult

pytestmark = pytest.mark.asyncio

async def test_health_returns_200_without_auth(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200

async def test_health_shape(client: AsyncClient):
    resp = await client.get("/health")
    data = resp.json()
    assert "status" in data
    assert "version" in data
    assert "checks" in data
    assert isinstance(data["checks"], list)

async def test_health_check_names(client: AsyncClient):
    resp = await client.get("/health")
    names = {c["name"] for c in resp.json()["checks"]}
    assert "api" in names
    assert "postgres" in names

async def test_health_postgres_check_has_latency(client: AsyncClient):
    resp = await client.get("/health")
    postgres = next(c for c in resp.json()["checks"] if c["name"] == "postgres")
    assert "latency_ms" in postgres
    assert isinstance(postgres["latency_ms"], (int, float))
    assert postgres["latency_ms"] >= 0

async def test_health_overall_status_is_valid(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.json()["status"] in {"healthy", "degraded", "unhealthy"}

async def test_health_api_check_is_always_healthy(client: AsyncClient):
    resp = await client.get("/health")
    api_check = next(c for c in resp.json()["checks"] if c["name"] == "api")
    assert api_check["status"] == "healthy"
    assert api_check["latency_ms"] == 0  # hardcoded — api check does not measure its own latency


async def test_health_overall_status_reflects_unhealthy_postgres(client: AsyncClient):
    unhealthy_result = CheckResult(name="postgres", status="unhealthy", latency_ms=0)
    with patch("app.health._check_postgres", new=AsyncMock(return_value=unhealthy_result)):
        resp = await client.get("/health")
    data = resp.json()
    assert data["status"] == "unhealthy"
    assert resp.status_code == 200  # still HTTP 200 even when unhealthy


async def test_health_overall_status_reflects_degraded_postgres(client: AsyncClient):
    degraded_result = CheckResult(name="postgres", status="degraded", latency_ms=250.0)
    with patch("app.health._check_postgres", new=AsyncMock(return_value=degraded_result)):
        resp = await client.get("/health")
    data = resp.json()
    assert data["status"] == "degraded"
    assert resp.status_code == 200
