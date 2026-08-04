# Capability Spec: Accounting

**Module:** `backend/app/modules/accounting/`
**Tier:** 1 — Wedge-Critical (promoted Q3, ADR 0010)
**Owner:** Platform team
**Status:** Full invoice lifecycle, auto-invoice consumer, overdue scanner, payment recording, email notifications; 359+ tests platform-wide

---

## Purpose

The Accounting module manages the full invoice lifecycle for a workspace: creating invoices against contacts, organizations, or sales orders; tracking line-item detail; recording payments; and surfacing an AR summary (total invoiced, paid, outstanding, overdue). It is the financial record layer that sits downstream of fulfilled sales orders.

---

## Wedge Role

- **Auto-invoice**: When a `SalesOrderFulfilled` event is published, the `invoice_consumer.py` (Redis Streams consumer group `cbos-invoice`) automatically creates a draft invoice with line items copied from the sales order
- **Overdue automation**: The `overdue_scanner.py` background task runs hourly and transitions `sent`/`partial` invoices past their `due_date` to `overdue` status, emitting `InvoiceOverdue` events and triggering email notifications
- An Invoice can reference a `sales_order_id`, closing the quote-to-cash loop
- Invoices are also linkable to a CRM `Organization` or `Person` directly
- Payment recording drives status transitions (`draft → sent → partial → paid`) which downstream integrations react to via events
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
| Download invoice PDF | `GET /api/v1/accounting/invoices/{invoice_id}/pdf` | Renders the workspace issuer profile and the resolved customer; falls back to `"CBOS"` when no profile is configured |
| Read issuer profile | `GET /api/v1/accounting/company-profile` | Creates an empty profile on the fly — never returns 404 |
| Upsert issuer profile | `PUT /api/v1/accounting/company-profile` | Partial payload; omitted fields keep their value, explicit `null` clears. Logo must be a PNG/JPEG base64 data URI ≤ 200 KB (`400` otherwise); `default_tax_rate` outside 0–100 is `422` |

---

## Background Services

| Service | Mechanism | Description |
|---|---|---|
| Auto-invoice consumer | Redis Streams (`cbos-invoice` group) | Listens for `SalesOrderFulfilled`; creates draft invoice with order line items |
| Overdue scanner | `asyncio.create_task` (hourly) | Scans for `sent`/`partial` invoices past `due_date`; transitions to `overdue` + emits event |

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
| `tax_amount` | Float | Computed: `subtotal x tax_rate / 100` |
| `total` | Float | `subtotal + tax_amount` |
| `amount_paid` | Float | Running sum of recorded payments |
| `amount_due` | Float | `total - amount_paid` |
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
| `subtotal` | Float | `quantity x unit_price x (1 - discount_pct/100)` |
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

### CompanyProfile

Issuer identity printed on generated documents. One row per workspace, enforced
by a unique index on `workspace_id`. Every field is optional: a workspace that
configures nothing keeps the previous document, with `"CBOS"` as the issuer.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `workspace_id` | String | FK → workspaces, unique |
| `legal_name` | String(255) | Replaces `"CBOS"` in the document header when set |
| `tax_id` / `tax_id_label` | String(50) / String(20) | Label defaults to `RFC`; rendered as `LABEL: value` |
| `address_line`, `city`, `state`, `postal_code`, `country` | String | Empty parts are skipped, not printed blank |
| `email`, `phone`, `website` | String | Joined into a single contact line |
| `logo_data_uri` | Text | PNG/JPEG base64 data URI, ≤ 200 KB decoded. Stored inline because the codebase has no file-storage subsystem |
| `default_currency` | String(10) | Default `USD` |
| `default_tax_rate` | Float | 0–100 |
| `invoice_footer_note` | Text | Prepended to the document footer |

---

## Document Rendering

`generate_invoice_pdf(invoice, profile=None, party=None)` takes both extras as
optional. Called with neither, its output matches the original
hardcoded-issuer rendition — a backwards-compatibility requirement with
dedicated regression tests.

- **Issuer** comes from `CompanyProfile`; a stored logo that fails to decode is
  skipped rather than breaking generation.
- **Customer** comes from `resolve_invoice_party`, which resolves the invoice's
  `organization_id` and `contact_id` **filtering by `workspace_id` on both
  queries**. A reference that does not resolve degrades to an empty block
  instead of raising, so document generation always succeeds.
- **Fonts**: a Unicode TTF (DejaVu, installed via `fonts-dejavu-core`) is
  registered when available, with fallback to Helvetica. This matters for
  characters outside latin-1 — currency symbols such as `₡` and `₲`, and
  typographic quotes — which the built-in core fonts cannot encode. Spanish
  accents and eñes are latin-1 safe and render correctly either way.

---

## Events

| Event | Trigger | Status |
|---|---|---|
| `InvoiceCreated` | On `POST /invoices` — invoice persisted with lines | Published |
| `InvoiceSent` | On `PATCH /invoices/{id}` when status transitions to `sent` | Published |
| `InvoicePaid` | On `POST /payments` when `amount_due` reaches zero | Published |
| `InvoiceOverdue` | Overdue scanner transitions `sent`/`partial` → `overdue` | Published |
| `PaymentRecorded` | On every successful `POST /payments` | Published |

All events are emitted via `app.events.bus.publish` with `source_module="accounting"`. Event type constants are defined in `app/events/types.py`.

---

## Test Coverage

| File | Tests | Coverage |
|---|---|---|
| `tests/test_accounting_contract.py` | 21 | Auth guards, workspace isolation, invoice lifecycle, payment recording, summary shape |
| `tests/test_accounting.py` | 5 | Multi-payment, tax/discount, filtering, summary |
| `tests/test_invoice_consumer.py` | 16 | Auto-invoice consumer: group creation, dedup, filtering, edge cases, full integration |
| `tests/test_overdue_scanner.py` | 15 | Overdue scanner: transition logic, due date logic, event emission, edge cases |
| `tests/test_e2e_sales_accounting.py` | 1 | Cross-module: SalesOrder → Invoice → Payment |
| `tests/test_e2e_portal_accounting.py` | 2 | Portal accept → SalesOrder → Invoice → Payment |
| `tests/test_company_profile.py` | 31 | Model, schemas, upsert service, logo validation, endpoints, customer resolution including the cross-workspace guard for both organization and contact |
| `tests/test_invoice_pdf_rendering.py` | 21 | Font registration and fallback, issuer/logo/customer rendering, the `"CBOS"` backwards-compatibility guard, and endpoint round trip. Asserts on text extracted with `pypdf`, since an embedded font subset encodes glyphs rather than literal strings |

**Total: 112 tests** covering the Accounting module.

The frontend settings page has its own end-to-end suite in
`composable-os/e2e/company-profile.spec.ts` (8 cases, `npm run test:e2e`). It
requires the stack running and is not part of CI.

---

## Known Gaps (Accepted for MVP)

1. **No credit notes or refunds** — only positive payments are supported; refund workflows require a separate module or manual void + re-invoice
2. **No multi-currency** — all amounts are stored in a single currency per invoice; no exchange rate management
3. **No recurring invoices** — subscription billing requires a scheduler and template system not yet built
4. **No customer fiscal data on documents** — the customer block prints name, contact, email, phone and country only. `Organization` has no `tax_id` or address columns, so a fully compliant recipient block needs an identity-module change that touches CRM, sales and portal
5. **Not a fiscally valid document** — this produces a readable commercial PDF, not a CFDI or any stamped invoice. No tax-authority integration, digital signature, or folio/serie control
6. **One issuer per workspace** — a workspace operating several legal entities cannot pick an issuer per invoice
