"""
Tests for notification preferences endpoints (GET/PUT /notifications/preferences).
Covers: default values, global toggle, per-event toggles, validation, persistence.
"""
import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

PREFS_URL = "/api/v1/notifications/preferences"


async def test_get_default_preferences(client: AsyncClient, auth_headers: dict):
    """New user should get defaults: email_enabled=True, all events True."""
    resp = await client.get(PREFS_URL, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email_enabled"] is True
    assert isinstance(data["email_events"], dict)
    assert len(data["email_events"]) == 4
    for evt, enabled in data["email_events"].items():
        assert enabled is True, f"{evt} should default to True"


async def test_get_preferences_requires_auth(client: AsyncClient):
    """Endpoint requires authentication."""
    resp = await client.get(PREFS_URL)
    assert resp.status_code == 401


async def test_disable_global_email(client: AsyncClient, auth_headers: dict):
    """Setting email_enabled=False should persist."""
    resp = await client.put(PREFS_URL, json={"email_enabled": False}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email_enabled"] is False

    # Verify persisted
    resp2 = await client.get(PREFS_URL, headers=auth_headers)
    assert resp2.json()["email_enabled"] is False


async def test_enable_global_email(client: AsyncClient, auth_headers: dict):
    """Can toggle back to True."""
    await client.put(PREFS_URL, json={"email_enabled": False}, headers=auth_headers)
    resp = await client.put(PREFS_URL, json={"email_enabled": True}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email_enabled"] is True


async def test_disable_specific_event(client: AsyncClient, auth_headers: dict):
    """Can disable a single event type."""
    resp = await client.put(
        PREFS_URL,
        json={"email_events": {"WorkflowFailed": False}},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    events = resp.json()["email_events"]
    assert events["WorkflowFailed"] is False
    # Others remain True
    assert events["QuoteAccepted"] is True
    assert events["SalesOrderCreated"] is True


async def test_enable_previously_disabled_event(client: AsyncClient, auth_headers: dict):
    """Can re-enable a previously disabled event."""
    await client.put(
        PREFS_URL,
        json={"email_events": {"WorkflowFailed": False}},
        headers=auth_headers,
    )
    resp = await client.put(
        PREFS_URL,
        json={"email_events": {"WorkflowFailed": True}},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["email_events"]["WorkflowFailed"] is True


async def test_invalid_event_type_ignored(client: AsyncClient, auth_headers: dict):
    """Unknown event types are silently ignored."""
    resp = await client.put(
        PREFS_URL,
        json={"email_events": {"NonExistentEvent": False}},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    # Should not appear in response
    assert "NonExistentEvent" not in resp.json()["email_events"]


async def test_partial_update_preserves_other_fields(client: AsyncClient, auth_headers: dict):
    """Updating only email_events should preserve email_enabled."""
    await client.put(PREFS_URL, json={"email_enabled": False}, headers=auth_headers)
    resp = await client.put(
        PREFS_URL,
        json={"email_events": {"QuoteAccepted": False}},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    # email_enabled should still be False (not reset)
    assert data["email_enabled"] is False
    assert data["email_events"]["QuoteAccepted"] is False


async def test_response_always_includes_all_events(client: AsyncClient, auth_headers: dict):
    """Response should always list all 4 EMAIL_NOTIFY_EVENTS, even if only some were set."""
    resp = await client.put(
        PREFS_URL,
        json={"email_events": {"QuoteAccepted": False}},
        headers=auth_headers,
    )
    events = resp.json()["email_events"]
    expected_events = {
        "InventoryLowThresholdDetected",
        "QuoteAccepted",
        "SalesOrderCreated",
        "WorkflowFailed",
    }
    assert set(events.keys()) == expected_events


async def test_multiple_events_toggled_at_once(client: AsyncClient, auth_headers: dict):
    """Can toggle multiple events in a single request."""
    resp = await client.put(
        PREFS_URL,
        json={
            "email_events": {
                "QuoteAccepted": False,
                "SalesOrderCreated": False,
                "WorkflowFailed": True,
            }
        },
        headers=auth_headers,
    )
    assert resp.status_code == 200
    events = resp.json()["email_events"]
    assert events["QuoteAccepted"] is False
    assert events["SalesOrderCreated"] is False
    assert events["WorkflowFailed"] is True
    assert events["InventoryLowThresholdDetected"] is True  # Untouched default
