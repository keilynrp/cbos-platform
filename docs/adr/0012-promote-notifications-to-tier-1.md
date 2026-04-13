# ADR 0012 — Promote Notifications to Tier 1 (Wedge-Critical)

**Date:** 2026-04-12
**Status:** Accepted
**Deciders:** Platform team

---

## Context

Notifications was promoted to active Tier 2 during Q2. The module delivers real-time WebSocket alerts and email notifications for business events across the entire wedge. Its only remaining gap (Frontend 🟡) was the absence of a UI for email notification preferences.

Q3 backlog item 2.3 resolved this gap:
- Backend: `notification_preferences` JSON column on User model, GET/PUT `/notifications/preferences` API
- Frontend: Dedicated "Notifications" tab in Settings with global toggle + per-event granularity
- Email notifier updated to respect user preferences before sending

The scorecard promotion criteria (§5) state:

> A module may advance from Tier 2 → Tier 1 when it achieves all six dimensions at 🟢 **and** at least one end-to-end scenario involving this module.

Notifications now achieves 6/6 on the scorecard and has extensive E2E coverage.

---

## Decision Evidence

### Scorecard (6/6)

| Dimension | Status | Evidence |
|-----------|--------|----------|
| Contract Tests | 🟢 | 32 tests in `test_notifications.py` |
| Integration Tests | 🟢 | 10 tests in `test_notification_preferences.py` |
| Event Publishing | 🟢 | Consumes 13 event types via Redis pub/sub; email delivery for 4 critical events |
| Frontend Alignment | 🟢 | Notification bell/tray (WebSocket) + Settings Notifications tab (email preferences) |
| Capability Spec | 🟢 | `docs/capabilities/notifications.md` |
| Production Stable | 🟢 | Deployed and working |

### End-to-End Scenarios

| Test | Coverage |
|------|----------|
| `test_e2e_notifications_pipeline.py` | Full event bus → Redis pub/sub → WebSocket delivery chain (17 tests, 5 layers) |
| `test_e2e_portal_ws_notification.py` | Portal session creation → PortalSessionCreated → WS notification (11 tests) |

### Test Coverage Summary

70 tests across 4 test files covering: WebSocket auth/rejection, connection management, event filtering, message shape, label completeness, email preferences CRUD, E2E delivery pipeline, and cross-module Portal→WS integration.

---

## Decision

Promote `notifications` from **Tier 2 — Wedge Support** to **Tier 1 — Wedge-Critical**.

### Rationale

Notifications is the **observability layer** of the wedge: every significant business event (workflow completion, quote acceptance, invoice payment, low stock alert) is surfaced to users in real-time via WebSocket and via email for critical events. Without Notifications, users have no way to know when important state changes occur without manually checking each module — this makes the wedge operationally unusable at scale.

The module:
- Covers 13 event types spanning all 8 other modules
- Provides email delivery for the 4 most critical event types with per-user opt-in/opt-out
- Has 70 tests including full E2E pipeline coverage
- Is deployed and stable in production

---

## Consequences

**Positive:**

- All 9 platform modules are now Tier 1 — Wedge-Critical
- Tier 2 is empty; the entire active platform operates at the highest maturity tier
- Email notification preferences give users control over alert volume
- Breaking changes to NOTIFY_EVENTS or email delivery require Tier 1 review process

**Negative / Risks:**

- No notification persistence — events missed during client disconnect are permanently lost (accepted MVP limitation)
- No delivery acknowledgement — server cannot confirm a notification was seen by the user
- Email sent to workspace owners only — multi-user email targeting requires future role-based recipient resolution

---

## Related

- ADR 0003: Anchor the MVP on the commercial operations wedge
- ADR 0004: Treat events as versioned domain contracts
- `test_e2e_notifications_pipeline.py` — E2E evidence
- `test_e2e_portal_ws_notification.py` — E2E evidence
- `test_notification_preferences.py` — Preferences API evidence
- `docs/capabilities/notifications.md`
