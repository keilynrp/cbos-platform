"""
Identity module — contract completeness tests (Sprint 2).
Covers: /workspaces/me, /organizations, /persons, token type validation.

Complements test_identity.py (auth flows) with endpoint coverage
for the remaining identity router surface.
"""

import pytest
from httpx import AsyncClient

from app.core.security import create_access_token, hash_password
from app.modules.identity.models import Person, User

pytestmark = pytest.mark.asyncio


async def _register_workspace(
    client: AsyncClient,
    *,
    full_name: str,
    email: str,
    workspace_name: str,
    workspace_slug: str,
) -> dict:
    resp = await client.post("/api/v1/auth/register", json={
        "full_name": full_name,
        "email": email,
        "password": "securepass123",
        "workspace_name": workspace_name,
        "workspace_slug": workspace_slug,
    })
    assert resp.status_code == 201, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


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

async def test_create_public_site_returns_secret_once(
    client: AsyncClient, auth_headers: dict
):
    resp = await client.post("/api/v1/public-sites", headers=auth_headers, json={
        "site_slug": "inbounduxd",
        "domain": "inbounduxd.example.com",
        "allowed_origins": ["https://InboundUXD.example.com/"],
    })
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["site_slug"] == "inbounduxd"
    assert data["allowed_origins"] == ["https://inbounduxd.example.com"]
    assert data["api_key"].startswith("psk_inbounduxd_")
    assert data["api_key_hint"].startswith("psk_")


async def test_list_public_sites_hides_full_key(
    client: AsyncClient, auth_headers: dict
):
    create_resp = await client.post("/api/v1/public-sites", headers=auth_headers, json={
        "site_slug": "listed-site",
        "allowed_origins": ["https://listed.example.com"],
    })
    created = create_resp.json()

    resp = await client.get("/api/v1/public-sites", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == [{
        "id": created["id"],
        "workspace_id": created["workspace_id"],
        "site_slug": "listed-site",
        "domain": None,
        "allowed_origins": ["https://listed.example.com"],
        "is_active": True,
        "api_key_hint": created["api_key_hint"],
        "created_at": created["created_at"],
        "updated_at": created["updated_at"],
    }]


async def test_public_sites_scoped_to_workspace(
    client: AsyncClient, auth_headers: dict
):
    await client.post("/api/v1/public-sites", headers=auth_headers, json={
        "site_slug": "workspace-a-site",
        "allowed_origins": ["https://a.example.com"],
    })
    headers_b = await _register_workspace(
        client,
        full_name="User B",
        email="userb@publicsite.example.com",
        workspace_name="Other Corp",
        workspace_slug="other-corp-public-sites",
    )

    resp_b = await client.get("/api/v1/public-sites", headers=headers_b)
    assert resp_b.status_code == 200
    assert resp_b.json() == []


async def test_update_public_site_mutates_origins_and_status(
    client: AsyncClient, auth_headers: dict
):
    create_resp = await client.post("/api/v1/public-sites", headers=auth_headers, json={
        "site_slug": "mutable-site",
        "allowed_origins": ["https://old.example.com"],
    })
    site_id = create_resp.json()["id"]

    resp = await client.patch(
        f"/api/v1/public-sites/{site_id}",
        headers=auth_headers,
        json={
            "allowed_origins": ["https://new.example.com/", "https://new.example.com"],
            "is_active": False,
            "domain": "new.example.com",
        },
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["allowed_origins"] == ["https://new.example.com"]
    assert data["is_active"] is False
    assert data["domain"] == "new.example.com"


async def test_rotate_public_site_key_invalidates_previous_key(
    client: AsyncClient, auth_headers: dict
):
    create_resp = await client.post("/api/v1/public-sites", headers=auth_headers, json={
        "site_slug": "rotating-site",
        "allowed_origins": ["https://rotating.example.com"],
    })
    created = create_resp.json()
    old_key = created["api_key"]

    rotate_resp = await client.post(
        f"/api/v1/public-sites/{created['id']}/rotate-key",
        headers=auth_headers,
    )
    assert rotate_resp.status_code == 200, rotate_resp.text
    new_key = rotate_resp.json()["api_key"]
    assert new_key != old_key

    old_key_resp = await client.post(
        "/api/v1/crm/public/leads",
        headers={
            "X-CBOS-Site-Key": old_key,
            "Origin": "https://rotating.example.com",
        },
        json={"first_name": "Old", "email": "old@example.com"},
    )
    assert old_key_resp.status_code == 401

    new_key_resp = await client.post(
        "/api/v1/crm/public/leads",
        headers={
            "X-CBOS-Site-Key": new_key,
            "Origin": "https://rotating.example.com",
        },
        json={"first_name": "New", "email": "new@example.com"},
    )
    assert new_key_resp.status_code == 201, new_key_resp.text


async def test_public_sites_require_auth(client: AsyncClient):
    resp = await client.get("/api/v1/public-sites")
    assert resp.status_code == 401


async def test_public_sites_require_admin_role(
    client: AsyncClient, db, workspace
):
    person = Person(
        workspace_id=workspace.id,
        full_name="Member User",
        email="member@test.corp",
        role_labels=["member"],
    )
    db.add(person)
    await db.flush()

    user = User(
        workspace_id=workspace.id,
        person_id=person.id,
        email="member@test.corp",
        hashed_password=hash_password("testpassword123"),
        role="member",
        is_owner=False,
    )
    db.add(user)
    await db.commit()

    member_headers = {
        "Authorization": f"Bearer {create_access_token({
            'sub': user.id,
            'workspace_id': user.workspace_id,
            'role': user.role,
        })}"
    }
    resp = await client.get("/api/v1/public-sites", headers=member_headers)
    assert resp.status_code == 403


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
