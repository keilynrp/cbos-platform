# GitHub Issues Ready

## Use

This document provides issue titles and issue bodies in a format that can be copied into GitHub Issues with minimal editing.

Use these issues together with:

- `docs/GITHUB_PROJECT_BACKLOG.md`
- `docs/SPRINT_BACKLOG_8_WEEKS.md`
- `docs/FOUNDATIONAL_ARCHITECTURE.md`

## Sprint 1

### Issue Title

Assign ownership for wedge-critical modules

### Issue Body

## Objective

Assign a clear owner for `identity`, `crm`, `sales`, `inventory`, and `workflows`.

## Why

The MVP wedge cannot be hardened without explicit ownership for the modules that carry it.

## Scope

- identify one owner per module
- confirm responsibility for API behavior, domain rules, and delivery planning
- record ownership gaps if any

## Acceptance Criteria

- each wedge-critical module has one clear owner
- ownership is reflected in planning
- ownership gaps are recorded in `docs/IMPLEMENTATION_ALIGNMENT.md`

### Issue Title

Define the executable wedge scenario

### Issue Body

## Objective

Write the exact business and technical flow for `Lead -> Customer -> Order -> Inventory -> Sale`.

## Why

The wedge must exist as an implementation path, not only as a product concept.

## Scope

- define each step of the wedge
- map each step to a backend module
- identify missing or ambiguous transitions

## Acceptance Criteria

- the wedge is described step by step
- each step maps to one responsible module
- blocked or missing steps are identified

### Issue Title

Publish API conventions for MVP modules

### Issue Body

## Objective

Standardize API behavior for error shape, pagination, auth expectations, and workspace scoping.

## Why

The architecture needs consistent contracts before more implementation breadth is added.

## Scope

- define standard error shape
- define pagination rules
- define auth expectations
- define workspace scoping expectations

## Acceptance Criteria

- conventions are documented
- module owners review them
- gaps against the current API are listed

### Issue Title

Create event registry v1 for wedge-critical events

### Issue Body

## Objective

Create the first active registry of business events needed by the wedge.

## Why

The event-driven architecture needs stable contracts before workflows deepen.

## Scope

- list wedge-critical events
- define version field expectations
- identify producer module for each event

## Acceptance Criteria

- event names are listed
- version field is defined
- producer module is identified for each event

### Issue Title

Audit frontend surfaces against wedge reality

### Issue Body

## Objective

Review active UI surfaces and classify them as core, supporting, or exploratory.

## Why

The UI surface is broader than the hardened MVP wedge and must reflect capability maturity truthfully.

## Scope

- review current pages
- classify each surface
- identify pages that should be hidden, marked, or deprioritized

## Acceptance Criteria

- each current page is classified
- exploratory surfaces are identified for labeling or deprioritization

## Sprint 2

### Issue Title

Validate auth and workspace scoping across protected routes

### Issue Body

## Objective

Verify that protected endpoints correctly enforce authentication and workspace scoping.

## Why

Identity is foundational to every wedge-critical flow.

## Scope

- review protected endpoints
- verify auth failure behavior
- verify workspace boundary behavior

## Acceptance Criteria

- protected route behavior is verified
- auth failures behave consistently
- workspace boundary issues are documented or fixed

### Issue Title

Add API contract tests for identity flows

### Issue Body

## Objective

Add automated tests for login, registration, token behavior, and current-user flows.

## Why

Identity needs fast regression detection before deeper wedge hardening.

## Scope

- login
- registration
- token-related behavior
- current user/session retrieval

## Acceptance Criteria

- identity API flows have automated coverage
- failure cases are included

### Issue Title

Add API contract tests for CRM lead and opportunity flows

### Issue Body

## Objective

Cover lead creation, listing, updates, conversion, and opportunity stage progression.

## Why

CRM is the entry point of the wedge and already appears relatively mature.

## Scope

- lead create/list/update
- lead conversion
- opportunity create/update/stage change

## Acceptance Criteria

- core CRM flows are covered
- response contracts are asserted

### Issue Title

Validate CRM events against event registry v1

### Issue Body

## Objective

Confirm that CRM publishes the expected business events with the expected shape.

## Why

CRM is currently the strongest visible publisher of domain events and sets the standard for the wedge.

## Scope

- review published CRM events
- compare them to the event registry
- record mismatches and required fixes

## Acceptance Criteria

- CRM event set is reviewed
- mismatches are logged
- required fixes are identified

### Issue Title

Document CRM to Sales handoff

### Issue Body

## Objective

Make explicit where CRM ownership ends and Sales ownership begins.

## Why

The wedge will stall if module ownership is blurred between opportunity progression and sale execution.

## Scope

- define the handoff moment
- define which module owns which state after handoff
- record dependencies and assumptions

## Acceptance Criteria

- handoff rule is documented
- dependencies between modules are clear

## Sprint 3

### Issue Title

Define order ownership between Sales and Inventory

### Issue Body

## Objective

Resolve which module owns order state, reservation state, and fulfillment transitions.

## Why

Order ambiguity creates coupling and blocks wedge completion.

## Scope

- define state ownership
- identify dependent APIs
- document module responsibilities

## Acceptance Criteria

- ownership is documented
- dependent APIs are identified

### Issue Title

Formalize reservation and release semantics

### Issue Body

## Objective

Define inventory reservation rules, release behavior, and failure handling expectations.

## Why

Inventory must be predictable before sales completion can be trusted.

## Scope

- reservation rules
- release behavior
- important edge cases

## Acceptance Criteria

- reservation semantics are documented
- competing edge cases are captured

### Issue Title

Add automated tests for inventory reservation and stock movement rules

### Issue Body

## Objective

Add service-level and API-level coverage for stock operations that affect the wedge.

## Why

Reservation and stock movement errors will directly break order and sale behavior.

## Scope

- reservation behavior
- release behavior
- movement effects on stock state

## Acceptance Criteria

- reservation rules are covered
- movement effects are covered

### Issue Title

Align frontend inventory surfaces to actual API behavior

### Issue Body

## Objective

Review `InventoryOrders` and related surfaces against current backend behavior.

## Why

The UI should not imply flows that the backend does not yet support reliably.

## Scope

- review current inventory UI paths
- compare against current API behavior
- identify unsupported flows for removal, hiding, or staging

## Acceptance Criteria

- unsupported UI paths are removed, hidden, or marked
- valid paths map cleanly to API behavior

## Sprint 4

### Issue Title

Define and harden the sale completion path

### Issue Body

## Objective

Make the sale completion path explicit and supported through API and service behavior.

## Why

The wedge is not complete until sale execution is operational.

## Scope

- define completion rules
- identify required endpoints and services
- close obvious implementation gaps

## Acceptance Criteria

- sale completion rules are documented
- required endpoints and service behavior are present

### Issue Title

Add tests for sale creation and completion rules

### Issue Body

## Objective

Add automated coverage for the sale execution step of the wedge.

## Why

Sales is a required wedge capability and should not remain softer than CRM.

## Scope

- sale creation
- sale completion or confirmation logic
- key failure cases

## Acceptance Criteria

- sale creation is tested
- sale completion or confirmation logic is tested

### Issue Title

Implement one wedge-critical workflow

### Issue Body

## Objective

Implement one workflow triggered by a domain event that materially supports the wedge.

## Why

The event-driven architecture must prove itself on real business value, not only infrastructure presence.

## Scope

- choose one wedge-relevant trigger
- implement consumption and execution
- make results observable

## Acceptance Criteria

- one workflow consumes a wedge event
- workflow result is observable

### Issue Title

Add structured logging and correlation IDs to wedge flow

### Issue Body

## Objective

Introduce basic tracing for the wedge across API requests, domain actions, and workflow execution.

## Why

An event-driven wedge is hard to harden without traceability.

## Scope

- define correlation ID propagation
- add structured logs to wedge-critical paths
- verify logs are usable for debugging

## Acceptance Criteria

- wedge-critical flows include correlation context
- logs are usable for debugging end-to-end execution

### Issue Title

Add one end-to-end smoke test for the wedge

### Issue Body

## Objective

Cover the happy path from lead creation through sale completion.

## Why

The team needs one repeatable signal that the wedge still works as a system.

## Scope

- create one end-to-end happy path
- choose the right environment and execution strategy
- ensure it runs reliably

## Acceptance Criteria

- one wedge smoke path exists
- test runs reliably in the chosen environment

## Sprint 5

### Issue Title

Define workflow consumer failure-handling policy

### Issue Body

## Objective

Define retry, poison-message, and operational failure handling rules for workflow consumers.

## Why

Workflow consumers will become an operational risk if failure behavior remains implicit.

## Scope

- retry expectations
- poison-message behavior
- operational failure handling

## Acceptance Criteria

- failure policy is documented
- implementation gaps are listed

### Issue Title

Define idempotency expectations for wedge-critical consumers

### Issue Body

## Objective

Specify which consumers must be idempotent and how that should be enforced.

## Why

Repeated event delivery should not create inconsistent wedge outcomes.

## Scope

- identify high-risk consumers
- define idempotency expectations
- identify enforcement approach

## Acceptance Criteria

- idempotency expectations are documented
- high-risk consumers are identified

### Issue Title

Reduce mismatch between primary navigation and capability maturity

### Issue Body

## Objective

Remove, hide, or clearly stage exploratory surfaces in primary navigation.

## Why

Product truthfulness is part of architecture discipline.

## Scope

- review primary navigation
- identify exploratory surfaces
- update visibility or labeling strategy

## Acceptance Criteria

- primary navigation reflects real capability maturity
- exploratory areas are no longer presented as core

### Issue Title

Publish capability maturity scorecard

### Issue Body

## Objective

Score each wedge-critical capability for ownership, API maturity, event maturity, testing, and observability.

## Why

The team needs an objective view of module maturity before expanding scope.

## Scope

- define scorecard criteria
- score each wedge-critical capability
- publish current results

## Acceptance Criteria

- scorecard exists
- each wedge-critical module is scored

### Issue Title

Update implementation alignment after sprint findings

### Issue Body

## Objective

Refresh the alignment document with what was learned during wedge hardening.

## Why

The architecture should evolve from evidence, not memory.

## Scope

- record new gaps
- update resolved gaps
- note any emerging risks

## Acceptance Criteria

- new gaps are recorded
- resolved gaps are updated

## Sprint 6

### Issue Title

Review Tier 2 capability promotion candidates

### Issue Body

## Objective

Reassess `portal`, `notifications`, `accounting`, and `discovery` against wedge outcomes.

## Why

The next quarter should expand only from validated needs.

## Scope

- review Tier 2 capability relevance
- evaluate promotion readiness
- record decisions and deferrals

## Acceptance Criteria

- promotion decisions are recorded
- unsupported promotion requests are deferred

### Issue Title

Enforce ADR review for architecture-affecting changes

### Issue Body

## Objective

Make ADR review part of normal technical planning for changes that affect boundaries, stack, or topology.

## Why

Architectural clarity will erode if the process is optional.

## Scope

- define when ADRs are required
- integrate ADR expectation into planning
- surface open architectural decisions

## Acceptance Criteria

- ADR expectation is part of team workflow
- open architecture decisions are visible

### Issue Title

Build next-quarter backlog from validated wedge needs

### Issue Body

## Objective

Generate the next-quarter backlog based only on delivered value, real gaps, and justified promotions.

## Why

Planning should follow evidence from the wedge, not renewed ambition.

## Scope

- review wedge outcomes
- identify validated needs
- produce next-quarter backlog

## Acceptance Criteria

- next-quarter backlog is published
- backlog is traceable to wedge evidence

