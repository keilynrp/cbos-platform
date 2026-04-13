# Capability Maturity Scorecard

> Updated 2026-04-12 (post Q3 close — ADRs 0009–0012). Previous assessment: 2026-04-11 (post ADRs 0009–0010).

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
| **Discovery** | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | **6/6** |
| **Accounting** | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | **6/6** |
| **Portal** | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | **6/6** |
| **Notifications** | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | **6/6** |

> Identity: `UserRegistered` + `WorkspaceCreated` events added Q2.
> Inventory: All stock-change events confirmed implemented (StockMovementRecorded, InventoryReserved, InventoryReleased, InventoryLowThresholdDetected).
> Workflows: Dedicated `test_workflows_contract.py` added (23 tests). DLQ monitoring endpoint added Q2. Route ordering bug fixed (DLQ routes now correctly precede `/{workflow_id}`).
> Discovery: Promoted Tier 2 → Tier 1 (ADR 0009, 2026-04-11). E2E: `test_e2e_discovery_blueprint.py` (3 tests). Known gap: `apply_blueprint` provisioning stub pending Phase 6.
> Accounting: Promoted Tier 2 → Tier 1 (ADR 0010, 2026-04-11). E2E: `test_e2e_sales_accounting.py` (SalesOrder→Invoice→Payment). Auto-invoice consumer implemented Q3. Overdue scanner implemented Q4 (G2) — all ADR 0010 gaps resolved.
> Portal: Promoted Tier 2 → Tier 1 (ADR 0011, 2026-04-12). 18 contract + 5 integration tests. E2E: `test_e2e_portal_accounting.py`.
> Notifications: Promoted Tier 2 → Tier 1 (ADR 0012, 2026-04-12). 70 tests across 4 files. Email preferences UI + API. Frontend 🟢 — Notifications tab in Settings with granular email toggles.

### Tier 2 — Wedge Support

> 0 modules as of 2026-04-12. All 9 modules promoted to Tier 1.

| Module | Contract Tests | Integration Tests | Events | Frontend | Spec | Production | Score |
|--------|:-:|:-:|:-:|:-:|:-:|:-:|-------|
| — | — | — | — | — | — | — | — |

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
| `test_e2e_sales_accounting.py` | Sales → Accounting (SalesOrder → Invoice → Payment) | 🟢 Passing (1 cross-module test) |
| `test_e2e_discovery_blueprint.py` | Discovery (Session → Chat → Blueprint → Apply → WorkspaceActivated) | 🟢 Passing (3 tests) |
| `test_e2e_notifications_pipeline.py` | Notifications (event bus → Redis → WebSocket delivery chain) | 🟢 Passing (17 tests, 5 layers) |
| `test_e2e_portal_accounting.py` | Portal → Sales → Accounting (Quote accept via token → SalesOrder → Invoice → Payment) | 🟢 Passing (2 tests) |
| `test_e2e_portal_ws_notification.py` | Portal → Notifications (session creation → WS notification) | 🟢 Passing (11 tests) |
| `test_wedge_smoke.py::full_wedge` | CRM → Inventory → Sales → Portal → Accounting (7-module funnel) | 🟢 Passing |
| `test_invoice_consumer.py` | Sales → Accounting (auto-invoice on SalesOrderFulfilled) | 🟢 Passing (16 tests) |
| `test_notification_preferences.py` | Notifications (email preferences CRUD) | 🟢 Passing (10 tests) |
| `test_overdue_scanner.py` | Accounting (overdue invoice automation) | 🟢 Passing (15 tests) |
| `test_analytics.py` | Analytics (cross-module aggregation — summary, revenue, pipeline) | 🟢 Passing (24 tests) |

---

## Promotion Criteria

A module may advance from Tier 3 → Tier 2 or Tier 2 → Tier 1 when it achieves:

1. Contract tests: 🟢
2. Integration tests: 🟢
3. Frontend alignment: 🟢
4. Capability spec: 🟢
5. At least one end-to-end scenario involving this module

> Discovery (6/6) and Accounting (6/6) promoted to Tier 2 (ADR 0008, 2026-04-11).
> Discovery promoted to Tier 1 (ADR 0009, 2026-04-11) — E2E: `test_e2e_discovery_blueprint.py`.
> Accounting promoted to Tier 1 (ADR 0010, 2026-04-11) — E2E: `test_e2e_sales_accounting.py`.

---

## Action Register

| Module | Gap | Status |
|--------|-----|--------|
| Identity | Add event publishing (UserRegistered, WorkspaceCreated) | ✅ Done Q2 |
| Inventory | Formalize stock-change event publication | ✅ Done Q2 (confirmed in code) |
| Workflows | Extract dedicated `test_workflows_contract.py` | ✅ Done Q3 (23 tests) |
| Portal | Write capability spec + integration tests | ✅ Done Q2 |
| Portal | Emit `PortalSessionCreated` consistently; add contract test | ✅ Done Q3 |
| Notifications | Add contract tests; connect email to event bus | ✅ Done Q2 |
| Notifications | Frontend email status surface | ✅ Done Q3 (Notifications tab + preferences API) |
| Notifications | Promote to Tier 1 | ✅ Done Q3 (ADR 0012) |
| Portal | Promote to Tier 1 | ✅ Done Q3 (ADR 0011) |
| Discovery | Write capability spec; add integration tests | ✅ Done Q2 |
| Discovery | Promote to Tier 2 | ✅ Done Q2 (ADR 0008) |
| Discovery | E2E scenario for Tier 1 promotion | ✅ Done Q3 (`test_e2e_discovery_blueprint.py`) |
| Discovery | Promote to Tier 1 | ✅ Done Q3 (ADR 0009) |
| Accounting | Write contract + integration tests; capability spec | ✅ Done Q2 |
| Accounting | Promote to Tier 2 | ✅ Done Q2 (ADR 0008) |
| Accounting | E2E scenario for Tier 1 promotion | ✅ Done Q3 (`test_e2e_sales_accounting.py`) |
| Accounting | Promote to Tier 1 | ✅ Done Q3 (ADR 0010) |
| Accounting | Consolidate event constants to `app/events/types.py` | ✅ Done Q3 (backlog 4.2) |
| Sales→Inventory | Resolve direct-invocation coupling in quote acceptance | ✅ Done Q2 (ADR 0007, Gateway pattern) |

---

## Overall Platform Score

| Tier | Modules | Avg Score | vs. Q2 post-ADR 0008 |
|------|---------|-----------|----------------------|
| Tier 1 | **9 modules** | **6.0 / 6** | ↑ from 5 (Discovery, Accounting, Portal, Notifications promoted) |
| Tier 2 | **0 modules** | — | All promoted to Tier 1 |
| Tier 3 | 0 modules | — | Unchanged — Tier 3 remains clear |

**All 9 modules are Tier 1 — Wedge-Critical, all scoring 6/6.**
Full wedge funnel: Discovery → Identity → CRM → Sales → Inventory → Portal → Workflows → Accounting → Notifications.
**359 tests across 30 test files.** Q3 backlog 100% closed. Q4 G2 (overdue automation) complete. Q4 E1 (analytics real data) complete.
