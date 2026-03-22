# Sprint Backlog 8 Weeks

## Purpose

This document translates the governing architecture into an execution plan for the next 8 weeks.

It is intended to be used alongside:

- `docs/FOUNDATIONAL_ARCHITECTURE.md`
- `docs/CAPABILITY_MATRIX_MVP.md`
- `docs/IMPLEMENTATION_ALIGNMENT.md`
- `docs/TECHNICAL_BACKLOG_30_60_90.md`
- `docs/capabilities/`

## Planning Rules

- Every sprint must strengthen the MVP wedge
- No exploratory capability should displace wedge-critical work
- Each sprint should produce both delivery progress and architectural hardening
- Gaps found during implementation must update `IMPLEMENTATION_ALIGNMENT.md`

## Sprint 1

### Goal

Lock ownership, contracts, and the real wedge path in implementation terms.

### Backlog

- Confirm module owners for `identity`, `crm`, `sales`, `inventory`, and `workflows`
- Review current APIs against the capability specs
- Define the exact wedge scenario:
  - lead created
  - lead qualified or converted
  - order initiated
  - stock reserved
  - sale completed
- Create event registry v1 for wedge-critical events
- Define API conventions for:
  - errors
  - pagination
  - auth behavior
  - workspace scoping
- Audit frontend navigation and mark exploratory surfaces not tied to the wedge

### Exit Criteria

- wedge scenario is explicit and shared
- module ownership is assigned
- event registry v1 exists
- API conventions are documented

## Sprint 2

### Goal

Harden the entry side of the wedge: identity and CRM.

### Backlog

- verify auth and workspace behavior across protected routes
- add API contract tests for identity flows
- add API contract tests for CRM lead and opportunity flows
- validate CRM event publication against the event registry
- document CRM to Sales handoff rules
- align frontend CRM surfaces with implemented backend behavior

### Exit Criteria

- identity flows are covered by automated tests
- CRM lead and opportunity APIs have contract coverage
- CRM events are aligned with the registry
- CRM handoff boundary is documented

## Sprint 3

### Goal

Harden order and inventory execution constraints.

### Backlog

- define order ownership between `sales` and `inventory`
- formalize reservation and release semantics
- add tests for inventory reservation and stock movement rules
- add or refine wedge APIs required for order-to-stock flow
- document inventory event candidates and publishing rules
- validate frontend inventory surfaces against real API behavior

### Exit Criteria

- order and inventory ownership is explicit
- reservation semantics are documented
- inventory rules have automated coverage
- wedge flow reaches a stock-aware state

## Sprint 4

### Goal

Close the wedge through sales execution and first end-to-end automation.

### Backlog

- define and harden the sale completion path
- align `sales` API and service behavior with wedge completion
- add tests for sale creation and completion rules
- implement one wedge-critical workflow triggered by domain events
- add structured logging and correlation IDs for the wedge
- create one end-to-end smoke test for:
  - lead
  - opportunity
  - order or reservation
  - sale

### Exit Criteria

- sale completion path is operational
- one workflow runs from published events
- one end-to-end smoke path passes
- wedge logging is traceable

## Sprint 5

### Goal

Stabilize operational quality and reduce architectural risk.

### Backlog

- add consumer failure-handling rules for workflows
- define idempotency expectations for wedge-critical event consumers
- review notifications and portal only for wedge support
- remove, hide, or label exploratory surfaces from primary navigation as needed
- update `IMPLEMENTATION_ALIGNMENT.md` with real sprint findings
- score each core capability for maturity

### Exit Criteria

- failure handling policy exists for workflows
- idempotency expectations are documented
- UI surface better matches capability maturity
- alignment document reflects reality

## Sprint 6

### Goal

Prepare the foundation for the next quarter without reopening architectural ambiguity.

### Backlog

- review which Tier 2 capabilities deserve promotion based on wedge outcomes
- decide whether `portal`, `notifications`, `accounting`, or `discovery` need deeper investment
- tighten ADR process around all architecture-affecting work
- publish capability maturity scorecard
- create next-quarter backlog from proven wedge needs only

### Exit Criteria

- next-quarter priorities are based on wedge evidence
- capability maturity scorecard is published
- ADR governance is active
- no future-stack changes are introduced without justification

## Optional Sprint 7 To 8 Buffer

Use only if required by delivery reality.

### Appropriate Uses

- close quality gaps discovered in Sprint 4 to 6
- deepen test coverage for wedge-critical modules
- improve workflow observability
- promote one Tier 2 capability only if it directly strengthens delivered value

### Inappropriate Uses

- starting graph or AI platform expansion
- introducing a new stack direction
- broadening the UI surface without domain maturity

## Weekly Review Questions

- What changed in the wedge this week?
- Which capability got more real, not just more visible?
- Did any exploratory work bypass the prioritization rules?
- Which architectural assumption was validated or invalidated?
- What must be updated in `IMPLEMENTATION_ALIGNMENT.md`?

