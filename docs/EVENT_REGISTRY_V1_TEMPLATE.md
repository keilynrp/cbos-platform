# Event Registry V1 Template

## Purpose

Use this template to define the first active registry for wedge-critical events.

## Required Fields

| Event Type | Version | Producer Module | Entity Type | Trigger | Consumers | Notes |
|---|---|---|---|---|---|---|
| example.event_name | v1 | crm | lead | Lead created | workflows | Replace with real value |

## Rules

- event names must reflect business meaning
- each event must declare a producer
- consumers should be listed even if only planned
- version must be explicit
- wedge-critical events should be added first

## Suggested Initial Candidate Events

- `identity.user_registered`
- `crm.lead_captured`
- `crm.lead_converted_to_opportunity`
- `crm.opportunity_created`
- `crm.opportunity_stage_changed`
- `inventory.stock_reserved`
- `inventory.stock_released`
- `sales.sale_created`
- `sales.sale_completed`
- `workflows.execution_started`
- `workflows.execution_completed`
- `workflows.execution_failed`

