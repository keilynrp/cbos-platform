# CBOS Governance Model

## Purpose

This document is the single entry point for documentation governance in CBOS.

Its job is to answer four questions with no ambiguity:

1. Which documents are authoritative
2. Which documents are subordinate
3. What must change when implementation changes
4. What is not allowed to drift

If two documents appear to conflict, this document decides which one wins.

---

## Governance Thesis

CBOS should not be governed by a large flat list of documents with equal weight.

That model creates predictable failure modes:

- planning docs start behaving like architecture
- strategic vision docs get mistaken for runtime truth
- capability docs lag the code but still get cited as authoritative
- implementation advances faster than the control system around it

CBOS therefore adopts a layered governance model with one entry point and explicit precedence.

---

## Precedence Model

The authority order is:

### Level 0 — Governance

- `docs/GOVERNANCE_MODEL.md`

This document defines the rules of documentary authority.

### Level 1 — Foundational Runtime Truth

- `docs/FOUNDATIONAL_ARCHITECTURE.md`
- `docs/API_CONVENTIONS.md`
- `docs/EVENT_REGISTRY_V1.md`
- `docs/adr/`
- `docs/capabilities/`

These documents define how the implemented platform is supposed to behave.

### Level 2 — Current-State Alignment

- `docs/IMPLEMENTATION_ALIGNMENT.md`
- `docs/CAPABILITY_MATURITY_SCORECARD.md`

These documents do not define architecture.
They measure how closely code, tests, and product surfaces align with the governing model.

### Level 3 — Approved Slice Specs

- implementation-specific documents that describe an approved slice already promoted into active delivery
- current example: `docs/PUBLIC_SITE_LEAD_INTAKE_V1.md`

These documents are allowed to define a bounded implementation contract for a specific slice, but they remain subordinate to Levels 0 and 1.

### Level 4 — Planning And Execution

- sprint plans
- backlog documents
- project board documents
- issue-prep documents

Examples:

- `docs/TECHNICAL_BACKLOG_30_60_90.md`
- `docs/SPRINT_BACKLOG_8_WEEKS.md`
- `docs/GITHUB_PROJECT_BACKLOG.md`
- `docs/GITHUB_ISSUES_READY.md`

These documents organize work.
They are not allowed to redefine architecture, APIs, event contracts, or capability ownership.

### Level 5 — Strategic Target-State Documents

- documents that describe future direction not yet promoted into runtime truth

Current example:

- `docs/cbos_sdd_portal_integration_contract.md`

These documents are valid as directional guidance only.
They must never be treated as proof of implemented behavior.

### Level 6 — Archive

- `docs/archive/`

Historical reference only.

---

## Rule Of Conflict

When documents disagree, resolution is mandatory and follows this order:

1. `GOVERNANCE_MODEL.md`
2. Level 1 governing runtime docs
3. Level 2 alignment docs
4. Level 3 approved slice specs
5. Level 4 planning docs
6. Level 5 strategic docs
7. archive

This means:

- a backlog cannot override an ADR
- a strategic spec cannot override an implemented event contract
- a capability doc cannot override foundational architecture
- an alignment report cannot redefine product scope

---

## Source-Of-Truth Map

Each type of question must have one primary home.

| Question | Primary Source |
|---|---|
| What is CBOS architecturally? | `FOUNDATIONAL_ARCHITECTURE.md` |
| What is the doc hierarchy? | `GOVERNANCE_MODEL.md` |
| What API pattern should new work follow? | `API_CONVENTIONS.md` |
| What business events are active and valid? | `EVENT_REGISTRY_V1.md` |
| What changed architecturally and why? | `adr/` |
| Which module owns what? | `capabilities/{module}.md` |
| How aligned is the repo with the model? | `IMPLEMENTATION_ALIGNMENT.md` |
| How mature is each active capability? | `CAPABILITY_MATURITY_SCORECARD.md` |
| How should one approved slice behave? | approved slice spec such as `PUBLIC_SITE_LEAD_INTAKE_V1.md` |
| What should we build next? | planning and backlog docs |
| What might exist in the future? | strategic target-state docs |

If a question cannot be answered from this map, governance is incomplete and the gap should be fixed.

---

## What Counts As Governing

A document is governing only if it does at least one of the following:

- defines architecture
- defines an active runtime contract
- defines an active event contract
- defines module ownership and boundaries
- defines an approved architecture decision

A document is not governing if it primarily:

- sequences work
- proposes ideas
- explores future state
- stores historical decisions
- records brainstorming

---

## Change Control Rules

Any meaningful product or platform change must update its governing layer in the same change set.

### If code changes architecture or boundaries

Required updates:

- `adr/`
- `FOUNDATIONAL_ARCHITECTURE.md` if the baseline changed
- affected capability specs
- `IMPLEMENTATION_ALIGNMENT.md`

### If code adds or changes public routes

Required updates:

- `API_CONVENTIONS.md` if a convention is added or an exception is introduced
- affected capability spec
- approved slice spec if the route belongs to a bounded slice
- `IMPLEMENTATION_ALIGNMENT.md`

### If code adds or changes business events

Required updates:

- `EVENT_REGISTRY_V1.md`
- affected capability spec
- `IMPLEMENTATION_ALIGNMENT.md` if the event changes module parity or public claims

### If code promotes a module materially

Required updates:

- capability spec
- `CAPABILITY_MATURITY_SCORECARD.md`
- `IMPLEMENTATION_ALIGNMENT.md`
- ADR if the promotion changes architecture or platform scope

### If a planning document implies architecture

That is invalid until promoted into:

- ADR
- foundational docs
- capability specs
- approved slice spec

---

## Documentation Definition Of Done

A feature or capability change is not complete unless all of the following are true:

- code is implemented
- tests exist or the gap is explicitly accepted
- affected governing docs are updated
- alignment docs are refreshed if the change affects current-state claims
- any strategic doc touched by the feature is clearly marked as future-state or current-state

This rule is mandatory for:

- new public endpoints
- new business events
- cross-module boundary changes
- new active capabilities
- promotions of capability maturity

---

## Mandatory Operating Discipline

The team should follow these rules continuously:

### 1. One entry point first

Every documentation review starts at:

- `docs/GOVERNANCE_MODEL.md`

### 2. No flat “governing list”

Documents must not be treated as equally authoritative just because they live in `docs/`.

### 3. No strategic drift into runtime truth

Target-state documents must be explicitly identified and kept subordinate until promoted by ADR or approved slice contract.

### 4. No implementation-only truth for critical changes

Critical product behavior cannot live only in code.
If it changes product, boundary, or contract, it must be written down in the governing layer.

### 5. No stale score claims

Any document that states counts, maturity, or implementation status must be updated when those claims materially change.

### 6. No cross-module ambiguity

If ownership is unclear between two modules, the capability specs or ADR set are incomplete and must be corrected.

---

## Review Cadence

### Per pull request

Check:

- did this change alter a route, event, boundary, capability status, or public behavior
- if yes, were governing docs updated in the same PR

### PR And CI Enforcement

CBOS should not rely on reviewer memory alone.

The operational enforcement model is:

- PR authors must complete the governance checklist in the PR template
- CI must fail when critical implementation changes land without the expected governing updates

The minimum enforced cases are:

- code changes in backend runtime or frontend product surface without any `docs/` update
- event-contract changes without `docs/EVENT_REGISTRY_V1.md`
- route-surface changes without at least one of:
  - `docs/API_CONVENTIONS.md`
  - `docs/IMPLEMENTATION_ALIGNMENT.md`
  - affected capability spec under `docs/capabilities/`

The purpose of CI is not to prove documentation quality.
It is to prevent silent drift.

### Per sprint

Refresh:

- `IMPLEMENTATION_ALIGNMENT.md`
- `CAPABILITY_MATURITY_SCORECARD.md`

### Per architectural change

Require:

- ADR

### Per new public integration slice

Require:

- approved slice spec
- capability spec updates
- event and API contract updates where applicable

---

## Anti-Patterns To Reject

The following should be treated as governance failures:

- using a sprint plan as proof of implemented behavior
- citing a strategic integration document as current runtime truth
- adding a new public route without updating capability and API governance
- publishing new events without updating the registry
- changing module ownership in code without changing the capability spec or ADR set
- reporting maturity metrics that are no longer true

---

## Immediate Application To Current CBOS

Starting now, the active documentary model is:

- `GOVERNANCE_MODEL.md` decides authority
- `FOUNDATIONAL_ARCHITECTURE.md` defines the platform baseline
- `API_CONVENTIONS.md` defines route behavior norms
- `EVENT_REGISTRY_V1.md` defines active event truth
- `adr/` defines major architectural decisions
- `capabilities/` defines module ownership and active boundaries
- `IMPLEMENTATION_ALIGNMENT.md` reports current gaps
- `CAPABILITY_MATURITY_SCORECARD.md` reports maturity
- `PUBLIC_SITE_LEAD_INTAKE_V1.md` is an approved slice contract
- `cbos_sdd_portal_integration_contract.md` remains strategic only

This is the model that should govern future product and implementation discipline.
