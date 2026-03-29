# Capability Spec: Portal

**Module:** `backend/app/modules/portal/`
**Tier:** 2 — Active (promoted Sprint 6, ADR 0006)
**Owner:** Platform team
**Status:** API, Persisted, Tested

---

## Purpose

The Portal module gives customers a secure, time-limited view into their quotes and orders without requiring a full user account. It is the external-facing complement to the Sales module.

---

## Wedge Role

- Activated when a SalesOrder is confirmed
- Customer receives a token-gated URL to review their order
- Customer can accept or reject a Quote directly from the portal
- Accept triggers the same `quote.accept` flow as the internal UI (creates a SalesOrder)

---

## Core Capabilities

| Capability | Route | Notes |
|---|---|---|
| Create portal session | `POST /api/v1/portal/sessions` | Internal — called by Sales on order confirmation |
| Get session by token | `GET /api/v1/portal/sessions/{token}` | Public — validates token, returns session data |
| Get quote via portal | `GET /api/v1/portal/quotes/{token}` | Public — customer views their quote |
| Accept quote | `POST /api/v1/portal/quotes/{token}/accept` | Public — idempotent |
| Reject quote | `POST /api/v1/portal/quotes/{token}/reject` | Public — idempotent |
| Get order status | `GET /api/v1/portal/orders/{token}` | Public — customer views order status |

---

## Access Model

- Portal routes under `/api/v1/portal/` are **public** (no `Authorization` header)
- Access is controlled by a time-limited token (`portal_token`) stored in `PortalSession`
- Tokens expire after `PORTAL_TOKEN_EXPIRE_HOURS` (default 72h, configurable)
- All portal operations are workspace-scoped through the token

---

## Data Model

### PortalSession

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `workspace_id` | String | Workspace scope |
| `token` | String | Unique, time-limited access token |
| `entity_type` | String | `quote` or `order` |
| `entity_id` | String | ID of the linked quote or order |
| `expires_at` | DateTime | Token expiry |
| `is_active` | Boolean | Can be revoked |

---

## Events

| Event | Trigger | Status |
|---|---|---|
| `PortalSessionCreated` | When a new portal session is created | 🟡 Partial — not consistently emitted |

---

## Test Coverage

| File | Tests | Coverage |
|---|---|---|
| `tests/test_portal_contract.py` | 17 | Token validation, accept/reject, idempotency, order status, expired token |
| Integration tests | 🔴 Missing | Scheduled Q2 |

---

## Known Gaps

- Event publishing for `PortalSessionCreated` is not consistently emitted
- Integration test file (`test_portal.py`) does not exist — add in Q2
- No portal analytics (session views, accept/reject rates)

---

## Promotion History

- Tier 2 Conditional: ADR 0003 (initial classification)
- Active Tier 2: ADR 0006, Sprint 6, 2026-03-29
