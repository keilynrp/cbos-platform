# Q3 2026 Backlog

> Derived from: Capability Maturity Scorecard (post-ADR 0008), Implementation Alignment Gap Register.
> Q2 closed at: 262 tests, 18 files, all modules ≥ Tier 2, Tier 1 avg 6.0/6.

---

## Priority 1 — Tier 2 → Tier 1 promotion path (Discovery + Accounting)

_Scorecard note: Discovery and Accounting are 6/6 in Tier 2. Promotion to Tier 1 requires at
least one end-to-end wedge integration scenario per module (promotion criteria §5)._

| # | Item | Evidence | Tier 1 Prereq |
|---|------|----------|:---:|
| 1.1 | E2E test: `apply_blueprint` provisioning flow (Discovery → workspace setup) | Scorecard note on Discovery promotion path | Yes |
| 1.2 | E2E test: `SalesOrder → Invoice → Payment` full accounting lifecycle | Scorecard note on Accounting promotion path | Yes |
| 1.3 | ADR for Discovery Tier 1 promotion once E2E scenario passes | Promotion criteria require formal ADR | Yes |
| 1.4 | ADR for Accounting Tier 1 promotion once E2E scenario passes | Promotion criteria require formal ADR | Yes |

---

## Priority 2 — Tier 2 hardening gaps (Portal + Notifications)

_Portal scores 5/6 (Events 🟡). Notifications scores 5/6 (Frontend 🟡). Both are active Tier 2._

| # | Item | Evidence |
|---|------|----------|
| 2.1 | Emit `PortalSessionCreated` consistently from Portal service layer | `portal.md` Events table — 🟡 "not consistently emitted"; scorecard Portal Events 🟡 |
| 2.2 | Add contract test covering `PortalSessionCreated` emission | Scorecard Portal Events 🟡; promotion criteria require event publishing 🟢 |
| 2.3 | Surface email notification status in frontend (notification tray / settings) | Scorecard Notifications Frontend 🟡; `notifications.md` gap #5 |
| 2.4 | Define email delivery policy: which events trigger email, recipient resolution, opt-out | `notifications.md` gap — "delivery policy undefined"; required for full frontend alignment |
| 2.5 | Verify and document WebSocket reconnection + missed-event handling in frontend | `notifications.md` gap #4 — "reconnection unverified" |

---

## Priority 3 — End-to-end scenarios

_Existing E2E: wedge smoke, workflow consumer, portal accept. No cross-module flows covering
Discovery, Accounting, or the event→notification delivery path._

| # | Item | Evidence |
|---|------|----------|
| 3.1 | E2E: domain event → Redis pub/sub → WebSocket client delivery (Notifications) | `notifications.md` — "end-to-end path from bus.publish() through Redis to WS client not covered" |
| 3.2 | E2E: Portal session creation → `PortalSessionCreated` event emitted → WS notification received | Combines Portal Events gap + Notifications E2E gap |
| 3.3 | E2E: Quote accepted via Portal → SalesOrder created → Invoice auto-created (Sales + Accounting) | Accounting promotion path; no existing cross-module test covers this flow |

---

## Priority 4 — Technical debt

_Known items carried or deferred from Q2._

| # | Item | Evidence |
|---|------|----------|
| 4.1 | Normalize pagination policy across all wedge-critical APIs | Alignment gap register: CRM/Sales use 50/200, Inventory 100/500, Workflows missing `offset` |
| 4.2 | Standardize event envelope and registration (versioned domain contracts) | Alignment gap register: "Events exist but need stricter governance"; ADR 0004 target state |
| 4.3 | Resolve `Workflows` contract test entry still marked 🟡 in action register | Scorecard action register: "Extract dedicated `test_workflows_contract.py`" — 🟡 Pending |
| 4.4 | Archive legacy docs that contradict governing architecture set | Alignment gap: "Historical docs describe multiple stacks; several frontend surfaces ahead of maturity" |

---

_Last updated: 2026-04-11 | Based on: CAPABILITY_MATURITY_SCORECARD.md, IMPLEMENTATION_ALIGNMENT.md_
