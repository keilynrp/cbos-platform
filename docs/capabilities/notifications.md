# Capability Spec: Notifications

**Module:** `backend/app/modules/notifications/`
**Tier:** 2 — Conditional (not yet promoted to active)
**Owner:** Platform team
**Status:** WebSocket delivery implemented and production-ready; no persistent model; no automated tests; email delivery conditional on SMTP config

---

## Purpose

The Notifications module delivers real-time in-app alerts to authenticated users via WebSocket. It acts as the delivery layer for domain events emitted by other modules — it does not produce events itself. A secondary email channel exists in `backend/app/core/email.py` (currently limited to portal quote emails) and is not yet wired to the WebSocket event set.

---

## Wedge Role

- Every domain event published via `events.bus.publish()` is simultaneously broadcast to the workspace's Redis pub/sub channel (`cbos:notifications:{workspace_id}`)
- Connected browser clients receive filtered notifications (10 event types) without polling
- Covers the full wedge lifecycle: workflow state changes, inventory alerts, quote outcomes, sales order creation, and CRM opportunity results
- No dedicated HTTP endpoints — the module exposes a single WebSocket endpoint consumed by the frontend notification bell/tray

---

## Core Capabilities

| Capability | Route | Notes |
|---|---|---|
| Real-time notification stream | `WS /api/v1/ws/notifications?token=<jwt>` | JWT passed as query param (WebSocket protocol cannot send headers) |
| Workspace-scoped fan-out | Internal — `ConnectionManager.broadcast()` | All active WS connections for the workspace receive the event |
| Event filtering | Internal | Only the 10 events in `NOTIFY_EVENTS` are forwarded; all other events are dropped silently |
| Dead-connection pruning | Internal — `ConnectionManager.broadcast()` | Failed sends are removed from the active set automatically |

There are no HTTP REST endpoints in this module.

---

## Access Model

- **Authentication:** JWT access token supplied as `?token=<jwt>` query parameter (standard `Authorization` header cannot be sent by native WebSocket clients)
- **Token validation:** `verify_token(token, token_type="access")` — same function used by all REST routes
- **Workspace scoping:** `workspace_id` is extracted from the JWT payload; connections are keyed by workspace — a user only receives events for their own workspace
- **Rejection codes:** `4001 Unauthorized` (invalid/expired token), `4003 No workspace` (token has no `workspace_id` claim)
- **Concurrency:** Multiple simultaneous connections per workspace are supported; all receive the same broadcast

---

## Data Model

No persistent model. The module holds only in-memory state (active WebSocket connections) via `ConnectionManager` in `backend/app/core/ws_manager.py`.

| Component | Location | Description |
|---|---|---|
| `ConnectionManager` | `app/core/ws_manager.py` | In-memory dict of `workspace_id → set[WebSocket]`; singleton `manager` instance |
| Redis pub/sub channel | `cbos:notifications:{workspace_id}` | Ephemeral; messages are not stored — missed events are lost on disconnect |

---

## Events

The module **consumes** events from Redis pub/sub. It does not publish any events.

### Events forwarded to WebSocket clients

| Event Type | Label shown in UI | Source Module |
|---|---|---|
| `WorkflowTriggered` | Workflow ejecutado | Workflows |
| `WorkflowCompleted` | Workflow completado | Workflows |
| `WorkflowFailed` | Workflow falló | Workflows |
| `InventoryLowThresholdDetected` | Stock bajo | Inventory |
| `QuoteAccepted` | Cotización aceptada | Sales / Portal |
| `QuoteRejected` | Cotización rechazada | Sales / Portal |
| `SalesOrderCreated` | Nueva orden de venta | Sales |
| `CustomerActionPerformed` | Acción del cliente | CRM |
| `OpportunityWon` | Deal ganado | CRM |
| `OpportunityLost` | Deal perdido | CRM |

All other event types published to the Redis channel are silently dropped by the filter in `router.py`.

### Delivery path

```
Domain module → events.bus.publish()
  → Redis XADD  cbos:events              (stream — consumed by Workflows worker)
  → Redis PUBLISH cbos:notifications:{wid} (pub/sub — consumed by WS router)
      → WebSocket clients (filtered by NOTIFY_EVENTS)
```

---

## Test Coverage

| File | Tests | Coverage |
|---|---|---|
| `tests/test_notifications_contract.py` | 🔴 Missing | — |
| `tests/test_notifications.py` | 🔴 Missing | — |

No automated tests exist for this module. WebSocket delivery has been verified manually in production. The absence of tests is the primary blocker for promotion to active Tier 2.

---

## Known Gaps

Derived from scorecard score **2/6** (Events 🟢, Production 🟡; all other dimensions 🔴):

1. **No contract tests** — WebSocket auth rejection, workspace isolation, event filtering, and reconnection behavior are untested
2. **No integration tests** — end-to-end path from `bus.publish()` through Redis pub/sub to WS client is not covered
3. **No capability spec** — addressed by this document
4. **Frontend partial** — notification bell/tray exists but delivery reliability under reconnection is unverified (scorecard 🟡)
5. **Email delivery undefined** — `app/core/email.py` contains a working SMTP sender and a quote portal template, but no email notifications are wired to the `NOTIFY_EVENTS` set; the delivery policy (which events trigger email, when, to whom) is not defined
6. **No persistence** — events missed during a client disconnect are permanently lost; no notification history or read/unread state
7. **No delivery acknowledgement** — the WebSocket is one-directional; the server cannot confirm a notification was seen

---

## Promotion Criteria (to active Tier 2)

Based on the scorecard Action Register (Q2 target) and general promotion criteria:

| Criterion | Current | Required |
|---|---|---|
| Contract tests | 🔴 Missing | 🟢 Cover: auth rejection (4001, 4003), workspace isolation, event type filtering, clean disconnect |
| Integration tests | 🔴 Missing | 🟢 Cover: full path from `bus.publish()` → Redis → WS client in a test environment |
| WebSocket + email delivery policy | 🔴 Undefined | 🟢 ADR or spec section defining which events trigger email, recipient resolution, and opt-out |
| Frontend alignment | 🟡 Partial | 🟢 Reconnection and missed-event handling confirmed in frontend |
| Capability spec | 🔴 Missing | 🟢 This document (now present — update scorecard) |
| Production stability | 🟡 Manual verified | 🟢 Confirmed stable with automated regression coverage |
