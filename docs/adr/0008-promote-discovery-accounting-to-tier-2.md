# ADR 0008 — Promote Discovery and Accounting to Active Tier 2

**Date:** 2026-04-11
**Status:** Accepted
**Deciders:** Platform team

---

## Context

The `discovery` and `accounting` modules were classified as Tier 3 — Controlled Expansion in the Capability Maturity Scorecard. Both modules have been under active development through Q2 2026 (Sprints 6–7).

As of the Q2 scorecard update (2026-04-11), both modules have achieved **6/6** across all six scoring dimensions:

**Discovery** provides the top-of-wedge entry point — an AI-assisted session that converts an unknown prospect into a provisioned workspace. Evidence available:

- 22 contract tests in `test_discovery_contract.py` covering public catalog, auth guards, session CRUD, chat flows, blueprint generation, apply-blueprint, and workspace isolation
- 7 integration tests added Q2 (`test_discovery.py`) verifying service-layer flows and event emission
- All 7 domain events confirmed implemented in `service.py`: `discovery.session.started`, `discovery.pain_point.detected`, `discovery.capability.matched`, `discovery.solution.composed`, `discovery.blueprint.generated`, `discovery.session.completed`, `workspace.activated`
- Frontend wired to real API (session creation, chat, blueprint UI)
- Capability spec written (`docs/capabilities/discovery.md`)
- Deployed and stable in production at `cbos.inbounduxd.com`

**Accounting** provides the financial record layer downstream of fulfilled sales orders — invoice lifecycle, line-item management, payment recording, and AR summary. Evidence available:

- 21 contract tests in `test_accounting_contract.py` covering auth guards, workspace isolation, invoice lifecycle, payment recording, and summary shape
- 5 integration tests added Q2 (`test_accounting.py`) covering service flows, tax and discount computation, and multi-payment scenarios
- 4 domain events published: `InvoiceCreated`, `InvoiceSent`, `InvoicePaid`, `PaymentRecorded`
- Frontend invoicing UI wired to real API (completed Sprint 6)
- Capability spec written (`docs/capabilities/accounting.md`)
- Deployed and stable in production

The scorecard note at the time of the Q2 update explicitly flags both modules as meeting all Tier 2 promotion criteria, with a formal ADR pending.

---

## Decision

Promote both `discovery` and `accounting` from **Tier 3 — Controlled Expansion** to **active Tier 2 — Wedge Support**.

This means both modules are now supported, maintained capabilities — not exploratory — and are held to the same hardening bar as Portal and Notifications:

- Contract test coverage must be maintained (Discovery: 22 tests; Accounting: 21 tests)
- Integration test coverage must be maintained (Discovery: 7 tests; Accounting: 5 tests)
- Any breaking changes to their APIs must follow the same review process as Tier 1 modules
- Domain event contracts are stable — consumers may subscribe without a deprecation window
- Capability specs (`docs/capabilities/discovery.md`, `docs/capabilities/accounting.md`) are authoritative and must be kept current

---

## Promotion Criteria Met

### Discovery

| Criterion | Status |
|-----------|--------|
| Contract tests | ✅ 22 tests passing (`test_discovery_contract.py`) |
| Integration tests | ✅ 7 tests added Q2 (`test_discovery.py`) |
| Event publishing | ✅ All 7 domain events implemented and verified |
| Frontend alignment | ✅ Session, chat, and blueprint UI wired to real API |
| Capability spec | ✅ `docs/capabilities/discovery.md` written Q2 |
| Production stable | ✅ Deployed and working in production |

### Accounting

| Criterion | Status |
|-----------|--------|
| Contract tests | ✅ 21 tests passing (`test_accounting_contract.py`) |
| Integration tests | ✅ 5 tests added Q2 (`test_accounting.py`) |
| Event publishing | ✅ 4 events published (InvoiceCreated, InvoiceSent, InvoicePaid, PaymentRecorded) |
| Frontend alignment | ✅ Invoicing UI wired to real API (Sprint 6) |
| Capability spec | ✅ `docs/capabilities/accounting.md` written Q2 |
| Production stable | ✅ Deployed and working in production |

---

## Consequences

**Positive:**

- Both modules become first-class supported capabilities with clear ownership expectations
- Discovery and Accounting join Portal and Notifications as active Tier 2 modules — Tier 2 now covers 4 modules (up from 2)
- Tier 3 is cleared: no modules remain in Controlled Expansion; the platform has a clean two-tier active structure below Tier 1
- Both modules are now eligible for the **Tier 1 promotion path** if wedge integration is proven — specifically, if Discovery's `apply_blueprint` provisioning and Accounting's SalesOrder-to-Invoice linkage are demonstrated in end-to-end scenarios
- Sets consistent precedent that Tier 3 is a transient state, not a permanent home

**Negative / Risks:**

- Discovery: `apply_blueprint` actual module provisioning is still a stub (`TODO Phase 6`) — emits `workspace.activated` but does not activate modules in practice; Tier 2 status does not waive this gap, which must be resolved before any Tier 1 consideration
- Discovery: `DiscoveryMessage.token_count` is unpopulated; cost-tracking is deferred
- Accounting: Event type constants (`INVOICE_CREATED`, etc.) are defined locally in `service.py` rather than in `app/events/types.py` — divergence risk with consumers; consolidation is a Q3 backlog item
- Accounting: Overdue status is not automated — `overdue` transitions require manual update or a scheduled job not yet built
- Neither module has an end-to-end scenario in `test_wedge_smoke.py` — this is the primary gate for Tier 1 consideration

---

## Related

- ADR 0003: Anchor the MVP on the commercial operations wedge
- ADR 0005: Bound frontend surfaces to owned capabilities
- ADR 0006: Promote Portal to active Tier 2
- ADR 0007: Resolve Sales→Inventory direct-invocation coupling
- `docs/CAPABILITY_MATURITY_SCORECARD.md`
- `docs/capabilities/discovery.md`
- `docs/capabilities/accounting.md`
