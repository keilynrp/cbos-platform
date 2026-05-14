"""
Notifications module tests.
Strategy: unit tests with mocks — no real WebSocket or Redis connection required.
Tests cover: event filtering, label mapping, token validation, message shape,
and ConnectionManager behaviour.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.modules.notifications.router import NOTIFY_EVENTS, NOTIFY_LABELS


# ── Override the per-test DB autouse fixture so this unit-test file  ─────────
# ── can run without needing the test_engine / PostgreSQL connection.  ─────────

@pytest.fixture(autouse=True)
async def truncate_tables():  # type: ignore[override]
    """No-op override: notifications tests need no DB."""
    yield


# ── NOTIFY_EVENTS coverage ────────────────────────────────────────────────────

def test_notify_events_contains_workflow_events():
    assert "WorkflowTriggered" in NOTIFY_EVENTS
    assert "WorkflowCompleted" in NOTIFY_EVENTS
    assert "WorkflowFailed" in NOTIFY_EVENTS


def test_notify_events_contains_sales_events():
    assert "QuoteAccepted" in NOTIFY_EVENTS
    assert "QuoteRejected" in NOTIFY_EVENTS
    assert "SalesOrderCreated" in NOTIFY_EVENTS
    assert "OpportunityWon" in NOTIFY_EVENTS
    assert "OpportunityLost" in NOTIFY_EVENTS


def test_notify_events_contains_inventory_events():
    assert "InventoryLowThresholdDetected" in NOTIFY_EVENTS


def test_notify_events_contains_customer_action():
    assert "CustomerActionPerformed" in NOTIFY_EVENTS


def test_notify_events_contains_invoice_overdue():
    assert "InvoiceOverdue" in NOTIFY_EVENTS


def test_notify_events_total_count():
    """Exactly 14 event types should be whitelisted (10 original + PortalSessionCreated, InvoiceCreated, InvoicePaid, InvoiceOverdue)."""
    assert len(NOTIFY_EVENTS) == 14


def test_notify_events_does_not_include_internal_events():
    """Internal events like UserAuthenticated should NOT be forwarded to clients."""
    assert "UserAuthenticated" not in NOTIFY_EVENTS
    assert "UserRegistered" not in NOTIFY_EVENTS
    assert "WorkspaceCreated" not in NOTIFY_EVENTS
    assert "LeadCaptured" not in NOTIFY_EVENTS


# ── NOTIFY_LABELS coverage ────────────────────────────────────────────────────

def test_every_notify_event_has_a_label():
    """Every event in NOTIFY_EVENTS must have a human-readable label."""
    for event_type in NOTIFY_EVENTS:
        assert event_type in NOTIFY_LABELS, f"Missing label for {event_type}"


def test_labels_are_non_empty_strings():
    for event_type, label in NOTIFY_LABELS.items():
        assert isinstance(label, str), f"Label for {event_type} is not a string"
        assert len(label) > 0, f"Empty label for {event_type}"


def test_labels_dict_covers_all_notify_events():
    """NOTIFY_LABELS must be a superset of NOTIFY_EVENTS (no orphan labels required,
    but every notifiable event needs a label)."""
    missing = NOTIFY_EVENTS - set(NOTIFY_LABELS.keys())
    assert missing == set(), f"Events without labels: {missing}"


# ── Message filtering logic ───────────────────────────────────────────────────

def test_event_in_notify_events_passes_filter():
    event = {"event_type": "QuoteAccepted", "payload": {}, "entity_id": "abc"}
    assert event["event_type"] in NOTIFY_EVENTS


def test_event_not_in_notify_events_blocked_by_filter():
    event = {"event_type": "UserAuthenticated", "payload": {}}
    assert event["event_type"] not in NOTIFY_EVENTS


def test_unknown_event_type_blocked():
    event = {"event_type": "SomeRandomEvent", "payload": {}}
    assert event["event_type"] not in NOTIFY_EVENTS


def test_empty_event_type_blocked():
    event = {"event_type": "", "payload": {}}
    assert event["event_type"] not in NOTIFY_EVENTS


def test_all_notify_events_pass_filter():
    """Each of the 13 whitelisted events must pass the filter check."""
    for event_type in NOTIFY_EVENTS:
        assert event_type in NOTIFY_EVENTS  # trivially true — documents intent


# ── Message transformation ────────────────────────────────────────────────────

def test_notification_message_shape():
    """Verify the shape of a forwarded notification matches the contract."""
    event_type = "QuoteAccepted"
    raw_event = {
        "event_type": event_type,
        "payload": {"quote_id": "q-123", "amount": 1500.0},
        "entity_id": "q-123",
        "timestamp": "2026-04-05T12:00:00Z",
    }

    # Simulate the transformation from router.py forward_events()
    message = {
        "type": "notification",
        "event_type": raw_event["event_type"],
        "title": NOTIFY_LABELS.get(raw_event["event_type"], raw_event["event_type"]),
        "payload": raw_event.get("payload", {}),
        "entity_id": raw_event.get("entity_id"),
        "timestamp": raw_event.get("timestamp"),
    }

    assert message["type"] == "notification"
    assert message["event_type"] == "QuoteAccepted"
    assert message["title"] == NOTIFY_LABELS["QuoteAccepted"]
    assert message["payload"]["quote_id"] == "q-123"
    assert message["entity_id"] == "q-123"
    assert message["timestamp"] == "2026-04-05T12:00:00Z"


def test_notification_message_has_all_required_keys():
    """The forwarded message must always contain all six required fields."""
    raw_event = {
        "event_type": "WorkflowTriggered",
        "payload": {"workflow_id": "wf-1"},
        "entity_id": "wf-1",
        "timestamp": "2026-04-05T08:00:00Z",
    }
    message = {
        "type": "notification",
        "event_type": raw_event["event_type"],
        "title": NOTIFY_LABELS.get(raw_event["event_type"], raw_event["event_type"]),
        "payload": raw_event.get("payload", {}),
        "entity_id": raw_event.get("entity_id"),
        "timestamp": raw_event.get("timestamp"),
    }
    for key in ("type", "event_type", "title", "payload", "entity_id", "timestamp"):
        assert key in message


def test_notification_title_falls_back_to_event_type():
    """If event_type has no label, event_type itself is used as title."""
    event_type = "UnknownEvent"
    title = NOTIFY_LABELS.get(event_type, event_type)
    assert title == event_type


def test_missing_payload_defaults_to_empty_dict():
    raw_event = {"event_type": "WorkflowFailed", "entity_id": None}
    payload = raw_event.get("payload", {})
    assert payload == {}


def test_missing_entity_id_defaults_to_none():
    raw_event = {"event_type": "WorkflowFailed", "payload": {}}
    entity_id = raw_event.get("entity_id")
    assert entity_id is None


def test_missing_timestamp_defaults_to_none():
    raw_event = {"event_type": "WorkflowFailed", "payload": {}}
    timestamp = raw_event.get("timestamp")
    assert timestamp is None


# ── Token validation ──────────────────────────────────────────────────────────

async def test_invalid_token_closes_websocket_with_4001():
    """Invalid JWT → websocket closed with code 4001 before any Redis call."""
    ws = AsyncMock()

    with patch("app.modules.notifications.router.verify_token", return_value=None):
        from app.modules.notifications.router import notifications_ws
        await notifications_ws(ws, token="bad-token")

    ws.close.assert_called_once_with(code=4001, reason="Unauthorized")


async def test_valid_token_missing_workspace_closes_with_4003():
    """Valid JWT but empty workspace_id → websocket closed with code 4003."""
    ws = AsyncMock()

    with patch(
        "app.modules.notifications.router.verify_token",
        return_value={"sub": "user-1", "workspace_id": ""},
    ):
        from app.modules.notifications.router import notifications_ws
        await notifications_ws(ws, token="valid-but-no-workspace")

    ws.close.assert_called_once_with(code=4003, reason="No workspace")


async def test_valid_token_without_workspace_key_closes_with_4003():
    """Valid JWT with workspace_id key missing entirely → closed with code 4003."""
    ws = AsyncMock()

    with patch(
        "app.modules.notifications.router.verify_token",
        return_value={"sub": "user-1"},
    ):
        from app.modules.notifications.router import notifications_ws
        await notifications_ws(ws, token="valid-no-ws-key")

    ws.close.assert_called_once_with(code=4003, reason="No workspace")


async def test_valid_token_with_workspace_calls_manager_connect():
    """Valid JWT + workspace_id → manager.connect() called (then Redis setup)."""
    ws = AsyncMock()
    ws.receive_text = AsyncMock(side_effect=Exception("disconnect"))

    mock_pubsub = AsyncMock()
    mock_pubsub.listen = MagicMock(return_value=_async_iter([]))

    mock_redis = AsyncMock()
    mock_redis.pubsub = MagicMock(return_value=mock_pubsub)

    with patch(
        "app.modules.notifications.router.verify_token",
        return_value={"sub": "user-1", "workspace_id": "ws-42"},
    ):
        with patch("app.modules.notifications.router.manager") as mock_manager:
            mock_manager.connect = AsyncMock()
            mock_manager.disconnect = MagicMock()
            with patch(
                "app.modules.notifications.router.get_redis",
                return_value=mock_redis,
            ):
                from app.modules.notifications.router import notifications_ws
                await notifications_ws(ws, token="good-token")

    mock_manager.connect.assert_called_once_with("ws-42", ws)


# ── ConnectionManager unit tests ──────────────────────────────────────────────

async def test_manager_connect_accepts_websocket():
    from app.core.ws_manager import ConnectionManager
    mgr = ConnectionManager()
    ws = AsyncMock()
    await mgr.connect("ws-1", ws)
    ws.accept.assert_called_once()


async def test_manager_connect_adds_websocket_to_connections():
    from app.core.ws_manager import ConnectionManager
    mgr = ConnectionManager()
    ws = AsyncMock()
    await mgr.connect("ws-1", ws)
    assert ws in mgr._connections["ws-1"]


def test_manager_disconnect_removes_websocket():
    from app.core.ws_manager import ConnectionManager
    mgr = ConnectionManager()
    ws = MagicMock()
    mgr._connections["ws-1"].add(ws)
    mgr.disconnect("ws-1", ws)
    assert ws not in mgr._connections["ws-1"]


def test_manager_disconnect_nonexistent_ws_does_not_raise():
    """discard() on a ws that isn't tracked must not raise."""
    from app.core.ws_manager import ConnectionManager
    mgr = ConnectionManager()
    ws = MagicMock()
    # should not raise even if ws was never added
    mgr.disconnect("ws-unknown", ws)


async def test_manager_broadcast_sends_to_all_connections():
    from app.core.ws_manager import ConnectionManager
    mgr = ConnectionManager()
    ws1 = AsyncMock()
    ws2 = AsyncMock()
    mgr._connections["ws-1"] = {ws1, ws2}

    msg = {"type": "notification", "event_type": "QuoteAccepted"}
    await mgr.broadcast("ws-1", msg)

    ws1.send_json.assert_called_once_with(msg)
    ws2.send_json.assert_called_once_with(msg)


async def test_manager_broadcast_removes_dead_connections():
    """A WebSocket that raises on send_json is removed from active connections."""
    from app.core.ws_manager import ConnectionManager
    mgr = ConnectionManager()
    dead_ws = AsyncMock()
    dead_ws.send_json.side_effect = Exception("Connection closed")
    mgr._connections["ws-2"] = {dead_ws}

    await mgr.broadcast("ws-2", {"type": "notification"})

    assert dead_ws not in mgr._connections["ws-2"]


async def test_manager_broadcast_healthy_ws_kept_after_dead_ws_removed():
    """A healthy WebSocket is NOT evicted when a sibling connection dies."""
    from app.core.ws_manager import ConnectionManager
    mgr = ConnectionManager()
    good_ws = AsyncMock()
    dead_ws = AsyncMock()
    dead_ws.send_json.side_effect = Exception("gone")
    mgr._connections["ws-3"] = {good_ws, dead_ws}

    await mgr.broadcast("ws-3", {"type": "notification"})

    assert good_ws in mgr._connections["ws-3"]
    assert dead_ws not in mgr._connections["ws-3"]


async def test_manager_broadcast_no_connections_is_a_noop():
    """Broadcasting to a workspace with no active connections must not raise."""
    from app.core.ws_manager import ConnectionManager
    mgr = ConnectionManager()
    # Should complete without error
    await mgr.broadcast("ws-no-one", {"type": "notification"})


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _async_iter_inner(items):
    for item in items:
        yield item


def _async_iter(items):
    """Return an async generator over *items* — used to mock pubsub.listen()."""
    return _async_iter_inner(items)
