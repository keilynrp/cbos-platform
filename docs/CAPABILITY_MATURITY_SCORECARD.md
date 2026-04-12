# Capability Maturity Scorecard

> Updated 2026-04-11 (post Q2 sprint). Previous assessment: 2026-03-29 (Sprint 6).

## Scoring Dimensions

Each dimension scores 🟢 (done) / 🟡 (partial) / 🔴 (missing):

| # | Dimension | Description |
|---|-----------|-------------|
| 1 | **Contract Tests** | `test_{module}_contract.py` covers auth guards + lifecycle |
| 2 | **Integration Tests** | `test_{module}.py` covers service flows |
| 3 | **Event Publishing** | Module emits domain events from service layer |
| 4 | **Frontend Alignment** | UI backed by real API calls (not mock data) |
| 5 | **Capability Spec** | `docs/capabilities/{module}.md` exists |
| 6 | **Production Stable** | Deployed and working in production |

---

## Module Scores

### Tier 1 — Wedge-Critical

| Module | Contract Tests | Integration Tests | Events | Frontend | Spec | Production | Score |
|--------|:-:|:-:|:-:|:-:|:-:|:-:|-------|
| **Identity** | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | **6/6** |
| **CRM** | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | **6/6** |
| **Sales** | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | **6/6** |
| **Inventory** | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | **6/6** |
| **Workflows** | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | **6/6** |

> Identity: `UserRegistered` + `WorkspaceCreated` events added Q2.
> Inventory: All stock-change events confirmed implemented (StockMovementRecorded, InventoryReserved, InventoryReleased, InventoryLowThresholdDetected).
> Workflows: Dedicated `test_workflows_contract.py` added (23 tests). DLQ monitoring endpoint added Q2. Route ordering bug fixed (DLQ routes now correctly precede `/{workflow_id}`).

### Tier 2 — Wedge Support

> 4 modules as of 2026-04-11. Discovery and Accounting promoted from Tier 3 (ADR 0008). All four modules hold the same hardening bar.

| Module | Contract Tests | Integration Tests | Events | Frontend | Spec | Production | Score |
|--------|:-:|:-:|:-:|:-:|:-:|:-:|-------|
| **Portal** | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | **6/6** |
| **Notifications** | 🟢 | 🟢 | 🟢 | 🟡 | 🟢 | 🟢 | **5/6** |
| **Discovery** | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | **6/6** |
| **Accounting** | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | **6/6** |

> Portal: 18 contract + 5 integration tests. Capability spec added. PortalSessionCreated now emitted consistently post-commit (fixed Q3). Score: 6/6. Promoted to active Tier 2 (ADR 0006).
> Notifications: 32 unit tests added Q2 (WebSocket + ConnectionManager). Capability spec added. Email notifier connected to event bus — QuoteAccepted, SalesOrderCreated, WorkflowFailed, LowStock now trigger emails automatically. Frontend 🟡 — WebSocket delivery works; email UI not yet surfaced.
> Discovery: 22 contract + 7 integration tests. Capability spec added. All 7 domain events confirmed implemented in service layer. Promoted to active Tier 2 (ADR 0008).
> Accounting: 21 contract + 5 integration tests added Q2. 4 events published (InvoiceCreated, InvoiceSent, InvoicePaid, PaymentRecorded). Capability spec added. Promoted to active Tier 2 (ADR 0008).

### Tier 3 — Controlled Expansion

> No modules currently in Tier 3. Tier 3 is a transient state — all modules have been promoted.

| Module | Contract Tests | Integration Tests | Events | Frontend | Spec | Production | Score |
|--------|:-:|:-:|:-:|:-:|:-:|:-:|-------|
| — | — | — | — | — | — | — | — |

---

## End-to-End Coverage

| Test | Modules Covered | Status |
|------|----------------|--------|
| `test_wedge_smoke.py` | CRM → Sales (Lead → Opp → Quote → Order → Fulfilled) | 🟢 Passing |
| `test_workflow_consumer.py` | Workflows consumer reliability | 🟢 Passing (8 tests) |
| `test_portal.py` | Sales → Portal → Customer accept → Order | 🟢 Passing (5 tests) |

---

## Promotion Criteria

A module may advance from Tier 3 → Tier 2 or Tier 2 → Tier 1 when it achieves:

1. Contract tests: 🟢
2. Integration tests: 🟢
3. Frontend alignment: 🟢
4. Capability spec: 🟢
5. At least one end-to-end scenario involving this module

> Discovery (6/6) and Accounting (6/6) promoted to Tier 2 (ADR 0008, 2026-04-11).

---

## Action Register

| Module | Gap | Status |
|--------|-----|--------|
| Identity | Add event publishing (UserRegistered, WorkspaceCreated) | ✅ Done Q2 |
| Inventory | Formalize stock-change event publication | ✅ Done Q2 (confirmed in code) |
| Workflows | Extract dedicated `test_workflows_contract.py` | 🟡 Pending |
| Portal | Write capability spec + integration tests | ✅ Done Q2 |
| Notifications | Add contract tests; connect email to event bus | ✅ Done Q2 |
| Discovery | Write capability spec; add integration tests | ✅ Done Q2 |
| Discovery | Promote to Tier 2 | ✅ Done Q2 (ADR 0008) |
| Accounting | Write contract + integration tests; capability spec | ✅ Done Q2 |
| Accounting | Promote to Tier 2 | ✅ Done Q2 (ADR 0008) |
| Sales→Inventory | Resolve direct-invocation coupling in quote acceptance | 🔴 In progress |

---

## Overall Platform Score

| Tier | Modules | Avg Score | vs. Q2 pre-promotion |
|------|---------|-----------|----------------------|
| Tier 1 | 5 modules | **6.0 / 6** | — |
| Tier 2 | 4 modules | **5.75 / 6** | ↑ from 2 modules (Portal now 6/6) |
| Tier 3 | 0 modules | — | ↓ from 2 modules (all promoted) |

**Tier 1 fully hardened. Tier 2 expanded to 4 modules (ADR 0008).** Tier 3 is clear — no modules remain in Controlled Expansion.
**Sales→Inventory boundary:** Resolved via Gateway pattern (ADR 0007). No remaining architectural gaps.
**Next Tier 1 candidates:** Discovery and Accounting — eligible if end-to-end wedge integration scenarios are demonstrated (apply_blueprint provisioning; SalesOrder → Invoice → Payment flow).
