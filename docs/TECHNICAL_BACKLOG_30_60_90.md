# Technical Backlog 30 60 90

## Goal

Align implementation strictly to the governing architecture and harden the MVP wedge.

## First 30 Days

### Priority 1

- Publish the governing documentation set as the only active architecture baseline
- Review active work against `FOUNDATIONAL_ARCHITECTURE.md`
- Use the capability specs to assign module ownership
- Stop promoting exploratory frontend surfaces as core capabilities

### Priority 2

- Define the canonical wedge flow in code terms:
  - lead creation
  - opportunity progression
  - order creation
  - stock reservation
  - sale completion
- Document per-module ownership boundaries for `identity`, `crm`, `sales`, `inventory`, and `workflows`
- Create an event registry v1 with event names and versions for wedge events

### Priority 3

- Add API contract tests for `identity` and `crm`
- Add service-level tests for CRM conversion and inventory reservation rules
- Add one end-to-end smoke path covering the wedge

## Days 31 To 60

### Priority 1

- Standardize API conventions:
  - error shape
  - pagination rules
  - auth expectations
  - workspace scoping
- Standardize the event envelope across all publishing modules
- Add correlation IDs and structured logging for wedge-critical flows

### Priority 2

- Harden `sales` as the execution boundary for the final commercial step
- Clarify `sales` versus `inventory` ownership for orders, reservation, and fulfillment state
- Define minimal workflow automations that are required for wedge completion

### Priority 3

- Add contract tests for event publication and consumption
- Add frontend integration tests for CRM, inventory, and sales flows
- Mark exploratory pages in the UI or remove them from primary navigation until promoted

## Days 61 To 90

### Priority 1

- Introduce a module maturity scorecard reviewed each sprint
- Require ADRs for all architecture-affecting changes
- Require capability specs for any new module entering active development

### Priority 2

- Expand observability for workflows and notifications
- Add failure handling policy for event consumers
- Define promotion criteria from exploratory capability to core MVP capability

### Priority 3

- Reassess whether accounting, discovery, or portal need promotion based on wedge outcomes
- Keep graph, AI, marketplace, IoT, and modeling surfaces in future scope unless justified by current delivery

## Definition Of Done For This Phase

This 90-day plan succeeds when:

- the team uses the new docs as the only governing architecture source
- each wedge capability has an owner and capability spec
- wedge-critical APIs and events have automated coverage
- exploratory product surface no longer drives core architectural decisions

