# Capability Maturity Scorecard

> Sprint 6 — assessed 2026-03-29. Review each sprint.

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
| **Identity** | 🟢 | 🟢 | 🟡 | 🟢 | 🟢 | 🟢 | 5/6 |
| **CRM** | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 6/6 |
| **Sales** | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 6/6 |
| **Inventory** | 🟢 | 🟢 | 🟡 | 🟢 | 🟢 | 🟢 | 5/6 |
| **Workflows** | 🟡 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 5/6 |

> Workflows: contract tests are embedded in `test_workflows.py` rather than a dedicated `test_workflows_contract.py`.

### Tier 2 — Wedge Support

| Module | Contract Tests | Integration Tests | Events | Frontend | Spec | Production | Score |
|--------|:-:|:-:|:-:|:-:|:-:|:-:|-------|
| **Portal** | 🟢 | 🔴 | 🟡 | 🟢 | 🔴 | 🟢 | 4/6 |
| **Notifications** | 🔴 | 🔴 | 🟢 | 🟡 | 🔴 | 🟡 | 2/6 |

> Portal: 17 contract tests pass; missing integration test file and capability spec. Nominated for promotion to active Tier 2 (see ADR 0006).
> Notifications: No automated tests. WebSocket delivery works in production; email delivery depends on SMTP config.

### Tier 3 — Controlled Expansion

| Module | Contract Tests | Integration Tests | Events | Frontend | Spec | Production | Score |
|--------|:-:|:-:|:-:|:-:|:-:|:-:|-------|
| **Discovery** | 🟢 | 🔴 | 🔴 | 🟢 | 🔴 | 🟢 | 3/6 |
| **Accounting** | 🔴 | 🔴 | 🔴 | 🟢 | 🔴 | 🟡 | 1/6 |

> Discovery: 22 contract tests; no event publishing or capability spec.
> Accounting: Invoicing UI wired to API; no tests, no events, no spec. Needs test coverage before any promotion.

---

## End-to-End Coverage

| Test | Modules Covered | Status |
|------|----------------|--------|
| `test_wedge_smoke.py` | CRM → Sales (Lead → Opp → Quote → Order → Fulfilled) | 🟢 Passing |
| `test_workflow_consumer.py` | Workflows consumer reliability | 🟢 Passing (8 tests) |

---

## Promotion Criteria

A module may advance from Tier 3 → Tier 2 or Tier 2 → Tier 1 when it achieves:

1. Contract tests: 🟢
2. Integration tests: 🟢
3. Frontend alignment: 🟢
4. Capability spec: 🟢
5. At least one end-to-end scenario involving this module

---

## Action Register

| Module | Highest-Priority Gap | Sprint Target |
|--------|---------------------|---------------|
| Identity | Add event publishing (UserRegistered, WorkspaceCreated) | Q2 |
| Inventory | Formalize stock-change event publication | Q2 |
| Workflows | Extract dedicated contract test file | Q2 |
| Portal | Write capability spec + integration tests | Q2 (ADR 0006) |
| Notifications | Add contract tests; define WebSocket + email policy | Q2 |
| Discovery | Write capability spec; add integration tests | Q2 |
| Accounting | Write contract + integration tests; define invoice-to-payment flow | Q2 |

---

## Overall Platform Score

| Tier | Modules | Avg Score |
|------|---------|-----------|
| Tier 1 | 5 modules | 5.4 / 6 |
| Tier 2 | 2 modules | 3.0 / 6 |
| Tier 3 | 2 modules | 2.0 / 6 |

**Tier 1 is production-hardened.** Tier 2 and 3 need structured investment in Q2.
