# Sprint 5 — Workflow Consumer Tests + Alignment Doc Update

> **For agentic workers:** Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Verify the existing workflow consumer reliability features with automated tests, then update the implementation alignment doc to reflect the current state of the platform.

**Context:** The `consumer.py` already implements idempotency (Redis key dedup), DLQ (dead letter queue), MAX_RETRIES enforcement, PEL reclaim, and poison pill handling. These features are live but **untested**. Sprint 5 adds the test coverage and closes the alignment gap.

**Architecture:** Two phases. Phase 1 adds `test_workflow_consumer.py` — unit tests for the consumer layer using mocked Redis. Phase 2 updates `IMPLEMENTATION_ALIGNMENT.md` to reflect sprint findings.

**Tech Stack:** pytest-asyncio, unittest.mock (AsyncMock), existing consumer.py functions

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/tests/test_workflow_consumer.py` | CREATE | Consumer reliability unit tests |
| `docs/IMPLEMENTATION_ALIGNMENT.md` | MODIFY | Update gap register + alignment summary |

---

## Phase 1 — Consumer Reliability Tests

### Task 1: Idempotency + DLQ + Process Message tests

**Files:**
- Create: `backend/tests/test_workflow_consumer.py`

**Context:**
- Consumer lives in `backend/app/modules/workflows/consumer.py`
- Key functions to test:
  - `_is_duplicate(r, event_id)` → True if already processed (Redis key exists)
  - `_move_to_dlq(r, msg_id, raw, error)` → writes to DLQ_STREAM
  - `_process_message(r, msg_id, data)` → orchestrates parse → dedup → delivery_count → dispatch
- `STREAM_KEY = "cbos:events"`, `DLQ_STREAM = "cbos:events:dlq"`, `MAX_RETRIES = 3`
- Tests use `unittest.mock.AsyncMock` and `MagicMock` — no real Redis needed
- `dispatch_event` must be mocked to isolate consumer layer from DB

**Important:** These are regular pytest functions with `@pytest.mark.asyncio` — do NOT use the `client` or `auth_headers` fixtures. Import functions directly from the consumer module.

- [ ] **Step 1: Write consumer unit tests**

Create `backend/tests/test_workflow_consumer.py`:

```python
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

    import json
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

    import json
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

    import json
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

    import json
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
```

- [ ] **Step 2: Run tests (GREEN)**

```bash
docker compose exec backend pytest tests/test_workflow_consumer.py -v --tb=short 2>&1 | tail -20
```
Expected: 7 passed.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_workflow_consumer.py
git commit -m "test(workflows): consumer reliability — idempotency, DLQ, retry, PEL unit tests"
```

---

## Phase 2 — Update IMPLEMENTATION_ALIGNMENT.md

### Task 2: Update alignment doc with Sprint 4+5 findings

**Files:**
- Modify: `docs/IMPLEMENTATION_ALIGNMENT.md`

**Context:**
- The alignment doc was written before Sprints 2-5 and still shows many things as "at risk" that are now resolved
- Only update items that have ACTUALLY changed — do not invent progress
- Changes based on real sprint outcomes:
  - Test coverage: was "Limited visible automated coverage" → now 161 tests in 12 files
  - Workflow resilience: was "failure handling remains basic" → now has idempotency, DLQ, retries, PEL
  - Wedge smoke test: now exists (test_wedge_smoke.py)
  - Consumer contract tests: added in Sprint 5

**Items to update in Gap Register:**

| Area | Current State (real) | Update to |
|------|---------------------|-----------|
| Test coverage | 161 tests, 12 files | Move from "at risk" → "partially aligned" |
| Workflow resilience | Consumer has idempotency, DLQ, MAX_RETRIES, PEL reclaim | Move from "misaligned" → "partially aligned" |

**Items to leave unchanged (still true):**
- Sales to Inventory boundary (direct invocation still present)
- Pagination consistency (still uneven)
- Event governance (not formalized)
- Frontend ahead of backend maturity

- [ ] **Step 1: Update the alignment sections**

In `docs/IMPLEMENTATION_ALIGNMENT.md`:

1. Move "Test coverage" from "Misaligned Or At Risk" to "Partially Aligned":
   - Current: "Testing depth appears below what the platform ambition requires"
   - Updated: "161 automated tests in 12 files covering identity, CRM, sales, inventory, workflows, portal, discovery, and wedge smoke path. Consumer-level unit tests added in Sprint 5."

2. Move "Workflow consumer resilience" from "Misaligned Or At Risk" to "Partially Aligned":
   - Current: "Workflow consumer behavior is still lighter than the architecture needs for resilient event processing"
   - Updated: "Consumer implements idempotency (Redis key dedup 24h TTL), DLQ stream, MAX_RETRIES enforcement, PEL reclaim, and poison pill handling. Unit tests added Sprint 5. Event governance contracts and publisher parity still need formalization."

3. Update Gap Register row for Workflow resilience:
   - Priority: High → Medium
   - Action: updated to reflect what remains (event governance, publisher parity)

4. Update Gap Register row for Test coverage:
   - Current State: "Limited visible automated coverage"
   - Target: keep same (still more to do)
   - Action: Note coverage achieved, mark remaining work

- [ ] **Step 2: Commit**

```bash
git add docs/IMPLEMENTATION_ALIGNMENT.md
git commit -m "docs(alignment): update gap register post-Sprint 4+5 — tests + workflow resilience"
```
