"""
Workflow consumer reliability unit tests.
Tests idempotency, DLQ routing, retry limits, and process_message orchestration.
Uses AsyncMock — no real Redis or DB required.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

pytestmark = pytest.mark.asyncio


# ── _is_duplicate ─────────────────────────────────────────────────────────────

async def test_is_duplicate_returns_false_on_first_occurrence():
    """First time an event_id is seen → Redis SET NX succeeds → not a duplicate."""
    from app.modules.workflows.consumer import _is_duplicate

    r = AsyncMock()
    r.set = AsyncMock(return_value=True)  # SET NX returned True = key was set

    result = await _is_duplicate(r, "event-abc-123")

    assert result is False
    r.set.assert_called_once_with("cbos:processed:event-abc-123", "1", nx=True, ex=86400)


async def test_is_duplicate_returns_true_on_second_occurrence():
    """Second time → Redis SET NX returns None (key exists) → is a duplicate."""
    from app.modules.workflows.consumer import _is_duplicate

    r = AsyncMock()
    r.set = AsyncMock(return_value=None)  # SET NX returned None = key already existed

    result = await _is_duplicate(r, "event-abc-123")

    assert result is True


# ── _move_to_dlq ──────────────────────────────────────────────────────────────

async def test_move_to_dlq_writes_to_dlq_stream():
    """DLQ message includes msg_id, raw data, and error description."""
    from app.modules.workflows.consumer import _move_to_dlq, DLQ_STREAM

    r = AsyncMock()
    r.xadd = AsyncMock()

    await _move_to_dlq(r, "1234-0", '{"bad": "json"}', "parse_error: ...")

    r.xadd.assert_called_once_with(
        DLQ_STREAM,
        {"msg_id": "1234-0", "data": '{"bad": "json"}', "error": "parse_error: ..."},
    )


# ── _process_message ──────────────────────────────────────────────────────────

async def test_process_message_invalid_json_goes_to_dlq_and_acks():
    """Poison pill: unparseable JSON → DLQ + return True (ACK to unblock pipeline)."""
    from app.modules.workflows.consumer import _process_message

    r = AsyncMock()
    r.set = AsyncMock(return_value=True)
    r.xadd = AsyncMock()

    data = {"data": "not valid json {{{"}
    result = await _process_message(r, "msg-001", data)

    assert result is True  # ACK
    r.xadd.assert_called_once()  # DLQ write happened
    call_args = r.xadd.call_args
    assert "parse_error" in call_args[0][1]["error"]


async def test_process_message_duplicate_event_id_acks_without_dispatch():
    """Duplicate event_id → skip dispatch, return True (ACK)."""
    from app.modules.workflows.consumer import _process_message
    from app.events.types import Event

    event = Event(
        event_type="LeadCaptured",
        source_module="crm",
        workspace_id="ws-001",
        actor_id="actor",
        entity_id="lead-001",
        payload={},
    )

    r = AsyncMock()
    r.set = AsyncMock(return_value=None)  # key already exists = duplicate
    r.xadd = AsyncMock()

    data = {"data": event.model_dump_json()}

    with patch("app.modules.workflows.consumer.dispatch_event") as mock_dispatch:
        result = await _process_message(r, "msg-002", data)

    assert result is True  # ACK
    mock_dispatch.assert_not_called()  # dispatch was skipped
    r.xadd.assert_not_called()  # no DLQ


async def test_process_message_max_retries_exceeded_goes_to_dlq():
    """When delivery_count > MAX_RETRIES → DLQ + ACK."""
    from app.modules.workflows.consumer import _process_message, MAX_RETRIES
    from app.events.types import Event

    event = Event(
        event_type="LeadCaptured",
        source_module="crm",
        workspace_id="ws-001",
        actor_id="actor",
        entity_id="lead-002",
        payload={},
    )

    r = AsyncMock()
    r.set = AsyncMock(return_value=True)   # not a duplicate
    r.xadd = AsyncMock()

    data = {"data": event.model_dump_json()}

    with patch("app.modules.workflows.consumer._get_delivery_count", return_value=MAX_RETRIES + 1):
        with patch("app.modules.workflows.consumer.dispatch_event") as mock_dispatch:
            result = await _process_message(r, "msg-003", data)

    assert result is True  # ACK
    mock_dispatch.assert_not_called()
    r.xadd.assert_called_once()  # moved to DLQ
    assert "max_retries_exceeded" in r.xadd.call_args[0][1]["error"]


async def test_process_message_successful_dispatch_returns_true():
    """Happy path: valid event, not duplicate, within retries → dispatched → ACK."""
    from app.modules.workflows.consumer import _process_message
    from app.events.types import Event

    event = Event(
        event_type="LeadCaptured",
        source_module="crm",
        workspace_id="ws-001",
        actor_id="actor",
        entity_id="lead-003",
        payload={},
    )

    r = AsyncMock()
    r.set = AsyncMock(return_value=True)   # not duplicate

    data = {"data": event.model_dump_json()}

    with patch("app.modules.workflows.consumer._get_delivery_count", return_value=1):
        with patch("app.modules.workflows.consumer.dispatch_event", new_callable=AsyncMock) as mock_dispatch:
            with patch("app.modules.workflows.consumer.AsyncSessionLocal") as mock_session_cls:
                mock_session = AsyncMock()
                mock_session.__aenter__ = AsyncMock(return_value=mock_session)
                mock_session.__aexit__ = AsyncMock(return_value=False)
                mock_session_cls.return_value = mock_session

                result = await _process_message(r, "msg-004", data)

    assert result is True  # ACK
    mock_dispatch.assert_called_once()


async def test_process_message_dispatch_error_returns_false():
    """Dispatch raises exception → no ACK (stays in PEL for retry)."""
    from app.modules.workflows.consumer import _process_message
    from app.events.types import Event

    event = Event(
        event_type="LeadCaptured",
        source_module="crm",
        workspace_id="ws-001",
        actor_id="actor",
        entity_id="lead-004",
        payload={},
    )

    r = AsyncMock()
    r.set = AsyncMock(return_value=True)   # not duplicate

    data = {"data": event.model_dump_json()}

    with patch("app.modules.workflows.consumer._get_delivery_count", return_value=1):
        with patch("app.modules.workflows.consumer.AsyncSessionLocal") as mock_session_cls:
            mock_session = AsyncMock()
            mock_session.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session.__aexit__ = AsyncMock(return_value=False)
            mock_session_cls.return_value = mock_session

            with patch("app.modules.workflows.consumer.dispatch_event", side_effect=RuntimeError("DB down")):
                result = await _process_message(r, "msg-005", data)

    assert result is False  # No ACK — stays in PEL
