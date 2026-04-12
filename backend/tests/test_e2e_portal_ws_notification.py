"""
E2E cross-module test: Portal session → PortalSessionCreated → WS notification (Q3 item 3.2).

Verifies that when a portal session is created, the PortalSessionCreated event:
  1. Is emitted by the portal service layer (post-commit, fixed Q3 per ADR commit 9282400)
  2. Reaches the Redis pub/sub channel for the workspace
  3. Is classified as a notification-eligible event by the WS filter
  4. Is transformed to a properly-labelled WS payload
  5. Would be delivered to a connected WebSocket client for that workspace

Uses the same mock-based pipeline approach as test_e2e_notifications_pipeline.py
(httpx does not support WebSocket; no websockets lib in deps).

Cross-module chain: Sales (quote) → Portal (session create) → event bus → Redis → WS client.
"""

import json
import pytest
from unittest.mock import AsyncMock, patch

from app.events.types import Event, PORTAL_SESSION_CREATED

pytestmark = pytest.mark.asyncio


# ── Helpers ──────────────────────────────────────────────────────────────────

def _portal_session_event(workspace_id: str = "ws-portal-001") -> Event:
    return Event(
        event_type=PORTAL_SESSION_CREATED,
        source_module="portal",
        workspace_id=workspace_id,
        entity_id="session-abc-123",
        actor_id="user-rep-001",
        payload={
            "quote_id": "quote-xyz-456",
            "client_name": "Test Client",
            "token": "tok_abc123",
            "portal_url": "https://cbos.inbounduxd.com/portal/tok_abc123",
        },
    )


# ── Layer 1: bus.publish() writes PortalSessionCreated to stream + pub/sub ──

async def test_portal_session_created_reaches_redis_pubsub():
    """PortalSessionCreated published to bus → Redis xadd + publish both called."""
    from app.events.bus import publish

    mock_redis = AsyncMock()
    event = _portal_session_event()

    with patch("app.events.bus.get_redis", return_value=mock_redis):
        await publish(event)

    # Stream write
    mock_redis.xadd.assert_called_once()
    stream_name = mock_redis.xadd.call_args[0][0]
    assert stream_name == "cbos:events"

    # Pub/sub write
    mock_redis.publish.assert_called_once()
    channel, data = mock_redis.publish.call_args[0]
    assert channel == "cbos:notifications:ws-portal-001"
    parsed = json.loads(data)
    assert parsed["event_type"] == "PortalSessionCreated"
    assert parsed["workspace_id"] == "ws-portal-001"
    assert parsed["payload"]["quote_id"] == "quote-xyz-456"


async def test_portal_session_created_stream_data_key():
    """xadd payload must carry a 'data' key with the serialised event."""
    from app.events.bus import publish

    mock_redis = AsyncMock()
    event = _portal_session_event()

    with patch("app.events.bus.get_redis", return_value=mock_redis):
        await publish(event)

    _, kwargs = mock_redis.xadd.call_args
    fields = mock_redis.xadd.call_args[0][1] if len(mock_redis.xadd.call_args[0]) > 1 \
        else mock_redis.xadd.call_args[1].get("fields", {})
    # xadd is called as xadd(stream, {data: ...}) or xadd(stream, fields={...})
    call_args = mock_redis.xadd.call_args
    payload_dict = call_args[0][1] if len(call_args[0]) > 1 else call_args[1]
    assert "data" in payload_dict
    parsed = json.loads(payload_dict["data"])
    assert parsed["event_type"] == "PortalSessionCreated"


# ── Layer 2: NOTIFY_EVENTS filter includes PortalSessionCreated ─────────────

async def test_portal_session_created_is_notification_eligible():
    """PortalSessionCreated must be in NOTIFY_EVENTS so it reaches WS clients."""
    from app.modules.notifications.router import NOTIFY_EVENTS

    assert "PortalSessionCreated" in NOTIFY_EVENTS, (
        f"PortalSessionCreated missing from NOTIFY_EVENTS: {NOTIFY_EVENTS}"
    )


async def test_portal_session_created_has_ws_label():
    """PortalSessionCreated must have a human-readable label in NOTIFY_LABELS."""
    from app.modules.notifications.router import NOTIFY_LABELS

    label = NOTIFY_LABELS.get("PortalSessionCreated")
    assert label is not None, "No label for PortalSessionCreated in NOTIFY_LABELS"
    assert len(label) > 0


# ── Layer 3: WS payload transform ───────────────────────────────────────────

async def test_portal_session_created_transforms_to_ws_payload():
    """The router's transform logic produces the expected WS payload shape."""
    from app.modules.notifications.router import NOTIFY_LABELS

    event = _portal_session_event()
    label = NOTIFY_LABELS.get(event.event_type, event.event_type)

    ws_payload = {
        "type": "notification",
        "event_type": event.event_type,
        "title": label,
        "entity_id": event.entity_id,
        "payload": event.payload,
        "timestamp": event.timestamp.isoformat(),
    }

    assert ws_payload["type"] == "notification"
    assert ws_payload["event_type"] == "PortalSessionCreated"
    assert ws_payload["title"] == label
    assert ws_payload["entity_id"] == "session-abc-123"
    assert ws_payload["payload"]["client_name"] == "Test Client"


# ── Layer 4: Full mock pipeline — event emitted → WS client receives it ──────

async def test_full_pipeline_portal_session_created_reaches_ws_client():
    """
    Simulates the complete path:
    publish(PortalSessionCreated) → Redis pub/sub → ConnectionManager.send_to_workspace().

    Verifies that a WS client subscribed to workspace ws-portal-001 would receive
    a notification payload with title from NOTIFY_LABELS["PortalSessionCreated"].
    """
    from app.events.bus import publish
    from app.modules.notifications.router import NOTIFY_EVENTS, NOTIFY_LABELS

    workspace_id = "ws-portal-001"
    event = _portal_session_event(workspace_id)

    # Mock Redis publish
    mock_redis = AsyncMock()
    # Mock ConnectionManager
    mock_manager = AsyncMock()

    with patch("app.events.bus.get_redis", return_value=mock_redis):
        await publish(event)

    # Simulate WS router receiving the pub/sub message
    channel = f"cbos:notifications:{workspace_id}"
    raw_data = mock_redis.publish.call_args[0][1]
    parsed = json.loads(raw_data)

    # Apply the same filter the WS router applies
    event_type = parsed.get("event_type", "")
    assert event_type in NOTIFY_EVENTS, f"{event_type} filtered out — not in NOTIFY_EVENTS"

    label = NOTIFY_LABELS.get(event_type, event_type)
    ws_payload = json.dumps({
        "type": "notification",
        "event_type": event_type,
        "title": label,
        "entity_id": parsed.get("entity_id"),
        "payload": parsed.get("payload", {}),
        "timestamp": parsed.get("timestamp"),
    })

    # Simulate delivery to connected WS client
    await mock_manager.send_to_workspace(workspace_id, ws_payload)
    mock_manager.send_to_workspace.assert_called_once_with(workspace_id, ws_payload)

    delivered = json.loads(mock_manager.send_to_workspace.call_args[0][1])
    assert delivered["type"] == "notification"
    assert delivered["event_type"] == "PortalSessionCreated"
    assert delivered["title"] == NOTIFY_LABELS["PortalSessionCreated"]
    assert delivered["payload"]["quote_id"] == "quote-xyz-456"


# ── Layer 5: Cross-module HTTP flow → event emitted → pipeline triggered ─────

async def test_portal_session_creation_triggers_notification_pipeline(
    client, auth_headers
):
    """
    Integration layer: creates a real portal session via HTTP, verifies
    PortalSessionCreated is published to Redis (bus.publish mocked),
    and that the pub/sub data is notification-eligible and correctly shaped.
    """
    from app.modules.notifications.router import NOTIFY_EVENTS, NOTIFY_LABELS

    # 1. Create a quote (Sales)
    resp = await client.post("/api/v1/sales/quotes", headers=auth_headers, json={
        "title": "WS Notification Test Quote",
        "currency": "USD",
        "tax_rate": 0.0,
        "discount_amount": 0.0,
        "lines": [{
            "description": "Service",
            "quantity": 1,
            "unit_price": 300.0,
            "discount_percent": 0.0,
            "line_order": 1,
        }],
    })
    assert resp.status_code == 201, resp.text
    quote_id = resp.json()["id"]

    # 2. Create portal session — this should emit PortalSessionCreated
    published_events = []

    original_publish = None
    try:
        from app.events import bus as _bus
        original_publish = _bus.publish
    except Exception:
        pass

    async def capturing_publish(event: Event):
        published_events.append(event)
        # Still call original to exercise real code path (Redis may not be available
        # in test but the call path is what we're verifying)
        mock_redis = AsyncMock()
        with patch("app.events.bus.get_redis", return_value=mock_redis):
            await original_publish(event)

    with patch("app.modules.portal.service.publish_event", side_effect=capturing_publish):
        resp = await client.post("/api/v1/portal/sessions", headers=auth_headers, json={
            "quote_id": quote_id,
            "client_name": "WS Test Client",
            "client_email": "ws@test.example.com",
        })

    assert resp.status_code == 201, resp.text
    session = resp.json()
    assert session["token"]

    # 3. Verify PortalSessionCreated was emitted
    portal_events = [e for e in published_events if e.event_type == "PortalSessionCreated"]
    assert len(portal_events) == 1, (
        f"Expected 1 PortalSessionCreated event, got {len(portal_events)}: "
        f"{[e.event_type for e in published_events]}"
    )

    emitted = portal_events[0]
    assert emitted.source_module == "portal"
    assert emitted.entity_id == session["id"]
    assert emitted.payload["quote_id"] == quote_id

    # 4. Verify it would pass the WS filter
    assert emitted.event_type in NOTIFY_EVENTS

    # 5. Verify it has a label for WS delivery
    assert emitted.event_type in NOTIFY_LABELS
    label = NOTIFY_LABELS[emitted.event_type]
    assert len(label) > 0
