"""
Discovery module — contract tests.

Covers:
- Public catalog endpoints (capabilities, packages — no auth)
- Auth guards for session endpoints
- Session lifecycle: create → send message → generate blueprint → apply
- Cannot apply without generating blueprint first
- Workspace isolation
"""
import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

BASE = "/api/v1/discovery"


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _create_session(client: AsyncClient, headers: dict, **kwargs) -> dict:
    body = {
        "business_description": "Empresa de retail con 3 tiendas, necesita digitalizar ventas e inventario.",
        "industry": "retail",
        "company_size": "small",
        **kwargs,
    }
    resp = await client.post(f"{BASE}/sessions", headers=headers, json=body)
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── Public catalog endpoints ──────────────────────────────────────────────────

async def test_list_capabilities_no_auth(client: AsyncClient):
    """GET /discovery/capabilities is public — no JWT needed."""
    resp = await client.get(f"{BASE}/capabilities")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "capabilities" in data
    assert isinstance(data["capabilities"], list)
    assert len(data["capabilities"]) > 0


async def test_list_packages_no_auth(client: AsyncClient):
    """GET /discovery/packages is public — no JWT needed."""
    resp = await client.get(f"{BASE}/packages")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "packages" in data
    assert isinstance(data["packages"], dict)
    assert len(data["packages"]) > 0


# ── Auth guards ───────────────────────────────────────────────────────────────

async def test_create_session_requires_auth(client: AsyncClient):
    resp = await client.post(f"{BASE}/sessions", json={})
    assert resp.status_code == 401


async def test_list_sessions_requires_auth(client: AsyncClient):
    resp = await client.get(f"{BASE}/sessions")
    assert resp.status_code == 401


async def test_get_session_requires_auth(client: AsyncClient):
    resp = await client.get(f"{BASE}/sessions/fake-id")
    assert resp.status_code == 401


async def test_send_message_requires_auth(client: AsyncClient):
    resp = await client.post(f"{BASE}/sessions/fake-id/messages", json={"content": "hi"})
    assert resp.status_code == 401


async def test_generate_blueprint_requires_auth(client: AsyncClient):
    resp = await client.post(f"{BASE}/sessions/fake-id/generate-blueprint")
    assert resp.status_code == 401


async def test_apply_blueprint_requires_auth(client: AsyncClient):
    resp = await client.post(f"{BASE}/sessions/fake-id/apply")
    assert resp.status_code == 401


# ── Session CRUD ──────────────────────────────────────────────────────────────

async def test_create_session_returns_active_session(
    client: AsyncClient, auth_headers: dict
):
    session = await _create_session(client, auth_headers)
    assert session["status"] == "active"
    assert session["business_description"] is not None
    assert session["industry"] == "retail"
    assert session["company_size"] == "small"
    assert "id" in session
    assert "workspace_id" in session


async def test_create_session_minimal_body(
    client: AsyncClient, auth_headers: dict
):
    """Empty body is valid — all fields optional."""
    resp = await client.post(f"{BASE}/sessions", headers=auth_headers, json={})
    assert resp.status_code == 201, resp.text
    assert resp.json()["status"] == "active"


async def test_list_sessions_returns_created_session(
    client: AsyncClient, auth_headers: dict
):
    session = await _create_session(client, auth_headers)
    resp = await client.get(f"{BASE}/sessions", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    ids = [s["id"] for s in resp.json()]
    assert session["id"] in ids


async def test_get_session_by_id(client: AsyncClient, auth_headers: dict):
    session = await _create_session(client, auth_headers)
    resp = await client.get(f"{BASE}/sessions/{session['id']}", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["id"] == session["id"]


async def test_get_session_not_found_returns_404(
    client: AsyncClient, auth_headers: dict
):
    resp = await client.get(
        f"{BASE}/sessions/00000000-0000-0000-0000-000000000000", headers=auth_headers
    )
    assert resp.status_code == 404


# ── Chat ──────────────────────────────────────────────────────────────────────

async def test_send_message_returns_chat_response(
    client: AsyncClient, auth_headers: dict
):
    session = await _create_session(client, auth_headers)
    resp = await client.post(
        f"{BASE}/sessions/{session['id']}/messages",
        headers=auth_headers,
        json={"content": "Necesito gestionar mis ventas y cotizaciones mejor."},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "message" in data
    assert "session" in data
    assert data["message"]["role"] == "assistant"
    assert len(data["message"]["content"]) > 0
    assert data["session"]["id"] == session["id"]


async def test_send_message_stores_user_and_assistant_messages(
    client: AsyncClient, auth_headers: dict
):
    """Two messages (user + assistant) are persisted per exchange."""
    session = await _create_session(client, auth_headers)
    resp = await client.post(
        f"{BASE}/sessions/{session['id']}/messages",
        headers=auth_headers,
        json={"content": "Tengo problemas con mi inventario."},
    )
    assert resp.status_code == 200, resp.text
    # The returned assistant message shows exchange happened
    msg = resp.json()["message"]
    assert msg["role"] == "assistant"
    assert msg["session_id"] == session["id"]


async def test_send_message_empty_content_rejected(
    client: AsyncClient, auth_headers: dict
):
    session = await _create_session(client, auth_headers)
    resp = await client.post(
        f"{BASE}/sessions/{session['id']}/messages",
        headers=auth_headers,
        json={"content": ""},
    )
    assert resp.status_code == 422


# ── Blueprint generation ──────────────────────────────────────────────────────

async def test_generate_blueprint_returns_blueprint_response(
    client: AsyncClient, auth_headers: dict
):
    session = await _create_session(client, auth_headers)
    resp = await client.post(
        f"{BASE}/sessions/{session['id']}/generate-blueprint",
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "blueprint" in data
    assert "recommended_package" in data
    assert "matched_capabilities" in data
    assert data["session_id"] == session["id"]
    assert isinstance(data["matched_capabilities"], list)


async def test_generate_blueprint_sets_session_blueprint(
    client: AsyncClient, auth_headers: dict
):
    """After generating, the session's blueprint field is populated."""
    session = await _create_session(client, auth_headers)
    await client.post(
        f"{BASE}/sessions/{session['id']}/generate-blueprint", headers=auth_headers
    )
    updated = (await client.get(
        f"{BASE}/sessions/{session['id']}", headers=auth_headers
    )).json()
    assert updated["blueprint"] is not None
    assert updated["recommended_package"] is not None


# ── Apply blueprint ───────────────────────────────────────────────────────────

async def test_apply_blueprint_without_generate_returns_409(
    client: AsyncClient, auth_headers: dict
):
    """Cannot apply before generating the blueprint."""
    session = await _create_session(client, auth_headers)
    resp = await client.post(
        f"{BASE}/sessions/{session['id']}/apply", headers=auth_headers
    )
    assert resp.status_code == 409, resp.text


async def test_apply_blueprint_returns_success(
    client: AsyncClient, auth_headers: dict
):
    session = await _create_session(client, auth_headers)
    await client.post(
        f"{BASE}/sessions/{session['id']}/generate-blueprint", headers=auth_headers
    )
    resp = await client.post(
        f"{BASE}/sessions/{session['id']}/apply", headers=auth_headers
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["success"] is True
    assert isinstance(data["activated_modules"], list)
    assert data["workspace_id"] is not None


# ── Workspace isolation ───────────────────────────────────────────────────────

async def _register_workspace(client: AsyncClient, slug: str, email: str) -> dict:
    resp = await client.post("/api/v1/auth/register", json={
        "full_name": "Discovery User",
        "email": email,
        "password": "securepassDisc123",
        "workspace_name": f"Discovery Corp {slug}",
        "workspace_slug": slug,
    })
    assert resp.status_code == 201, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


async def test_sessions_not_visible_across_workspaces(
    client: AsyncClient, auth_headers: dict
):
    await _create_session(client, auth_headers)
    headers_b = await _register_workspace(
        client, "disc-iso-b", "disc-iso-b@isolation.example.com"
    )
    resp = await client.get(f"{BASE}/sessions", headers=headers_b)
    assert resp.status_code == 200, resp.text
    assert resp.json() == []


async def test_cannot_access_other_workspace_session(
    client: AsyncClient, auth_headers: dict
):
    session = await _create_session(client, auth_headers)
    headers_b = await _register_workspace(
        client, "disc-iso-c", "disc-iso-c@isolation.example.com"
    )
    resp = await client.get(
        f"{BASE}/sessions/{session['id']}", headers=headers_b
    )
    assert resp.status_code == 404
