# ADR 0006 — Promote Portal to Active Tier 2 Capability

**Date:** 2026-03-29
**Status:** Accepted
**Deciders:** Platform team

---

## Context

The `portal` module provides a customer-facing interface for reviewing quotes and orders, accessible via time-limited tokens without full authentication. It was classified as Tier 2 Conditional in ADR 0003 and the Capability Matrix MVP.

After Sprints 3–5, the following evidence is available:

- 17 contract tests pass (`test_portal_contract.py`): token validation, quote accept/reject, idempotency, order status
- `CustomerPortal.tsx` is wired to the real backend via token-gated API calls
- `PortalBuilder.tsx` manages portal sessions linked to sales orders
- The portal is deployed and working in production at `cbos.inbounduxd.com`
- Portal sessions are created automatically when a SalesOrder is confirmed (wedge integration)

## Decision

Promote the `portal` module from Tier 2 Conditional to **active Tier 2** status.

This means:
- Portal is now a supported, maintained capability — not exploratory
- It must maintain contract test coverage (currently 17 tests)
- A capability spec must be written (`docs/capabilities/portal.md`) — see Sprint 6
- Integration tests (service-level flows) are added to the Q2 backlog
- Any breaking changes to portal APIs must follow the same review process as Tier 1 modules

## Consequences

**Positive:**
- Portal becomes a first-class customer touchpoint in the wedge
- The team has a clear commitment to maintain its contract and test coverage
- Sets precedent for evidence-based promotion of other Tier 3 modules

**Negative / Risks:**
- Integration test file still missing — must be added before any major refactor
- Event publishing from portal is partial — `PortalSessionCreated` may not be emitted consistently

## Promotion Criteria Met

| Criterion | Status |
|-----------|--------|
| Contract tests | ✅ 17 tests passing |
| Frontend alignment | ✅ PortalBuilder + CustomerPortal wired to API |
| Production stable | ✅ Deployed and working |
| Wedge integration | ✅ Sessions auto-created on order confirmation |
| Capability spec | 🟡 In progress (Sprint 6) |
| Integration tests | 🔴 Not yet — Q2 backlog |

## Related

- ADR 0003: Anchor the MVP on the commercial operations wedge
- ADR 0005: Bound frontend surfaces to owned capabilities
- `docs/CAPABILITY_MATURITY_SCORECARD.md`
- `docs/capabilities/portal.md` (Sprint 6)
