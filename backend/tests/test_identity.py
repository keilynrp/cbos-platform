"""
Identity module integration tests.
Covers: register, login, /auth/me, token refresh.
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


# ── Helpers ───────────────────────────────────────────────────────────────────

REGISTER_PAYLOAD = {
    "full_name": "John Doe",
    "email": "john@acme.example.com",
    "password": "securepass123",
    "workspace_name": "Acme Inc",
    "workspace_slug": "acme-inc",
}


async def _register_fresh(client: AsyncClient, slug_suffix: str = "") -> dict:
    payload = {**REGISTER_PAYLOAD, "workspace_slug": f"acme{slug_suffix}"}
    if slug_suffix:
        payload["email"] = f"john{slug_suffix}@acme.example.com"
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── Tests ─────────────────────────────────────────────────────────────────────

async def test_register_creates_workspace_and_returns_tokens(client: AsyncClient):
    data = await _register_fresh(client, "-reg1")
    assert "access_token" in data
    assert "refresh_token" in data


async def test_register_duplicate_slug_returns_409(client: AsyncClient):
    await _register_fresh(client, "-dup")
    resp = await client.post("/api/v1/auth/register", json={
        **REGISTER_PAYLOAD,
        "workspace_slug": "acme-dup",
        "email": "other@acme.example.com",
    })
    assert resp.status_code == 409


async def test_register_duplicate_email_returns_409(client: AsyncClient):
    await _register_fresh(client, "-email1")
    resp = await client.post("/api/v1/auth/register", json={
        **REGISTER_PAYLOAD,
        "workspace_slug": "acme-email2",
        "email": "john-email1@acme.example.com",
    })
    assert resp.status_code == 409


async def test_login_correct_credentials(client: AsyncClient):
    await _register_fresh(client, "-login1")
    resp = await client.post("/api/v1/auth/login", json={
        "email": "john-login1@acme.example.com",
        "password": "securepass123",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data


async def test_login_wrong_password_returns_401(client: AsyncClient):
    await _register_fresh(client, "-wrongpw")
    resp = await client.post("/api/v1/auth/login", json={
        "email": "johnwrongpw@acme.example.com",
        "password": "wrongpassword",
    })
    assert resp.status_code == 401


async def test_get_me_with_valid_token(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "owner@test.corp"


async def test_get_me_without_token_returns_401(client: AsyncClient):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


async def test_refresh_token(client: AsyncClient):
    tokens = await _register_fresh(client, "-refresh1")
    resp = await client.post("/api/v1/auth/refresh", json={
        "refresh_token": tokens["refresh_token"],
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()
