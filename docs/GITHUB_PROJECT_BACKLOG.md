# GitHub Project Backlog

## Purpose

This document converts the 8-week sprint plan into epics and issues ready to be used in GitHub Projects, GitHub Issues, or any similar delivery tracker.

Use this together with:

- `docs/FOUNDATIONAL_ARCHITECTURE.md`
- `docs/CAPABILITY_MATRIX_MVP.md`
- `docs/IMPLEMENTATION_ALIGNMENT.md`
- `docs/TECHNICAL_BACKLOG_30_60_90.md`
- `docs/SPRINT_BACKLOG_8_WEEKS.md`

## Suggested Labels

- `epic`
- `architecture`
- `backend`
- `frontend`
- `events`
- `testing`
- `mvp`
- `wedge`
- `identity`
- `crm`
- `sales`
- `inventory`
- `workflows`

## Suggested Status Flow

- `Backlog`
- `Ready`
- `In Progress`
- `Review`
- `Done`

## Epic 1: Establish The Governing MVP Foundation

### Goal

Align the team around the active architecture, wedge, ownership, and conventions.

### Issues

#### Issue: Assign ownership for wedge-critical modules

- Type: `issue`
- Labels: `architecture`, `mvp`, `wedge`
- Sprint: `Sprint 1`
- Description:
  Assign a clear owner for `identity`, `crm`, `sales`, `inventory`, and `workflows`.
- Acceptance Criteria:
  - each wedge-critical module has one clear owner
  - ownership is reflected in team planning
  - ownership gaps are recorded in `IMPLEMENTATION_ALIGNMENT.md`

#### Issue: Define the executable wedge scenario

- Type: `issue`
- Labels: `architecture`, `mvp`, `wedge`
- Sprint: `Sprint 1`
- Description:
  Write the exact business and technical flow for `Lead -> Customer -> Order -> Inventory -> Sale`.
- Acceptance Criteria:
  - the wedge is described as a step-by-step scenario
  - each step maps to a module
  - blocked or missing steps are identified

#### Issue: Publish API conventions for MVP modules

- Type: `issue`
- Labels: `architecture`, `backend`, `mvp`
- Sprint: `Sprint 1`
- Description:
  Standardize API behavior for error shape, pagination, auth expectations, and workspace scoping.
- Acceptance Criteria:
  - conventions are documented
  - module owners review them
  - gaps against the current API are listed

#### Issue: Create event registry v1 for wedge-critical events

- Type: `issue`
- Labels: `architecture`, `events`, `wedge`
- Sprint: `Sprint 1`
- Description:
  Create the first active registry of business events needed by the wedge.
- Acceptance Criteria:
  - event names are listed
  - version field is defined
  - producer module is identified for each event

#### Issue: Audit frontend surfaces against wedge reality

- Type: `issue`
- Labels: `frontend`, `mvp`, `wedge`
- Sprint: `Sprint 1`
- Description:
  Review active UI surfaces and classify them as core, supporting, or exploratory.
- Acceptance Criteria:
  - each current page is classified
  - exploratory surfaces are identified for labeling or deprioritization

## Epic 2: Harden Identity And CRM

### Goal

Make the entry side of the wedge reliable and testable.

### Issues

#### Issue: Validate auth and workspace scoping across protected routes

- Type: `issue`
- Labels: `backend`, `identity`, `mvp`
- Sprint: `Sprint 2`
- Description:
  Verify that protected endpoints correctly enforce authentication and workspace scoping.
- Acceptance Criteria:
  - protected route behavior is verified
  - auth failures behave consistently
  - workspace boundary issues are documented or fixed

#### Issue: Add API contract tests for identity flows

- Type: `issue`
- Labels: `testing`, `backend`, `identity`
- Sprint: `Sprint 2`
- Description:
  Add automated tests for login, registration, token behavior, and current-user flows.
- Acceptance Criteria:
  - identity API flows have automated coverage
  - failure cases are included

#### Issue: Add API contract tests for CRM lead and opportunity flows

- Type: `issue`
- Labels: `testing`, `backend`, `crm`, `wedge`
- Sprint: `Sprint 2`
- Description:
  Cover lead creation, listing, updates, conversion, and opportunity stage progression.
- Acceptance Criteria:
  - core CRM flows are covered
  - response contracts are asserted

#### Issue: Validate CRM events against event registry v1

- Type: `issue`
- Labels: `events`, `crm`, `wedge`
- Sprint: `Sprint 2`
- Description:
  Confirm that CRM publishes the expected business events with the expected shape.
- Acceptance Criteria:
  - CRM event set is reviewed
  - mismatches are logged
  - required fixes are identified

#### Issue: Document CRM to Sales handoff

- Type: `issue`
- Labels: `architecture`, `crm`, `sales`
- Sprint: `Sprint 2`
- Description:
  Make explicit where CRM ownership ends and Sales ownership begins.
- Acceptance Criteria:
  - handoff rule is documented
  - dependencies between modules are clear

## Epic 3: Harden Inventory And Order Constraints

### Goal

Make stock-aware execution reliable before full sale completion.

### Issues

#### Issue: Define order ownership between Sales and Inventory

- Type: `issue`
- Labels: `architecture`, `sales`, `inventory`, `wedge`
- Sprint: `Sprint 3`
- Description:
  Resolve which module owns order state, reservation state, and fulfillment transitions.
- Acceptance Criteria:
  - ownership is documented
  - dependent APIs are identified

#### Issue: Formalize reservation and release semantics

- Type: `issue`
- Labels: `inventory`, `architecture`, `wedge`
- Sprint: `Sprint 3`
- Description:
  Define inventory reservation rules, release behavior, and failure handling expectations.
- Acceptance Criteria:
  - reservation semantics are documented
  - competing edge cases are captured

#### Issue: Add automated tests for inventory reservation and stock movement rules

- Type: `issue`
- Labels: `testing`, `inventory`, `backend`
- Sprint: `Sprint 3`
- Description:
  Add service-level and API-level coverage for stock operations that affect the wedge.
- Acceptance Criteria:
  - reservation rules are covered
  - movement effects are covered

#### Issue: Align frontend inventory surfaces to actual API behavior

- Type: `issue`
- Labels: `frontend`, `inventory`
- Sprint: `Sprint 3`
- Description:
  Review `InventoryOrders` and related surfaces against current backend behavior.
- Acceptance Criteria:
  - unsupported UI paths are removed, hidden, or marked
  - valid paths map cleanly to API behavior

## Epic 4: Complete The Wedge Through Sales And Workflows

### Goal

Reach an end-to-end wedge path with at least one real workflow and one smoke test.

### Issues

#### Issue: Define and harden the sale completion path

- Type: `issue`
- Labels: `sales`, `backend`, `wedge`
- Sprint: `Sprint 4`
- Description:
  Make the sale completion path explicit and supported through API and service behavior.
- Acceptance Criteria:
  - sale completion rules are documented
  - the required endpoints and service behavior are present

#### Issue: Add tests for sale creation and completion rules

- Type: `issue`
- Labels: `testing`, `sales`, `wedge`
- Sprint: `Sprint 4`
- Description:
  Add automated coverage for the sale execution step of the wedge.
- Acceptance Criteria:
  - sale creation is tested
  - sale completion or confirmation logic is tested

#### Issue: Implement one wedge-critical workflow

- Type: `issue`
- Labels: `workflows`, `events`, `wedge`
- Sprint: `Sprint 4`
- Description:
  Implement one workflow triggered by a domain event that materially supports the wedge.
- Acceptance Criteria:
  - one workflow consumes a wedge event
  - workflow result is observable

#### Issue: Add structured logging and correlation IDs to wedge flow

- Type: `issue`
- Labels: `architecture`, `backend`, `events`
- Sprint: `Sprint 4`
- Description:
  Introduce basic tracing for the wedge across API requests, domain actions, and workflow execution.
- Acceptance Criteria:
  - wedge-critical flows include correlation context
  - logs are usable for debugging end-to-end execution

#### Issue: Add one end-to-end smoke test for the wedge

- Type: `issue`
- Labels: `testing`, `wedge`, `mvp`
- Sprint: `Sprint 4`
- Description:
  Cover the happy path from lead creation through sale completion.
- Acceptance Criteria:
  - one wedge smoke path exists
  - test runs reliably in the chosen environment

## Epic 5: Reduce Operational Risk

### Goal

Harden event processing, UI truthfulness, and module maturity tracking.

### Issues

#### Issue: Define workflow consumer failure-handling policy

- Type: `issue`
- Labels: `workflows`, `events`, `architecture`
- Sprint: `Sprint 5`
- Description:
  Define retry, poison-message, and operational failure handling rules for workflow consumers.
- Acceptance Criteria:
  - failure policy is documented
  - implementation gaps are listed

#### Issue: Define idempotency expectations for wedge-critical consumers

- Type: `issue`
- Labels: `events`, `architecture`, `wedge`
- Sprint: `Sprint 5`
- Description:
  Specify which consumers must be idempotent and how that should be enforced.
- Acceptance Criteria:
  - idempotency expectations are documented
  - high-risk consumers are identified

#### Issue: Reduce mismatch between primary navigation and capability maturity

- Type: `issue`
- Labels: `frontend`, `mvp`
- Sprint: `Sprint 5`
- Description:
  Remove, hide, or clearly stage exploratory surfaces in primary navigation.
- Acceptance Criteria:
  - primary navigation reflects real capability maturity
  - exploratory areas are no longer presented as core

#### Issue: Publish capability maturity scorecard

- Type: `issue`
- Labels: `architecture`, `mvp`
- Sprint: `Sprint 5`
- Description:
  Score each wedge-critical capability for ownership, API maturity, event maturity, testing, and observability.
- Acceptance Criteria:
  - scorecard exists
  - each wedge-critical module is scored

#### Issue: Update implementation alignment after sprint findings

- Type: `issue`
- Labels: `architecture`
- Sprint: `Sprint 5`
- Description:
  Refresh the alignment document with what was learned during wedge hardening.
- Acceptance Criteria:
  - new gaps are recorded
  - resolved gaps are updated

## Epic 6: Prepare The Next Quarter From Evidence

### Goal

Set the next quarter from delivered wedge reality instead of renewed ambition.

### Issues

#### Issue: Review Tier 2 capability promotion candidates

- Type: `issue`
- Labels: `architecture`, `mvp`
- Sprint: `Sprint 6`
- Description:
  Reassess `portal`, `notifications`, `accounting`, and `discovery` against wedge outcomes.
- Acceptance Criteria:
  - promotion decisions are recorded
  - unsupported promotion requests are deferred

#### Issue: Enforce ADR review for architecture-affecting changes

- Type: `issue`
- Labels: `architecture`
- Sprint: `Sprint 6`
- Description:
  Make ADR review part of normal technical planning for changes that affect boundaries, stack, or topology.
- Acceptance Criteria:
  - ADR expectation is part of team workflow
  - open architecture decisions are visible

#### Issue: Build next-quarter backlog from validated wedge needs

- Type: `issue`
- Labels: `mvp`, `wedge`, `architecture`
- Sprint: `Sprint 6`
- Description:
  Generate the next-quarter backlog based only on delivered value, real gaps, and justified promotions.
- Acceptance Criteria:
  - next-quarter backlog is published
  - backlog is traceable to wedge evidence

## Suggested GitHub Project Fields

- `Title`
- `Type`
- `Epic`
- `Sprint`
- `Owner`
- `Status`
- `Priority`
- `Capability`
- `Architecture Impact`
- `Wedge Relevance`

