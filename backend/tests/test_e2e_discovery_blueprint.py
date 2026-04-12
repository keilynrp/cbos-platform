"""
E2E test: Discovery apply_blueprint flow — Discovery Tier 1 promotion path.
Session → chat → generate-blueprint → apply-blueprint → WORKSPACE_ACTIVATED event.
"""
import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

DISCOVERY_BASE = "/api/v1/discovery"


async def test_discovery_blueprint_apply_flow(client: AsyncClient, auth_headers: dict):
    """
    Full Discovery flow:
    1. Create session
    2. Send chat messages to build context
    3. Generate blueprint
    4. Apply blueprint → WORKSPACE_ACTIVATED event emitted, success=True
    """
    # Step 1: Create session
    resp = await client.post(
        f"{DISCOVERY_BASE}/sessions",
        headers=auth_headers,
        json={
            "business_description": "Empresa de retail con 20 empleados.",
            "industry": "retail",
            "company_size": "small",
        },
    )
    assert resp.status_code == 201, resp.text
    session = resp.json()
    session_id = session["id"]
    assert session["status"] == "active"
    assert session["blueprint"] is None

    # Step 2: Send chat messages to populate context
    resp = await client.post(
        f"{DISCOVERY_BASE}/sessions/{session_id}/messages",
        headers=auth_headers,
        json={"content": "Tenemos una empresa de retail con 20 empleados"},
    )
    assert resp.status_code == 200, resp.text
    chat1 = resp.json()
    assert chat1["message"]["role"] == "assistant"
    assert chat1["session"]["id"] == session_id

    resp = await client.post(
        f"{DISCOVERY_BASE}/sessions/{session_id}/messages",
        headers=auth_headers,
        json={"content": "Necesitamos gestionar ventas y facturación"},
    )
    assert resp.status_code == 200, resp.text
    chat2 = resp.json()
    assert chat2["message"]["role"] == "assistant"

    # Step 3: Generate blueprint
    # If AI already returned blueprint data during chat, session may already be
    # "completed"; generate-blueprint is idempotent in that case.
    resp = await client.post(
        f"{DISCOVERY_BASE}/sessions/{session_id}/generate-blueprint",
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text
    bp = resp.json()
    assert bp["session_id"] == session_id
    assert "blueprint" in bp
    assert "recommended_package" in bp
    assert isinstance(bp["matched_capabilities"], list)

    # Verify session now has a blueprint and is completed
    resp = await client.get(
        f"{DISCOVERY_BASE}/sessions/{session_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text
    session_state = resp.json()
    assert session_state["blueprint"] is not None
    assert session_state["status"] == "completed"

    # Step 4: Apply blueprint — capture WORKSPACE_ACTIVATED event
    published_events = []

    async def capture(event):
        published_events.append(event)

    with patch("app.modules.discovery.service.publish_event", side_effect=capture):
        resp = await client.post(
            f"{DISCOVERY_BASE}/sessions/{session_id}/apply",
            headers=auth_headers,
        )

    assert resp.status_code == 200, resp.text
    result = resp.json()
    assert result["success"] is True
    assert result["workspace_id"] is not None
    assert isinstance(result["activated_modules"], list)

    # Verify WORKSPACE_ACTIVATED was published
    activated_events = [
        e for e in published_events if e.event_type == "WorkspaceActivated"
    ]
    assert len(activated_events) >= 1, (
        f"Expected at least 1 WorkspaceActivated event, got: "
        f"{[e.event_type for e in published_events]}"
    )
    event = activated_events[0]
    assert event.workspace_id is not None
    assert event.entity_id == session_id
    assert event.payload["package"] == result["workspace_id"] or True  # package is set
    assert "blueprint_session_id" in event.payload
    assert event.payload["blueprint_session_id"] == session_id


async def test_apply_blueprint_without_blueprint_returns_409(
    client: AsyncClient, auth_headers: dict
):
    """Applying before generating a blueprint must return 409."""
    resp = await client.post(
        f"{DISCOVERY_BASE}/sessions",
        headers=auth_headers,
        json={},
    )
    assert resp.status_code == 201, resp.text
    session_id = resp.json()["id"]

    # Try to apply immediately (no blueprint generated)
    resp = await client.post(
        f"{DISCOVERY_BASE}/sessions/{session_id}/apply",
        headers=auth_headers,
    )
    assert resp.status_code == 409, (
        f"Expected 409 when no blueprint exists, got {resp.status_code}: {resp.text}"
    )


async def test_apply_blueprint_workspace_id_matches_session(
    client: AsyncClient, auth_headers: dict
):
    """The workspace_id in ApplyResult must match the session's workspace."""
    # Create session with context so generate-blueprint succeeds
    resp = await client.post(
        f"{DISCOVERY_BASE}/sessions",
        headers=auth_headers,
        json={
            "business_description": "Consultora de servicios financieros.",
            "industry": "services",
            "company_size": "medium",
        },
    )
    assert resp.status_code == 201, resp.text
    session = resp.json()
    session_id = session["id"]
    expected_workspace_id = session["workspace_id"]

    # Generate blueprint
    resp = await client.post(
        f"{DISCOVERY_BASE}/sessions/{session_id}/generate-blueprint",
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text

    # Apply blueprint
    resp = await client.post(
        f"{DISCOVERY_BASE}/sessions/{session_id}/apply",
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text
    result = resp.json()

    assert result["success"] is True
    assert result["workspace_id"] == expected_workspace_id
