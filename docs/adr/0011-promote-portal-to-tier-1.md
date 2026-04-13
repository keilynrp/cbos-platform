# ADR 0011 — Promote Portal to Tier 1 (Wedge-Critical)

**Date:** 2026-04-12
**Status:** Accepted
**Deciders:** Platform team

---

## Context

Portal was promoted to active Tier 2 in ADR 0006 (2026-03-29). The module enables external customers to view, accept, or reject quotes via time-limited token-gated links — the human decision point that converts a Sales quote into a binding SalesOrder.

The scorecard promotion criteria (§5) state:

> A module may advance from Tier 2 → Tier 1 when it achieves all six dimensions at 🟢 **and** at least one end-to-end scenario involving this module.

Portal achieves 6/6 on the scorecard and has multiple E2E scenarios.

---

## Decision Evidence

### Scorecard (6/6)

| Dimension | Status | Evidence |
|-----------|--------|----------|
| Contract Tests | 🟢 | 18 tests in `test_portal_contract.py` |
| Integration Tests | 🟢 | 5 tests in `test_portal.py` |
| Event Publishing | 🟢 | `PortalSessionCreated` emitted consistently (fixed Q3 2.1) |
| Frontend Alignment | 🟢 | Public portal view + internal portal management backed by real API |
| Capability Spec | 🟢 | `docs/capabilities/portal.md` |
| Production Stable | 🟢 | Deployed and working |

### End-to-End Scenarios

| Test | Coverage |
|------|----------|
| `test_e2e_portal_accounting.py` | Portal accept via public token → SalesOrder → Invoice → partial payment → paid |
| `test_e2e_portal_ws_notification.py` | Portal session creation → PortalSessionCreated event → WS notification delivery |
| `test_wedge_smoke.py::test_full_wedge` | Phase 4: Portal session → customer views → accepts via token (7-module funnel) |

---

## Decision

Promote `portal` from **Tier 2 — Wedge Support** to **Tier 1 — Wedge-Critical**.

### Rationale

Portal is the **external decision gate** of the wedge: it is the mechanism by which a customer converts a Quote into a SalesOrder. Without Portal, the Sales→Fulfillment→Accounting pipeline cannot begin — the customer has no way to formally accept the commercial proposal. This structural position makes Portal wedge-critical, not merely supportive.

---

## Consequences

**Positive:**

- Tier 1 now covers 8 modules (adding Portal to the existing 7)
- Breaking changes to Portal API or token format require Tier 1 review process
- Portal's E2E coverage ensures the customer-facing funnel remains tested

**Negative / Risks:**

- Portal tokens expire after 72 hours with no renewal mechanism — extended sales cycles may require manual re-share
- No email notification when a portal link is shared (only WebSocket notification via PortalSessionCreated)

---

## Related

- ADR 0003: Anchor the MVP on the commercial operations wedge
- ADR 0006: Promote Portal to active Tier 2
- `test_e2e_portal_accounting.py` — E2E evidence
- `test_e2e_portal_ws_notification.py` — E2E evidence
- `docs/capabilities/portal.md`
