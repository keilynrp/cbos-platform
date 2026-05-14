# Capability Spec: Portal

**Module:** `backend/app/modules/portal/`
**Tier:** 1 - Wedge-Critical (promoted Q3, ADR 0011)
**Owner:** Platform team
**Status:** API, persisted, tested, production-aligned

---

## Purpose

The Portal module exposes customer-safe, token-gated quote and order views so external clients can review, accept, or reject a commercial proposal without needing a full CBOS user account.

It is the external decision surface of the commercial wedge.

---

## Wedge Role

- Sellers create a time-limited portal session for a quote
- Customers open a public tokenized URL to view the quote
- Customers can accept or reject the quote through the portal
- Acceptance creates a `SalesOrder`, emits business events, and can trigger downstream inventory/accounting flows
- The module closes the gap between internal sales work and external customer action

---

## Core Capabilities

| Capability | Route | Notes |
|---|---|---|
| Create portal session | `POST /api/v1/portal/sessions` | Internal, JWT required, workspace-scoped |
| Send portal email | `POST /api/v1/portal/sessions/{session_id}/send-email` | Internal, JWT required |
| List sessions | `GET /api/v1/portal/sessions?quote_id=...` | Internal, JWT required |
| Get quote via portal | `GET /api/v1/portal/quote/{token}` | Public, token-based |
| Accept quote | `POST /api/v1/portal/quote/{token}/accept` | Public, idempotent |
| Reject quote | `POST /api/v1/portal/quote/{token}/reject` | Public, idempotent |
| Get order status | `GET /api/v1/portal/order/{token}` | Public, available after acceptance |

---

## Access Model

### Internal endpoints

- Require Bearer token authentication
- Use `get_current_user` and `get_current_workspace_id`
- Must operate only on records belonging to the caller workspace

### Public endpoints

- No JWT required
- Access is controlled by the portal token stored on `PortalSession`
- Token expiry is enforced by `expires_at`
- Expired tokens return `410 Gone`
- Unknown tokens return `404 Not Found`

### Session validity

- Default lifetime comes from `settings.portal_token_expire_hours`
- `PortalSessionCreate.expire_hours` can override the default per session
- The current default in schemas is 72 hours

---

## Data Model

### PortalSession

| Field | Type | Notes |
|---|---|---|
| `id` | UUID string | Primary key |
| `workspace_id` | UUID string | Workspace scope |
| `quote_id` | UUID string | Linked quote |
| `token` | string | Public access token |
| `expires_at` | datetime | Hard expiry |
| `accessed_at` | datetime nullable | First public access timestamp |
| `completed_at` | datetime nullable | Accept or reject completion time |
| `action` | string nullable | `accepted` or `rejected` |
| `client_name` | string nullable | Optional customer display name |
| `client_email` | string nullable | Optional customer email |
| `client_notes` | string nullable | Optional notes captured during accept |
| `created_by_id` | UUID string nullable | Internal user who created the session |
| `created_at` | datetime | Audit timestamp |

### Public quote view

The customer-facing quote payload includes:

- commercial totals (`subtotal`, `discount_amount`, `tax_rate`, `tax_amount`, `total`)
- quote metadata (`quote_number`, `title`, `status`, `valid_until`)
- line-level details (`description`, `quantity`, `unit_price`, `discount_percent`, `amount`)
- display context (`workspace_name`, `org_name`, `contact_name`)
- session state (`can_accept`, `already_acted`, `session_expires_at`)

---

## Events

Portal emits both portal-native events and cross-domain commercial events.

| Event | Trigger | Status |
|---|---|---|
| `PortalSessionCreated` | New portal session created | Implemented |
| `PortalSessionAccessed` | First public quote view | Implemented |
| `CustomerActionPerformed` | Customer accepts or rejects | Implemented |
| `QuoteAccepted` | Quote accepted via portal | Implemented |
| `QuoteRejected` | Quote rejected via portal | Implemented |
| `SalesOrderCreated` | Sales order created from portal acceptance | Implemented |

### Event notes

- Event names follow the active PascalCase registry in `docs/EVENT_REGISTRY_V1.md`
- Event envelope follows `backend/app/events/types.py`
- Portal acceptance currently publishes sales-domain events from the portal service because the business transition originates there

---

## Behavior Rules

### Session creation

- A session can only be created for quotes in `draft` or `sent`
- Creating a session for an already processed quote returns `409 Conflict`
- Session creation returns a computed `portal_url`

### Quote acceptance

- Accept is idempotent at the session level
- First successful accept transitions the quote to `accepted`
- Accept creates a confirmed `SalesOrder`
- Seller and client email notifications are attempted after commit
- Best-effort inventory auto-reserve runs after accept when quote lines reference products

### Quote rejection

- Reject is idempotent at the session level
- First successful reject transitions the quote to `rejected`
- Rejection reason is appended into quote notes when provided
- Seller notification email is attempted after commit

---

## Test Coverage

| File | Tests | Coverage |
|---|---|---|
| `tests/test_portal_contract.py` | 21 | Auth guards, token validation, idempotency, event emission, email side effects |
| `tests/test_portal.py` | 5 | Multi-step integration flows, expiry override, internal listing, send-email validation |
| `tests/test_e2e_portal_accounting.py` | 2 | Portal acceptance through accounting lifecycle |
| `tests/test_e2e_portal_ws_notification.py` | 11 | Portal session event to WebSocket delivery |

Portal also participates in `test_wedge_smoke.py::test_full_wedge`.

---

## Known Gaps (Accepted For MVP)

1. Tokens expire after a short window and there is no renewal or revocation UI beyond creating a new session.
2. Public portal analytics are not modeled yet; there is no session funnel or view-rate reporting.
3. Best-effort inventory reserve after acceptance is still a synchronous integration path and not yet refactored behind the Sales inventory gateway boundary.

---

## Promotion History

- Active Tier 2: ADR 0006
- Tier 1 promotion: ADR 0011
