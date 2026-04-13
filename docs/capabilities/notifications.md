# Capability Spec: Notifications

**Module:** `backend/app/modules/notifications/`
**Tier:** 1 — Wedge-Critical (promoted Q3, ADR 0012)
**Owner:** Platform team
**Status:** WebSocket + email delivery implemented and production-ready; per-user email preferences; 320+ tests

---

## Purpose

The Notifications module delivers real-time in-app alerts to authenticated users via WebSocket and email notifications for critical business events. It acts as the delivery layer for domain events emitted by other modules — it does not produce events itself.

---

## Wedge Role

- Every domain event published via `events.bus.publish()` is simultaneously broadcast to the workspace's Redis pub/sub channel (`cbos:notifications:{workspace_id}`)
- Connected browser clients receive filtered notifications (14 event types) without polling
- Email notifications for 5 critical event types (QuoteAccepted, SalesOrderCreated, WorkflowFailed, InventoryLowThresholdDetected, InvoiceOverdue) with per-user opt-in/opt-out
- Covers the full wedge lifecycle: workflow state changes, inventory alerts, quote/portal outcomes, sales orders, CRM opportunities, and accounting events

---

## Core Capabilities

| Capability | Route | Notes |
|---|---|---|
| Real-time notification stream | `WS /api/v1/ws/notifications?token=<jwt>` | JWT passed as query param (WebSocket cannot send headers) |
| Workspace-scoped fan-out | Internal — `ConnectionManager.broadcast()` | All active WS connections for the workspace receive the event |
| Event filtering | Internal | Only the 14 events in `NOTIFY_EVENTS` are forwarded |
| Dead-connection pruning | Internal — `ConnectionManager.broadcast()` | Failed sends are removed from the active set automatically |
| Get email preferences | `GET /api/v1/notifications/preferences` | Returns global toggle + per-event enabled/disabled |
| Update email preferences | `PUT /api/v1/notifications/preferences` | Accepts partial updates; persists to `users.notification_preferences` |
| Email delivery | Background task — `email_notifier.py` | Sends emails for `EMAIL_NOTIFY_EVENTS` respecting user preferences |

---

## Access Model

- **Authentication:** JWT access token supplied as `?token=<jwt>` query parameter for WebSocket; standard Bearer token for REST endpoints
- **Token validation:** `verify_token(token, token_type="access")` — same function used by all REST routes
- **Workspace scoping:** `workspace_id` is extracted from the JWT payload; connections and preferences are keyed by user/workspace
- **Rejection codes:** `4001 Unauthorized` (invalid/expired token), `4003 No workspace` (token has no `workspace_id` claim)
- **Concurrency:** Multiple simultaneous connections per workspace are supported; all receive the same broadcast

---

## Data Model

### Persistent

| Component | Location | Description |
|---|---|---|
| `User.notification_preferences` | `identity/models.py` | JSON column: `{email_enabled: bool, email_events: {event: bool}}` |

### Ephemeral

| Component | Location | Description |
|---|---|---|
| `ConnectionManager` | `app/core/ws_manager.py` | In-memory dict of `workspace_id → set[WebSocket]`; singleton `manager` instance |
| Redis pub/sub channel | `cbos:notifications:{workspace_id}` | Ephemeral; messages are not stored — missed events are lost on disconnect |

---

## Events

The module **consumes** events from Redis pub/sub. It does not publish any events.

### Events forwarded to WebSocket clients (13)

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
| `OpportunityWon` | Deal ganado 🎉 | CRM |
| `OpportunityLost` | Deal perdido | CRM |
| `PortalSessionCreated` | Portal compartido con cliente | Portal |
| `InvoiceCreated` | Factura generada | Accounting |
| `InvoicePaid` | Factura pagada 💰 | Accounting |
| `InvoiceOverdue` | Factura vencida ⚠️ | Accounting |

### Events that trigger email notifications (4)

| Event Type | Condition |
|---|---|
| `QuoteAccepted` | User has `email_enabled: true` and event not disabled |
| `SalesOrderCreated` | Same |
| `WorkflowFailed` | Same |
| `InventoryLowThresholdDetected` | Same |
| `InvoiceOverdue` | Same |

### Delivery path

```
Domain module → events.bus.publish()
  → Redis XADD  cbos:events              (stream — consumed by Workflows + Invoice consumers)
  → Redis PUBLISH cbos:notifications:{wid} (pub/sub)
      → WebSocket clients (filtered by NOTIFY_EVENTS, 14 types)
      → Email notifier (filtered by EMAIL_NOTIFY_EVENTS, 5 types, respects user preferences)
```

---

## Email Preference API

### GET /api/v1/notifications/preferences

Returns the current user's email notification preferences.

```json
{
  "email_enabled": true,
  "email_events": {
    "InventoryLowThresholdDetected": true,
    "QuoteAccepted": true,
    "SalesOrderCreated": true,
    "WorkflowFailed": true
  }
}
```

### PUT /api/v1/notifications/preferences

Partial update. Only provided fields are changed; others are preserved.

```json
{
  "email_enabled": false,
  "email_events": {
    "WorkflowFailed": false
  }
}
```

---

## WebSocket Reconnection Behavior

The frontend hook `useNotifications.ts` implements:

- **Auto-reconnect:** 3-second delay after disconnect via `setTimeout(connect, 3_000)`
- **Cleanup:** Reconnect timer and WebSocket reference cleared on component unmount
- **Max notifications:** 50 in-memory notifications (newest first)
- **Missed events:** Not recovered — Redis pub/sub is ephemeral. Events published while the client is disconnected are permanently lost. This is a known and accepted limitation for MVP.

---

## Test Coverage

| File | Tests | Coverage |
|---|---|---|
| `tests/test_notifications.py` | 32 | WebSocket auth, manager, event filtering, message shape, labels |
| `tests/test_notification_preferences.py` | 10 | GET/PUT preferences, persistence, validation, partial updates |
| `tests/test_e2e_notifications_pipeline.py` | 17 | Full event bus → Redis → WS delivery chain (5 layers) |
| `tests/test_e2e_portal_ws_notification.py` | 11 | Portal → event → WS notification (5 layers) |

**Total: 70 tests** covering the Notifications module.

---

## Known Gaps (Accepted for MVP)

1. **No persistence** — events missed during a client disconnect are permanently lost; no notification history or read/unread state stored server-side
2. **No delivery acknowledgement** — the WebSocket is one-directional; the server cannot confirm a notification was seen
3. **Email sent to workspace owners only** — multi-user email targeting requires role-based recipient resolution (future)
