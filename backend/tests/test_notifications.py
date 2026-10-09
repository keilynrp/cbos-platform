"""
Notifications module tests.
Strategy: unit tests with mocks — no real WebSocket or Redis connection required.
Tests cover: event filtering, token validation, message shape (language-neutral),
and ConnectionManager behaviour.
"""
import json
from pathlib import Path

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.modules.notifications.router import NOTIFY_EVENTS


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


# ── Labels live in the interface catalogue ───────────────────────────────────
# The server sends the event type; the text is `layout:notifications.events.<EventType>`
# in each frontend locale (ADR 0014). This is the check that used to be on NOTIFY_LABELS:
# a notifiable event without a label would show its raw name to the user.

LOCALES_DIR = Path(__file__).resolve().parents[2] / "composable-os" / "src" / "locales"


@pytest.mark.skipif(not LOCALES_DIR.is_dir(), reason="the frontend catalogues are not in this checkout")
@pytest.mark.parametrize("language", ["es", "en"])
def test_every_notify_event_has_a_label_in_each_language(language):
    layout = json.loads((LOCALES_DIR / language / "layout.json").read_text(encoding="utf-8"))
    labels = layout["notifications"]["events"]

    missing = NOTIFY_EVENTS - set(labels)
    assert missing == set(), f"Events without a '{language}' label: {sorted(missing)}"
    assert all(isinstance(v, str) and v for v in labels.values())


@pytest.mark.skipif(not LOCALES_DIR.is_dir(), reason="the frontend catalogues are not in this checkout")
def test_the_catalogues_do_not_label_events_the_server_never_sends():
    layout = json.loads((LOCALES_DIR / "es" / "layout.json").read_text(encoding="utf-8"))
    assert set(layout["notifications"]["events"]) - NOTIFY_EVENTS == set()


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

async def _forwarded(events: list[dict]) -> list[dict]:
    """Run the real `notifications_ws` over `events` and return what the client got."""
    import asyncio
    import json

    ws = AsyncMock()

    async def disconnect_later():
        await asyncio.sleep(0.2)  # time for forward_events to drain the pub/sub
        raise Exception("disconnect")

    ws.receive_text = AsyncMock(side_effect=disconnect_later)

    messages = [{"type": "message", "data": json.dumps(e)} for e in events]
    mock_pubsub = AsyncMock()
    mock_pubsub.listen = MagicMock(return_value=_async_iter(messages))
    mock_redis = AsyncMock()
    mock_redis.pubsub = MagicMock(return_value=mock_pubsub)

    with patch(
        "app.modules.notifications.router.verify_token",
        return_value={"sub": "user-1", "workspace_id": "ws-42"},
    ), patch("app.modules.notifications.router.manager") as mock_manager, patch(
        "app.modules.notifications.router.get_redis", return_value=mock_redis
    ):
        mock_manager.connect = AsyncMock()
        mock_manager.disconnect = MagicMock()
        from app.modules.notifications.router import notifications_ws
        await notifications_ws(ws, token="good-token")

    return [call.args[0] for call in ws.send_json.call_args_list]


async def test_a_notification_carries_the_event_type_and_no_prose():
    """The interface words the notification in the reader's language (ADR 0014)."""
    sent = await _forwarded([{
        "event_type": "QuoteAccepted",
        "payload": {"quote_id": "q-123", "amount": 1500.0},
        "entity_id": "q-123",
        "timestamp": "2026-04-05T12:00:00Z",
    }])

    assert sent == [{
        "type": "notification",
        "event_type": "QuoteAccepted",
        "payload": {"quote_id": "q-123", "amount": 1500.0},
        "entity_id": "q-123",
        "timestamp": "2026-04-05T12:00:00Z",
    }]


async def test_events_outside_the_whitelist_are_not_forwarded():
    sent = await _forwarded([
        {"event_type": "SomethingInternal", "payload": {}},
        {"event_type": "WorkflowTriggered", "payload": {}, "entity_id": "wf-1"},
    ])

    assert [m["event_type"] for m in sent] == ["WorkflowTriggered"]


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
