# Implementation Alignment

## Purpose

This document tracks alignment between the governing architecture documents and the code currently implemented in the repository.

The governing documents are:

- `docs/GOVERNANCE_MODEL.md`
- `docs/FOUNDATIONAL_ARCHITECTURE.md`
- `docs/CAPABILITY_MATRIX_MVP.md`
- `docs/API_CONVENTIONS.md`
- `docs/EVENT_REGISTRY_V1.md`
- `docs/adr/`

Legacy documents are historical reference only unless explicitly promoted by ADR.

---

## Current Alignment Summary

### Aligned

- Backend is implemented as a modular monolith
- FastAPI is the active backend stack
- React plus Vite is the active frontend stack
- PostgreSQL is the primary transactional database
- Redis is the active event and notification backbone
- Core backend modules exist for the active capability areas
- Portal, notifications, accounting, discovery, contracts, projects, and HR have been promoted into the active Tier 1 surface
- Contracts, Projects, and HR have deploy readiness evidence: backend routers registered, Alembic migrations present, active frontend routes/services, valid production compose config, local HTTP create/list smoke, and passing frontend production build
- Public token-based external interaction already exists in production through Portal
- Business events are emitted through the shared event envelope in `backend/app/events/types.py`

### Partially Aligned

- The MVP wedge is implemented end to end, but some boundaries remain more coupled than the target architecture wants
- API conventions are documented, but conformance is still uneven outside the most critical modules
- Error Code Registry V1 exists and CI enforces parity between raised codes, registry entries, and the frontend translation map. `projects`, `sales`, `crm`, and `portal` raise registered codes and their pages render Spanish from them; the other seven modules still return free-text `detail` and reach the user in English
- Event Registry V1 exists and CI now enforces parity between event constants, registry entries, and statically detectable publishers
- Capability specs exist for active modules, but their freshness is uneven and they need periodic maintenance
- Strategic integration direction for external brand sites now exists in docs, and Public Site Lead Intake V1 has an initial backend implementation path alongside Portal
- CRM now owns both authenticated internal lead creation and the first public site intake boundary. The public path now has site-key resolution, origin validation, idempotency, rate-limit responses, decision logging, and enriched `LeadCaptured` metadata, but still needs production-like operational validation.

### Misaligned Or At Risk

- Some active docs still contain old metrics or outdated maturity statements if they are not refreshed after each sprint
- Public integration ambitions in `cbos_sdd_portal_integration_contract.md` are broader than the currently implemented codebase
- Event governance is documented and CI now enforces registry parity for event constants and statically detectable publishers
- Partial inventory reservation behavior still needs deeper operational coverage and user-facing surfacing, even though Portal now reaches Inventory through the Sales gateway boundary
- Contracts, Projects, and HR still need a production-domain smoke record before their scorecard Production dimension can be marked green

---

## Current Platform Snapshot

- Active modules: identity, crm, sales, inventory, portal, discovery, workflows, notifications, accounting, analytics, contracts, projects, hr
- Test suite: 498 automated tests across 36 files
- Frontend active surface: API-backed pages aligned to the implemented backend wedge plus current Tier 1 modules
- Public runtime surfaces:
  - `GET /health`
  - discovery catalog endpoints
  - portal token-based quote and order flows

---

## Gap Register

| Area | Current State | Target State | Priority | Action |
|---|---|---|---|---|
| Architectural source of truth | Governing doc set exists, but some module docs lag behind code | One consistently maintained governing set | High | Refresh active docs when features or promotions land |
| MVP scope control | Wedge is complete, but expansion pressure is growing | Wedge-first growth with explicit ADR gates | High | Keep new public integrations bounded to small validated slices |
| Event contracts | Event registry is active and parity checks run in CI for constants, registry entries, versions, naming, and statically detectable publishers | Versioned domain contracts with explicit maintenance discipline | High | Extend static detection over time for dynamic publisher expressions and keep registry updates in the same change set as event changes |
| Domain boundaries | Portal acceptance now uses the Sales-owned Inventory gateway from ADR 0007; remaining risk is partial reservation visibility and future gateway observability | Explicit boundaries with gateway or event-driven handoff where justified | High | Add deeper tests and product surfacing for partial inventory reservation outcomes |
| Frontend error surfacing | Closed. All 47 `onError` handlers now surface the backend's message when there is one. Two of them read `e.response.data.detail`, an axios shape this codebase does not use — `lib/api.ts` throws a plain `Error` carrying the backend detail in `message`, so the expression always evaluated to `undefined` and the user only saw a generic fallback; the bug survived because those handlers typed the error as `any`, which disabled the check that would have caught it. The audit found no other instance, but did find six handlers that discarded the error entirely, all in the same two files. They now pass `e.message` as the toast description, keeping the generic title as context | Every mutation surfaces the backend's own message when it has one | Low | Type mutation errors as `Error` rather than `any` so the compiler can see this class of mistake. Note that backend messages are English while the UI is Spanish — a pre-existing inconsistency this change makes more visible, worth deciding on separately |
| Frontend alignment | Active routes are much cleaner than before, but docs still lag occasionally | UI backed by owned capabilities and current backend maturity | Medium | Refresh capability specs and route docs alongside feature delivery |
| Test coverage narrative | Codebase has 498 tests, but some docs still report older counts | One accurate confidence narrative | High | Update score-bearing docs in the same change set as features |
| Contracts/Projects/HR production confirmation | Deploy readiness is locally verified, but no production-domain smoke evidence has been recorded in governance | Production dimension marked green only after deployed route smoke passes against the production domain and matching SHA | High | Run production smoke for `/contracts`, `/projects`, `/departments`, and `/employees` after deploy |
| External brand-site integration | Strategic direction documented; public lead intake v1 now has code, contract tests, decision logging, event metadata, and rate-limit response behavior, but is not yet operationally proven under production-like traffic | One validated public integration slice before SDK/builder expansion | High | Run deployment-like validation for CRM public intake before expanding public surfaces |
| Public API boundary | Portal proves public interaction can work; CRM public intake now defines the initial site-key/origin/idempotency/rate-limit model | Explicit public endpoint policy with origin, key, idempotency, abuse controls, and logging rules | High | Promote the CRM public intake contract into broader public API conventions only after production validation |
| Future stack pressure | Strategic docs mention SDK, builder, semantic layers, and UKIP-compatible ideas | Current stack remains frozen until justified | Medium | Treat those areas as target-state only unless promoted by ADR |
| Schema drift between models and database | Closed. `alembic revision --autogenerate` on an unchanged model set emits an empty `upgrade()`, so a generated migration now contains only the intended change. Resolved in three steps: foreign-key delete rules declared in the models, `users.notification_preferences` tightened to `NOT NULL` in the database, and two leftovers removed — a redundant unique constraint on `public_sites.api_key` that duplicated the unique index, and an index on `quote_events.user_id` that no query used | Autogenerate stays silent on an unchanged model set | Medium | Keep it closed: run autogenerate before and after a model change and treat any unrelated output as drift to fix in its own change set, not to hand-edit away |

---

## Immediate Working Rules

- The team should make implementation decisions against the governing docs first
- `docs/cbos_sdd_portal_integration_contract.md` is strategic target-state guidance, not current runtime truth
- No public brand-site integration should be implemented without:
  - clear module ownership
  - workspace scoping
  - explicit authentication or site-key rules
  - event mapping to the active PascalCase registry
  - observability and abuse controls
- New public endpoints should begin with the smallest viable slice that validates the business wedge
- No Portal SDK or Portal Builder work should start before the public lead-intake slice is hardened and operationally proven

---

## Near-Term Alignment Priority

The next recommended integration slice is:

`Public Site Lead Intake v1 operational validation`

Why this slice first:

- it validates external brand-site to CBOS connectivity without expanding the product surface too far
- it reuses a mature CRM capability that already owns lead creation and emits `LeadCaptured`
- it establishes the first site-key, origin validation, idempotency, rate-limit, and decision-log boundary in code
- it still needs production-like runtime validation, abuse-load validation, and deployment confirmation

Reference documents:

- `docs/adr/0013-adopt-public-site-lead-intake-v1-as-the-first-external-integration-slice.md`
- `docs/PUBLIC_SITE_LEAD_INTAKE_V1.md`

---

## Review Cadence

Update this document:

- at the end of each sprint
- whenever a major capability is promoted into core MVP scope
- whenever an ADR changes the architecture baseline
- whenever a new public integration surface is approved or implemented
