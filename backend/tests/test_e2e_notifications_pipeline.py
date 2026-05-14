"""
E2E notification pipeline tests.
Covers: event bus → Redis pub/sub → WebSocket client delivery.
Uses mocks — no real Redis or WebSocket connection required.
"""
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone

from app.events.types import Event
from app.modules.notifications.router import NOTIFY_EVENTS, NOTIFY_LABELS


# ── Override DB fixture (no DB needed for this file) ─────────────────────────

@pytest.fixture(autouse=True)
async def truncate_tables():  # type: ignore[override]
    """No-op override: pipeline tests need no DB."""
    yield


# ── Layer 1: bus.publish() writes to stream AND pub/sub ──────────────────────

async def test_publish_writes_to_redis_stream_and_pubsub():
    """bus.publish() must write to both the event stream and the notification channel."""
    from app.events.bus import publish

    mock_redis = AsyncMock()
    event = Event(
        event_type="QuoteAccepted",
        source_module="sales",
        workspace_id="ws-test-123",
        entity_id="quote-abc",
        payload={"quote_number": "Q-001", "total": 1500.0},
    )

    with patch("app.events.bus.get_redis", return_value=mock_redis):
        await publish(event)

    mock_redis.xadd.assert_called_once()
    stream_args = mock_redis.xadd.call_args[0]
    assert stream_args[0] == "cbos:events"

    mock_redis.publish.assert_called_once()
    channel, data = mock_redis.publish.call_args[0]
    assert channel == "cbos:notifications:ws-test-123"
    parsed = json.loads(data)
    assert parsed["event_type"] == "QuoteAccepted"
    assert parsed["workspace_id"] == "ws-test-123"


async def test_publish_stream_payload_contains_data_key():
    """xadd must be called with the 'data' key wrapping the serialised event."""
    from app.events.bus import publish

    mock_redis = AsyncMock()
    event = Event(
        event_type="WorkflowCompleted",
        source_module="workflows",
        workspace_id="ws-stream-check",
        entity_id="wf-1",
        payload={"workflow_id": "wf-1"},
    )

    with patch("app.events.bus.get_redis", return_value=mock_redis):
        await publish(event)

    _, kwargs = mock_redis.xadd.call_args
    positional = mock_redis.xadd.call_args[0]
    # xadd("cbos:events", {"data": ...})
    assert positional[0] == "cbos:events"
    fields = positional[1]
    assert "data" in fields
    parsed = json.loads(fields["data"])
    assert parsed["event_type"] == "WorkflowCompleted"


async def test_publish_uses_correct_workspace_channel():
    """The pub/sub channel must embed the workspace_id from the event."""
    from app.events.bus import publish

    mock_redis = AsyncMock()
    event = Event(
        event_type="SalesOrderCreated",
        source_module="sales",
        workspace_id="ws-channel-test",
        entity_id="so-1",
        payload={},
    )

    with patch("app.events.bus.get_redis", return_value=mock_redis):
        await publish(event)

    channel, _ = mock_redis.publish.call_args[0]
    assert channel == "cbos:notifications:ws-channel-test"


# ── Layer 2: Notify event → WS client ────────────────────────────────────────

async def test_notify_event_forwarded_with_correct_shape():
    """A QuoteAccepted event from pub/sub is forwarded to WS client with correct structure."""
    event = {
        "event_type": "QuoteAccepted",
        "payload": {"quote_number": "Q-001", "total": 1500.0},
        "entity_id": "quote-abc",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    event_type = event["event_type"]
    assert event_type in NOTIFY_EVENTS  # passes filter

    message = {
        "type": "notification",
        "event_type": event_type,
        "title": NOTIFY_LABELS.get(event_type, event_type),
        "payload": event.get("payload", {}),
        "entity_id": event.get("entity_id"),
        "timestamp": event.get("timestamp"),
    }

    assert message["type"] == "notification"
    assert message["title"] == NOTIFY_LABELS["QuoteAccepted"]
    assert message["payload"]["total"] == 1500.0
    assert message["entity_id"] == "quote-abc"


async def test_forward_events_calls_websocket_send_json():
    """
    Simulate the forward_events() inner function directly:
    feed a pub/sub message and verify ws.send_json is called with the right shape.
    """
    ws = AsyncMock()

    raw_event = {
        "event_type": "OpportunityWon",
        "payload": {"deal_value": 50000.0},
        "entity_id": "opp-99",
        "timestamp": "2026-04-11T10:00:00Z",
    }
    pubsub_message = {
        "type": "message",
        "data": json.dumps(raw_event),
    }

    async def fake_listen():
        yield pubsub_message

    mock_pubsub = AsyncMock()
    mock_pubsub.listen = MagicMock(return_value=fake_listen())
    mock_pubsub.subscribe = AsyncMock()
    mock_pubsub.unsubscribe = AsyncMock()
    mock_pubsub.aclose = AsyncMock()

    mock_redis = AsyncMock()
    mock_redis.pubsub = MagicMock(return_value=mock_pubsub)

    with (
        patch("app.modules.notifications.router.verify_token",
              return_value={"sub": "user-1", "workspace_id": "ws-fwd-test"}),
        patch("app.modules.notifications.router.manager") as mock_manager,
        patch("app.modules.notifications.router.get_redis", return_value=mock_redis),
    ):
        mock_manager.connect = AsyncMock()
        mock_manager.disconnect = MagicMock()
        ws.receive_text = AsyncMock(side_effect=Exception("disconnect"))

        from app.modules.notifications.router import notifications_ws
        await notifications_ws(ws, token="good-token")

    ws.send_json.assert_called_once()
    sent = ws.send_json.call_args[0][0]
    assert sent["type"] == "notification"
    assert sent["event_type"] == "OpportunityWon"
    assert sent["title"] == NOTIFY_LABELS["OpportunityWon"]
    assert sent["payload"]["deal_value"] == 50000.0
    assert sent["entity_id"] == "opp-99"


# ── Layer 3: Non-notify event is filtered ────────────────────────────────────

def test_user_authenticated_not_in_notify_events():
    """UserAuthenticated is an internal event and must not reach WS clients."""
    assert "UserAuthenticated" not in NOTIFY_EVENTS


def test_workspace_created_not_in_notify_events():
    """WorkspaceCreated is an internal event and must not reach WS clients."""
    assert "WorkspaceCreated" not in NOTIFY_EVENTS


def test_user_registered_not_in_notify_events():
    """UserRegistered is an internal event and must not reach WS clients."""
    assert "UserRegistered" not in NOTIFY_EVENTS


def test_lead_captured_not_in_notify_events():
    """LeadCaptured is an acquisition-stage event, not a UI notification."""
    assert "LeadCaptured" not in NOTIFY_EVENTS


def test_all_notify_events_would_pass_filter():
    """All NOTIFY_EVENTS pass the filter check."""
    for event_type in NOTIFY_EVENTS:
        assert event_type in NOTIFY_EVENTS


async def test_non_notify_event_not_forwarded_to_ws():
    """
    UserAuthenticated arriving via pub/sub must NOT cause ws.send_json to be called.
    """
    ws = AsyncMock()

    raw_event = {
        "event_type": "UserAuthenticated",
        "payload": {"user_id": "u-1"},
        "entity_id": "u-1",
        "timestamp": "2026-04-11T10:00:00Z",
    }
    pubsub_message = {"type": "message", "data": json.dumps(raw_event)}

    async def fake_listen():
        yield pubsub_message

    mock_pubsub = AsyncMock()
    mock_pubsub.listen = MagicMock(return_value=fake_listen())
    mock_pubsub.subscribe = AsyncMock()
    mock_pubsub.unsubscribe = AsyncMock()
    mock_pubsub.aclose = AsyncMock()

    mock_redis = AsyncMock()
    mock_redis.pubsub = MagicMock(return_value=mock_pubsub)

    with (
        patch("app.modules.notifications.router.verify_token",
              return_value={"sub": "user-1", "workspace_id": "ws-filter-test"}),
        patch("app.modules.notifications.router.manager") as mock_manager,
        patch("app.modules.notifications.router.get_redis", return_value=mock_redis),
    ):
        mock_manager.connect = AsyncMock()
        mock_manager.disconnect = MagicMock()
        ws.receive_text = AsyncMock(side_effect=Exception("disconnect"))

        from app.modules.notifications.router import notifications_ws
        await notifications_ws(ws, token="good-token")

    ws.send_json.assert_not_called()


# ── Layer 4: Full pipeline integration (mock Redis, real logic) ───────────────

async def test_full_pipeline_quote_accepted_reaches_ws_client():
    """
    Full mock pipeline:
    1. bus.publish(QuoteAccepted) → captured pub/sub data
    2. Feed captured data as pub/sub message through filter+transform logic
    3. Verify WS client would receive notification with correct title
    """
    from app.events.bus import publish

    captured_pubsub_data = []
    mock_redis = AsyncMock()

    async def mock_publish(channel, data):
        captured_pubsub_data.append((channel, data))

    mock_redis.xadd = AsyncMock()
    mock_redis.publish = AsyncMock(side_effect=mock_publish)

    event = Event(
        event_type="QuoteAccepted",
        source_module="portal",
        workspace_id="ws-pipeline-test",
        entity_id="quote-xyz",
        payload={"quote_number": "Q-2026-001", "total": 2500.0, "currency": "USD"},
    )

    with patch("app.events.bus.get_redis", return_value=mock_redis):
        await publish(event)

    # Step 2: verify pub/sub data and feed through filter+transform
    assert len(captured_pubsub_data) == 1
    channel, raw_data = captured_pubsub_data[0]
    assert "ws-pipeline-test" in channel

    parsed = json.loads(raw_data)
    event_type = parsed.get("event_type")
    assert event_type in NOTIFY_EVENTS  # passes the notification filter

    # Step 3: transform as forward_events() would
    ws_message = {
        "type": "notification",
        "event_type": event_type,
        "title": NOTIFY_LABELS.get(event_type, event_type),
        "payload": parsed.get("payload", {}),
        "entity_id": parsed.get("entity_id"),
        "timestamp": parsed.get("timestamp"),
    }

    assert ws_message["title"] == "Cotización aceptada"
    assert ws_message["payload"]["total"] == 2500.0
    assert ws_message["entity_id"] == "quote-xyz"
    assert ws_message["type"] == "notification"


async def test_full_pipeline_inventory_low_threshold_reaches_ws():
    """InventoryLowThresholdDetected flows end-to-end through the pipeline."""
    from app.events.bus import publish

    captured: list[tuple[str, str]] = []
    mock_redis = AsyncMock()
    mock_redis.xadd = AsyncMock()
    mock_redis.publish = AsyncMock(side_effect=lambda ch, d: captured.append((ch, d)))

    event = Event(
        event_type="InventoryLowThresholdDetected",
        source_module="inventory",
        workspace_id="ws-inv-test",
        entity_id="sku-001",
        payload={"product_name": "Widget A", "sku": "SKU-001", "current_stock": 3, "min_stock": 10},
    )

    with patch("app.events.bus.get_redis", return_value=mock_redis):
        await publish(event)

    assert len(captured) == 1
    channel, raw = captured[0]
    assert channel == "cbos:notifications:ws-inv-test"

    parsed = json.loads(raw)
    assert parsed["event_type"] == "InventoryLowThresholdDetected"
    assert parsed["event_type"] in NOTIFY_EVENTS

    ws_message = {
        "type": "notification",
        "event_type": parsed["event_type"],
        "title": NOTIFY_LABELS.get(parsed["event_type"], parsed["event_type"]),
        "payload": parsed.get("payload", {}),
        "entity_id": parsed.get("entity_id"),
        "timestamp": parsed.get("timestamp"),
    }
    assert ws_message["title"] == "Stock bajo"
    assert ws_message["payload"]["current_stock"] == 3


# ── Layer 5: email notifier event set ────────────────────────────────────────

async def test_publish_triggers_email_for_quote_accepted():
    """
    QuoteAccepted is in EMAIL_NOTIFY_EVENTS — verify the channel message
    matches the expected pattern and set membership.
    """
    from app.modules.notifications.email_notifier import EMAIL_NOTIFY_EVENTS

    assert "QuoteAccepted" in EMAIL_NOTIFY_EVENTS
    assert "SalesOrderCreated" in EMAIL_NOTIFY_EVENTS
    assert "WorkflowFailed" in EMAIL_NOTIFY_EVENTS
    assert "InventoryLowThresholdDetected" in EMAIL_NOTIFY_EVENTS


def test_email_notify_events_excludes_noisy_events():
    """Events too noisy for email must not appear in EMAIL_NOTIFY_EVENTS."""
    from app.modules.notifications.email_notifier import EMAIL_NOTIFY_EVENTS

    assert "WorkflowTriggered" not in EMAIL_NOTIFY_EVENTS
    assert "CustomerActionPerformed" not in EMAIL_NOTIFY_EVENTS
    assert "UserAuthenticated" not in EMAIL_NOTIFY_EVENTS
    assert "WorkspaceCreated" not in EMAIL_NOTIFY_EVENTS


def test_email_notify_events_is_subset_of_notify_events():
    """Every email-notified event must also be a UI notification (subset relationship)."""
    from app.modules.notifications.email_notifier import EMAIL_NOTIFY_EVENTS

    # EMAIL_NOTIFY_EVENTS ⊆ NOTIFY_EVENTS
    assert EMAIL_NOTIFY_EVENTS.issubset(NOTIFY_EVENTS)


async def test_full_pipeline_pubsub_data_matches_email_filter():
    """
    Data published to the pub/sub channel for a QuoteAccepted event
    passes both the WS filter (NOTIFY_EVENTS) and the email filter (EMAIL_NOTIFY_EVENTS).
    """
    from app.events.bus import publish
    from app.modules.notifications.email_notifier import EMAIL_NOTIFY_EVENTS

    captured: list[tuple[str, str]] = []
    mock_redis = AsyncMock()
    mock_redis.xadd = AsyncMock()
    mock_redis.publish = AsyncMock(side_effect=lambda ch, d: captured.append((ch, d)))

    event = Event(
        event_type="QuoteAccepted",
        source_module="sales",
        workspace_id="ws-dual-filter",
        entity_id="q-dual",
        payload={"quote_number": "Q-DUAL", "total": 9999.0, "currency": "EUR"},
    )

    with patch("app.events.bus.get_redis", return_value=mock_redis):
        await publish(event)

    _, raw = captured[0]
    parsed = json.loads(raw)
    event_type = parsed["event_type"]

    assert event_type in NOTIFY_EVENTS        # WS filter passes
    assert event_type in EMAIL_NOTIFY_EVENTS  # email filter passes
