"""
Identity module — contract completeness tests (Sprint 2).
Covers: /workspaces/me, /organizations, /persons, token type validation.

Complements test_identity.py (auth flows) with endpoint coverage
for the remaining identity router surface.
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


# ── /workspaces/me ────────────────────────────────────────────────────────────

async def test_get_workspace_me_returns_workspace_details(
    client: AsyncClient, auth_headers: dict
):
    resp = await client.get("/api/v1/workspaces/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Test Corp"
    assert data["slug"] == "test-corp"


async def test_get_workspace_me_requires_auth(client: AsyncClient):
    resp = await client.get("/api/v1/workspaces/me")
    assert resp.status_code == 401


# ── /organizations ────────────────────────────────────────────────────────────

async def test_list_organizations_returns_empty_on_fresh_workspace(
    client: AsyncClient, auth_headers: dict
):
    resp = await client.get("/api/v1/organizations", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


async def test_create_organization_returns_201_with_name(
    client: AsyncClient, auth_headers: dict
):
    resp = await client.post("/api/v1/organizations", headers=auth_headers, json={
        "legal_name": "Acme Corp",
        "industry": "Technology",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["legal_name"] == "Acme Corp"
    assert data["industry"] == "Technology"
    assert "id" in data


async def test_created_organization_appears_in_list(
    client: AsyncClient, auth_headers: dict
):
    await client.post("/api/v1/organizations", headers=auth_headers, json={
        "legal_name": "Listed Corp",
    })
    resp = await client.get("/api/v1/organizations", headers=auth_headers)
    assert resp.status_code == 200
    names = [o["legal_name"] for o in resp.json()]
    assert "Listed Corp" in names


async def test_organizations_scoped_to_workspace(client: AsyncClient, auth_headers: dict):
    """Organizations created in workspace A are not visible in workspace B."""
    await client.post("/api/v1/organizations", headers=auth_headers, json={
        "legal_name": "Private Corp",
    })

    # Register a second workspace
    resp = await client.post("/api/v1/auth/register", json={
        "full_name": "User B",
        "email": "userb@orgscope.example.com",
        "password": "securepassB123",
        "workspace_name": "Other Corp",
        "workspace_slug": "other-corp-orgscope",
    })
    assert resp.status_code == 201
    headers_b = {"Authorization": f"Bearer {resp.json()['access_token']}"}

    resp_b = await client.get("/api/v1/organizations", headers=headers_b)
    assert resp_b.status_code == 200
    assert resp_b.json() == []


async def test_organizations_require_auth(client: AsyncClient):
    resp = await client.get("/api/v1/organizations")
    assert resp.status_code == 401


# ── /persons ──────────────────────────────────────────────────────────────────

async def test_create_person_returns_201(client: AsyncClient, auth_headers: dict):
    resp = await client.post("/api/v1/persons", headers=auth_headers, json={
        "full_name": "New Member",
        "email": "newmember@testcorp.example.com",
        "role_labels": ["member"],
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["full_name"] == "New Member"
    assert data["email"] == "newmember@testcorp.example.com"
    assert "id" in data


async def test_persons_require_auth(client: AsyncClient):
    resp = await client.post("/api/v1/persons", json={
        "full_name": "Ghost",
        "email": "ghost@example.com",
    })
    assert resp.status_code == 401


# ── Token type validation ─────────────────────────────────────────────────────

async def test_refresh_token_rejected_as_bearer_access_token(client: AsyncClient):
    """A refresh token must not be accepted where an access token is required."""
    resp = await client.post("/api/v1/auth/register", json={
        "full_name": "Token Type User",
        "email": "tokentype@testcorp.example.com",
        "password": "securepass789",
        "workspace_name": "Token Corp",
        "workspace_slug": "token-corp-type",
    })
    assert resp.status_code == 201
    refresh_token = resp.json()["refresh_token"]

    # Using the refresh token as a Bearer access token should be rejected
    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {refresh_token}"},
    )
    assert resp.status_code == 401


async def test_malformed_token_returns_401(client: AsyncClient):
    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer not.a.valid.token"},
    )
    assert resp.status_code == 401
