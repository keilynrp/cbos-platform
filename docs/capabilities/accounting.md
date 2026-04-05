# Capability Spec: Accounting

**Module:** `backend/app/modules/accounting/`
**Tier:** 3 — Controlled Expansion
**Owner:** Platform team
**Status:** API, Persisted, Frontend-wired — Tests added Sprint 7

---

## Purpose

The Accounting module manages the full invoice lifecycle for a workspace: creating invoices against contacts, organizations, or sales orders; tracking line-item detail; recording payments; and surfacing an AR summary (total invoiced, paid, outstanding, overdue). It is the financial record layer that sits downstream of fulfilled sales orders.

---

## Wedge Role

- Activated when a SalesOrder is fulfilled or a manual billing event occurs
- An Invoice can reference a `sales_order_id`, closing the quote-to-cash loop
- Invoices are also linkable to a CRM `Organization` or `Person` directly
- Payment recording drives status transitions (`draft → sent → partial → paid`) which downstream integrations can react to via events
- The `AccountingSummary` endpoint provides dashboard-level AR visibility without requiring per-invoice iteration

---

## Core Capabilities

| Capability | Route | Notes |
|---|---|---|
| AR summary | `GET /api/v1/accounting/summary` | Total invoiced, paid, outstanding, overdue count/amount |
| List invoices | `GET /api/v1/accounting/invoices` | Filter by `status`; paginated (`limit`/`offset`) |
| Get invoice | `GET /api/v1/accounting/invoices/{invoice_id}` | Includes lines and payments |
| Create invoice | `POST /api/v1/accounting/invoices` | Auto-generates `INV-{YEAR}-{NNNN}` number; computes totals |
| Update invoice | `PATCH /api/v1/accounting/invoices/{invoice_id}` | Status, due date, notes; blocked if `paid` or `void` |
| Delete invoice | `DELETE /api/v1/accounting/invoices/{invoice_id}` | Only allowed for `draft`, `void`, or `cancelled` |
| List payments | `GET /api/v1/accounting/invoices/{invoice_id}/payments` | Payments for a specific invoice |
| Record payment | `POST /api/v1/accounting/invoices/{invoice_id}/payments` | Overpayment rejected; auto-transitions to `partial` or `paid` |

---

## Access Model

- All accounting routes require a valid `Authorization: Bearer <token>` header
- Routes are workspace-scoped via `get_current_workspace_id` — invoices and payments from one workspace are never visible to another
- No public or portal-style access exists for accounting endpoints
- `owner_id` and `recorded_by_id` are stamped from the authenticated user at creation time

---

## Data Model

### Invoice

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `workspace_id` | String | Workspace scope (FK → workspaces) |
| `invoice_number` | String(30) | Auto-generated: `INV-{YEAR}-{NNNN}` |
| `status` | String(30) | `draft` / `sent` / `paid` / `partial` / `overdue` / `cancelled` / `void` |
| `issue_date` | Date | Required at creation |
| `due_date` | Date | Optional |
| `paid_at` | DateTime | Set when status transitions to `paid` |
| `currency` | String(10) | Default `USD` |
| `subtotal` | Float | Sum of line subtotals minus header discount |
| `discount_amount` | Float | Header-level discount |
| `tax_rate` | Float | Percentage applied to subtotal |
| `tax_amount` | Float | Computed: `subtotal × tax_rate / 100` |
| `total` | Float | `subtotal + tax_amount` |
| `amount_paid` | Float | Running sum of recorded payments |
| `amount_due` | Float | `total − amount_paid` |
| `notes` | Text | Optional free-text notes |
| `contact_id` | String | Optional FK → persons |
| `organization_id` | String | Optional FK → organizations |
| `sales_order_id` | String | Optional FK → sales_orders |
| `owner_id` | String | FK → users (set from authenticated actor) |

### InvoiceLine

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `invoice_id` | String | FK → invoices |
| `line_order` | Integer | Display ordering |
| `description` | String(500) | Line item description |
| `quantity` | Float | Default 1.0 |
| `unit_price` | Float | Price per unit |
| `discount_pct` | Float | Per-line discount percentage |
| `subtotal` | Float | `quantity × unit_price × (1 − discount_pct/100)` |
| `product_id` | String | Optional FK → inventory_items |

### Payment

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `workspace_id` | String | FK → workspaces |
| `invoice_id` | String | FK → invoices |
| `amount` | Float | Must not exceed `amount_due` |
| `currency` | String(10) | Default `USD` |
| `method` | String(50) | `transfer` / `cash` / `card` / `check` / `crypto` / `other` |
| `reference` | String(200) | Optional transaction reference |
| `notes` | Text | Optional notes |
| `payment_date` | Date | Required |
| `recorded_by_id` | String | FK → users |

---

## Events

| Event | Trigger | Status |
|---|---|---|
| `InvoiceCreated` | On `POST /invoices` — invoice persisted with lines | 🟢 Published |
| `InvoiceSent` | On `PATCH /invoices/{id}` when status transitions to `sent` | 🟢 Published |
| `InvoicePaid` | On `POST /payments` when `amount_due` reaches zero | 🟢 Published |
| `PaymentRecorded` | On every successful `POST /payments` | 🟢 Published |

> All events are emitted via `app.events.bus.publish` with `source_module="accounting"` and include `workspace_id`, `actor_id`, `entity_id`, and a minimal payload. Event type strings are defined as constants in `service.py` rather than in `app/events/types.py` — this should be consolidated in Q2.

---

## Test Coverage

| File | Tests | Coverage |
|---|---|---|
| `tests/test_accounting_contract.py` | 21 | Auth guards (8), workspace isolation (1), invoice lifecycle (7), payment recording (4), summary shape (1) |
| Integration tests | 🔴 Missing | Scheduled Q2 |

---

## Known Gaps

- **Integration tests absent** — no `test_accounting.py` covering service-layer flows (tax computation, discount stacking, overdue detection)
- **Event type constants** defined locally in `service.py` rather than in the shared `app/events/types.py` — risks divergence across consumers
- **No overdue status automation** — `overdue` status exists in the model but is never set automatically; relies on manual update or a scheduled job that does not yet exist
- **No end-to-end scenario** connecting a SalesOrder fulfillment to auto-invoice creation
- **Scorecard score at time of writing:** 1/6 (frontend-wired only); contract tests added Sprint 7 bring it to 2/6

---

## Promotion Criteria (to Tier 2)

Based on scorecard gaps and platform promotion policy (all five criteria required):

1. **Contract tests** — 🟢 Done (21 tests, Sprint 7)
2. **Integration tests** — 🔴 Write `tests/test_accounting.py` covering tax/discount calculations, overdue logic, and multi-payment scenarios
3. **Frontend alignment** — 🟢 Invoicing UI wired to real API (completed Sprint 6)
4. **Capability spec** — 🟢 This document
5. **End-to-end scenario** — 🔴 Add an E2E test connecting `SalesOrder.fulfilled` → `Invoice` creation → `Payment` → `InvoicePaid` event
6. **Event type consolidation** — Move `INVOICE_CREATED`, `INVOICE_SENT`, `INVOICE_PAID`, `PAYMENT_RECORDED` into `app/events/types.py`
