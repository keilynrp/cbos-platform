"""
Discovery module — integration tests.

Focuses on multi-step flows NOT covered by test_discovery_contract.py:
- Full session lifecycle: create → chat → blueprint → apply (message-enriched)
- Session listing includes multiple created sessions
- Workspace isolation: cross-workspace session not accessible
- Context auto-detection from chat message content
- Completed session rejects further messages
- Capability catalog structure validation
"""
import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

BASE = "/api/v1/discovery"


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _create_session(client: AsyncClient, headers: dict, **kwargs) -> dict:
    body = {
        "business_description": "Empresa de tecnología con 15 personas.",
        "industry": "technology",
        "company_size": "small",
        **kwargs,
    }
    resp = await client.post(f"{BASE}/sessions", headers=headers, json=body)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _register_workspace(client: AsyncClient, slug: str, email: str) -> dict:
    resp = await client.post("/api/v1/auth/register", json={
        "full_name": "Discovery Tester",
        "email": email,
        "password": "securepassDisc123",
        "workspace_name": f"Discovery Corp {slug}",
        "workspace_slug": slug,
    })
    assert resp.status_code == 201, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


# ── 1. Full lifecycle: create → chat messages → blueprint → apply ─────────────

async def test_full_discovery_session_lifecycle(
    client: AsyncClient, auth_headers: dict
):
    """Create a session, send multiple chat messages, generate blueprint,
    then apply — asserting state progression at each step."""

    # Step 1: create session with no business context (will be enriched via chat)
    resp = await client.post(f"{BASE}/sessions", headers=auth_headers, json={})
    assert resp.status_code == 201, resp.text
    session = resp.json()
    session_id = session["id"]
    assert session["status"] == "active"
    assert session["blueprint"] is None

    # Step 2: send a first chat message describing the business problem
    resp = await client.post(
        f"{BASE}/sessions/{session_id}/messages",
        headers=auth_headers,
        json={"content": "Necesito gestionar mis leads y pipeline de ventas mejor."},
    )
    assert resp.status_code == 200, resp.text
    chat1 = resp.json()
    assert chat1["message"]["role"] == "assistant"
    assert chat1["session"]["id"] == session_id
    # Session must still exist and be accessible
    assert chat1["session"]["status"] in ("active", "completed")

    # Step 3: send a second message with more context
    resp = await client.post(
        f"{BASE}/sessions/{session_id}/messages",
        headers=auth_headers,
        json={"content": "También tenemos problemas con inventario y stock mínimo."},
    )
    assert resp.status_code == 200, resp.text
    chat2 = resp.json()
    assert chat2["message"]["role"] == "assistant"

    # Step 4: GET session — messages should be reflected in context
    resp = await client.get(f"{BASE}/sessions/{session_id}", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    fetched = resp.json()
    assert fetched["id"] == session_id

    # Step 5: generate blueprint (may already be completed if AI returned one)
    resp = await client.post(
        f"{BASE}/sessions/{session_id}/generate-blueprint",
        headers=auth_headers,
    )
    # If already completed via chat AI response, blueprint may have already
    # been set; generate-blueprint is idempotent in that case
    assert resp.status_code == 200, resp.text
    bp = resp.json()
    assert bp["session_id"] == session_id
    assert "blueprint" in bp
    assert "recommended_package" in bp
    assert isinstance(bp["matched_capabilities"], list)

    # Step 6: GET session — blueprint and status should now be set
    resp = await client.get(f"{BASE}/sessions/{session_id}", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    after_bp = resp.json()
    assert after_bp["blueprint"] is not None
    assert after_bp["recommended_package"] is not None
    assert after_bp["status"] == "completed"

    # Step 7: apply blueprint
    resp = await client.post(
        f"{BASE}/sessions/{session_id}/apply",
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text
    result = resp.json()
    assert result["success"] is True
    assert result["workspace_id"] is not None
    assert isinstance(result["activated_modules"], list)


# ── 2. Session listing returns all created sessions ───────────────────────────

async def test_discovery_sessions_list_includes_created(
    client: AsyncClient, auth_headers: dict
):
    """Create 2 sessions and verify both appear in the list response."""
    s1 = await _create_session(client, auth_headers, industry="retail")
    s2 = await _create_session(client, auth_headers, industry="manufacturing")

    resp = await client.get(f"{BASE}/sessions", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    sessions = resp.json()
    ids = [s["id"] for s in sessions]

    assert s1["id"] in ids, "First created session missing from list"
    assert s2["id"] in ids, "Second created session missing from list"
    assert len(sessions) >= 2


# ── 3. Workspace isolation ────────────────────────────────────────────────────

async def test_discovery_session_not_visible_across_workspaces(
    client: AsyncClient, auth_headers: dict
):
    """Session created in ws1 must not appear in ws2's session list."""
    ws1_session = await _create_session(client, auth_headers)

    # Register a fresh workspace (ws2)
    ws2_headers = await _register_workspace(
        client, "disc-int-iso-d", "disc-int-iso-d@example.com"
    )

    # ws2 should see an empty list
    resp = await client.get(f"{BASE}/sessions", headers=ws2_headers)
    assert resp.status_code == 200, resp.text
    ws2_ids = [s["id"] for s in resp.json()]
    assert ws1_session["id"] not in ws2_ids, (
        "ws1 session should not be visible to ws2"
    )

    # Direct fetch by id should return 404 for ws2
    resp = await client.get(
        f"{BASE}/sessions/{ws1_session['id']}", headers=ws2_headers
    )
    assert resp.status_code == 404


# ── 4. Context auto-detection from chat message ───────────────────────────────

async def test_context_auto_detected_from_chat_message(
    client: AsyncClient, auth_headers: dict
):
    """Session created without industry/size gets them auto-detected from chat."""
    # Create a blank session
    resp = await client.post(f"{BASE}/sessions", headers=auth_headers, json={})
    assert resp.status_code == 201, resp.text
    session_id = resp.json()["id"]
    assert resp.json()["industry"] is None
    assert resp.json()["company_size"] is None

    # Send a message containing retail keywords + size hints
    resp = await client.post(
        f"{BASE}/sessions/{session_id}/messages",
        headers=auth_headers,
        json={"content": "Tengo una tienda de retail con 10 personas en mi equipo y necesito digitalizar."},
    )
    assert resp.status_code == 200, resp.text
    updated_session = resp.json()["session"]

    # The service's _update_context_from_message should have filled these in
    assert updated_session["industry"] == "retail", (
        f"Expected industry='retail', got {updated_session['industry']!r}"
    )
    assert updated_session["company_size"] == "small", (
        f"Expected company_size='small', got {updated_session['company_size']!r}"
    )
    # business_description should be auto-populated if it was empty and message > 20 chars
    assert updated_session["business_description"] is not None


# ── 5. Completed session rejects further messages ─────────────────────────────

async def test_completed_session_rejects_new_messages(
    client: AsyncClient, auth_headers: dict
):
    """After generate-blueprint, session status=completed; new messages → 409."""
    session = await _create_session(client, auth_headers)
    session_id = session["id"]

    # Generate blueprint — marks session as completed
    resp = await client.post(
        f"{BASE}/sessions/{session_id}/generate-blueprint",
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text

    # Confirm status is completed
    resp = await client.get(f"{BASE}/sessions/{session_id}", headers=auth_headers)
    assert resp.json()["status"] == "completed"

    # Attempting to send a message should be rejected
    resp = await client.post(
        f"{BASE}/sessions/{session_id}/messages",
        headers=auth_headers,
        json={"content": "Quiero agregar algo más."},
    )
    assert resp.status_code == 409, (
        f"Expected 409 for completed session, got {resp.status_code}: {resp.text}"
    )


# ── 6. Capability catalog structure validation ────────────────────────────────

async def test_capabilities_catalog_has_expected_fields(client: AsyncClient):
    """Each capability must have id, name, description, module, phase, packages."""
    resp = await client.get(f"{BASE}/capabilities")
    assert resp.status_code == 200, resp.text
    caps = resp.json()["capabilities"]
    assert len(caps) > 0

    required_fields = {"id", "name", "description", "pain_points", "module", "phase", "packages"}
    for cap in caps:
        missing = required_fields - set(cap.keys())
        assert not missing, f"Capability {cap.get('id', '?')} missing fields: {missing}"
        assert isinstance(cap["pain_points"], list)
        assert isinstance(cap["packages"], list)
        assert len(cap["id"]) > 0
        assert len(cap["name"]) > 0


async def test_packages_catalog_has_expected_structure(client: AsyncClient):
    """Each solution package must have name, description, price_usd_monthly, modules."""
    resp = await client.get(f"{BASE}/packages")
    assert resp.status_code == 200, resp.text
    packages = resp.json()["packages"]
    assert len(packages) > 0

    required_fields = {"name", "description", "price_usd_monthly", "modules"}
    for pkg_key, pkg in packages.items():
        missing = required_fields - set(pkg.keys())
        assert not missing, f"Package '{pkg_key}' missing fields: {missing}"
        assert isinstance(pkg["modules"], list)
        assert pkg["price_usd_monthly"] > 0
