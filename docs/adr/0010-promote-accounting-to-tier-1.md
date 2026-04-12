# ADR 0010 — Promote Accounting to Tier 1 (Wedge-Critical)

**Date:** 2026-04-11
**Status:** Accepted
**Deciders:** Platform team

---

## Context

Accounting was promoted to active Tier 2 in ADR 0008 (2026-04-11). At that time, ADR 0008 noted that Tier 1 consideration required at least one end-to-end wedge integration scenario — specifically, a `SalesOrder → Invoice → Payment` flow demonstrating the financial close of a fulfilled commercial transaction.

The scorecard promotion criteria (§5) state:

> A module may advance from Tier 2 → Tier 1 when it achieves all six dimensions at 🟢 **and** at least one end-to-end scenario involving this module.

Accounting had a 6/6 scorecard score at the time of ADR 0008. The only missing gate was the E2E scenario.

---

## Decision Evidence

`test_e2e_sales_accounting.py` (commit `f26e8bf`, merged master 2026-04-11) provides a cross-module end-to-end test covering the full commercial close lifecycle:

| Test | Coverage |
|------|----------|
| `test_sales_order_to_invoice_to_payment_flow` | SalesOrder created → Invoice created for the order → Invoice marked sent → Payment recorded → Invoice status `paid` confirmed |

This test verifies:

1. **Sales → Accounting linkage**: `POST /api/v1/accounting/invoices` created from a real `SalesOrder` ID
2. **Invoice lifecycle**: `draft` → `sent` → `paid` state transitions
3. **Payment recording**: `POST /api/v1/accounting/invoices/{id}/payments` with partial-then-remainder amounts
4. **Payment summary integrity**: `/invoices/{id}/summary` reflects total paid and remaining balance
5. **Event publishing**: `InvoiceCreated`, `InvoiceSent`, `InvoicePaid`, and `PaymentRecorded` events confirmed emitted via service-layer tests

The cross-module flow `SalesOrder → Invoice → Payment` is the **financial tail of the wedge**: every commercial transaction that enters the wedge via Discovery, moves through CRM and Sales, and fulfills via Inventory must eventually close through Accounting.

---

## Decision

Promote `accounting` from **Tier 2 — Wedge Support** to **Tier 1 — Wedge-Critical**.

### Rationale

Accounting is the **terminal node of the wedge funnel**: `Lead → Opportunity → Quote → Order → (Inventory) → Invoice → Payment`. Without Accounting, the wedge has no financial close — revenue is tracked in Sales as "fulfilled" but never converted to an AR record. The module's position as the financial record of truth makes it structurally wedge-critical, not merely supportive.

The module meets all five promotion criteria:

| Criterion | Evidence |
|-----------|----------|
| Contract tests | ✅ 21 tests (`test_accounting_contract.py`) |
| Integration tests | ✅ 5 tests (`test_accounting.py`) |
| Frontend alignment | ✅ Invoice UI wired to real API (Sprint 6) |
| Capability spec | ✅ `docs/capabilities/accounting.md` |
| E2E scenario | ✅ `test_e2e_sales_accounting.py` (cross-module SalesOrder→Invoice→Payment) |

---

## Consequences

**Positive:**

- Accounting joins Identity, CRM, Sales, Inventory, Workflows, and Discovery as a **Tier 1 — Wedge-Critical** module
- Tier 1 now covers 7 modules, closing the full wedge loop: Discovery → Identity → CRM → Sales → Inventory → Accounting
- Contract and integration test coverage for Accounting must be maintained at Tier 1 bar
- Breaking changes to the Accounting API (invoice schema, payment endpoints, event contracts) require the same review process as CRM or Sales

**Negative / Risks:**

- Event type constants (`INVOICE_CREATED`, `INVOICE_SENT`, etc.) are still defined locally in `accounting/service.py` rather than in `app/events/types.py` — consolidation is a Q3 backlog item (4.2) and a prerequisite for full ADR 0004 event governance compliance
- Overdue invoice status transitions are not automated — `overdue` state requires a scheduled job not yet built; this is a functional gap carried from ADR 0008
- Accounting has no lane in `test_wedge_smoke.py` — the smoke test should be extended to include an invoice creation step after order fulfillment in a future sprint
- `SalesOrder → Invoice` linkage is not yet automatic (via event); the E2E test creates the invoice explicitly via API. Auto-invoice-on-fulfillment via event consumer is a Phase 6 backlog item

---

## Related

- ADR 0003: Anchor the MVP on the commercial operations wedge
- ADR 0004: Treat events as versioned domain contracts
- ADR 0008: Promote Discovery and Accounting to active Tier 2
- `test_e2e_sales_accounting.py` — E2E evidence
- `docs/capabilities/accounting.md`
- `docs/CAPABILITY_MATURITY_SCORECARD.md`
