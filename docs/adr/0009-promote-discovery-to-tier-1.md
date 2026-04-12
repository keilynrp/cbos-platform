# ADR 0009 — Promote Discovery to Tier 1 (Wedge-Critical)

**Date:** 2026-04-11
**Status:** Accepted
**Deciders:** Platform team

---

## Context

Discovery was promoted to active Tier 2 in ADR 0008 (2026-04-11). At that time, ADR 0008 noted that Tier 1 consideration required at least one end-to-end wedge integration scenario — specifically, the `apply_blueprint` provisioning flow demonstrating Discovery's role at the top of the wedge funnel.

The scorecard promotion criteria (§5) state:

> A module may advance from Tier 2 → Tier 1 when it achieves all six dimensions at 🟢 **and** at least one end-to-end scenario involving this module.

Discovery had a 6/6 scorecard score at the time of ADR 0008. The only missing gate was the E2E scenario.

---

## Decision Evidence

`test_e2e_discovery_blueprint.py` (commit `e88850e`, merged master 2026-04-11) provides three end-to-end tests covering the full Discovery session lifecycle:

| Test | Coverage |
|------|----------|
| `test_full_discovery_blueprint_flow` | Session creation → message exchange → `generate-blueprint` → `apply-blueprint` → `WorkspaceActivated` event emitted |
| `test_apply_blueprint_requires_blueprint` | 409 guard — `apply_blueprint` rejected when no blueprint exists for session |
| `test_apply_blueprint_returns_workspace_id` | `workspace_id` round-trip integrity between session and apply response |

The `apply_blueprint` endpoint publishes `WorkspaceActivated` (event type `workspace.activated`) to the event bus, completing the top-of-wedge provisioning signal: **a prospect completes Discovery → a workspace is activated**.

### Known Limitation (carried forward from ADR 0008)

`apply_blueprint` activates the workspace at the event level but does not yet provision modules (the provisioning body is a `TODO Phase 6` stub). This gap is documented and tracked. Tier 1 status reflects the module's structural role in the wedge, not the completeness of provisioning logic. The ADR governance will be revisited when Phase 6 provisioning is implemented.

---

## Decision

Promote `discovery` from **Tier 2 — Wedge Support** to **Tier 1 — Wedge-Critical**.

### Rationale

Discovery is the **entry point of the entire wedge funnel**: `Discovery session → Workspace activated → CRM Lead captured → Opportunity → Quote → Order → Invoice`. Every downstream Tier 1 module depends on Discovery having provided the workspace in which they operate. Its structural importance to the wedge is higher than Portal or Notifications, which both remain at Tier 2.

The module meets all five promotion criteria:

| Criterion | Evidence |
|-----------|----------|
| Contract tests | ✅ 22 tests (`test_discovery_contract.py`) |
| Integration tests | ✅ 7 tests (`test_discovery.py`) |
| Frontend alignment | ✅ Session, chat, blueprint UI wired to real API |
| Capability spec | ✅ `docs/capabilities/discovery.md` |
| E2E scenario | ✅ `test_e2e_discovery_blueprint.py` (3 tests) |

---

## Consequences

**Positive:**

- Discovery joins Identity, CRM, Sales, Inventory, and Workflows as a **Tier 1 — Wedge-Critical** module
- Tier 1 now covers 6 modules, completing the full wedge funnel from discovery to fulfillment
- Contract and integration test coverage for Discovery must be maintained at the same bar as other Tier 1 modules
- Breaking changes to the Discovery API require the same review process as Identity or CRM

**Negative / Risks:**

- The `apply_blueprint` provisioning stub remains unresolved — this is a functional gap, not a structural one, and does not invalidate Tier 1 status
- `DiscoveryMessage.token_count` is unpopulated; AI cost tracking is deferred to Phase 6
- Discovery has no representation in `test_wedge_smoke.py` yet — the smoke test should be extended to include a Discovery session as the wedge entry point in a future sprint

---

## Related

- ADR 0003: Anchor the MVP on the commercial operations wedge
- ADR 0008: Promote Discovery and Accounting to active Tier 2
- `test_e2e_discovery_blueprint.py` — E2E evidence
- `docs/capabilities/discovery.md`
- `docs/CAPABILITY_MATURITY_SCORECARD.md`
