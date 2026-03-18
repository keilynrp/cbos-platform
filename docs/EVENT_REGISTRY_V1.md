# Event Registry V1

## Purpose

This document is the active registry for wedge-critical business events in CBOS.

It is based on the current implementation in:

- `backend/app/events/types.py`
- domain services that publish through `app.events.bus.publish`

## Current Event Envelope

The current canonical event model in code contains:

- `event_id`
- `event_type`
- `event_version`
- `timestamp`
- `source_module`
- `workspace_id`
- `actor_id`
- `entity_id`
- `payload`

## Standardization Note

The foundational architecture target describes a future-normalized contract with fields such as:

- `event_type`
- `event_version`
- `entity_type`
- `entity_id`
- `workspace_id`
- `actor_id`
- `occurred_at`
- `payload`

For now, the source of truth is the current implemented envelope.

Short-term convergence rule:

- use the current envelope as operational truth
- when extending events, prefer adding `entity_type`
- treat current `timestamp` as the active equivalent of future `occurred_at`
- do not rename envelope fields in implementation without ADR

## Naming Rule

### Current

Current code uses PascalCase event names such as:

- `LeadCaptured`
- `QuoteAccepted`
- `InventoryReserved`

### Standard

Event names must remain stable and consistent with the current implementation until a naming migration is explicitly approved.

That means Event Registry V1 adopts the current PascalCase names as authoritative.

## Event Registry

| Event Type | Version | Producer Module | Entity Type | Trigger | Likely Consumers | Notes |
|---|---|---|---|---|---|---|
| `LeadCaptured` | `1.0` | `crm` | `lead` | A new lead is created | `workflows`, `notifications`, `discovery` | Confirmed in code constants |
| `LeadConvertedToOpportunity` | `1.0` | `crm` | `lead/opportunity` | A lead is converted into an opportunity | `workflows`, `sales` | Important wedge transition |
| `OpportunityCreated` | `1.0` | `crm` | `opportunity` | Opportunity is created | `workflows`, `sales` | Confirmed in code constants |
| `OpportunityUpdated` | `1.0` | `crm` | `opportunity` | Opportunity details are updated | `workflows` | Useful for downstream sync |
| `OpportunityStageChanged` | `1.0` | `crm` | `opportunity` | Opportunity changes stage | `workflows`, `notifications`, `sales` | Wedge-critical progression signal |
| `OpportunityWon` | `1.0` | `crm` | `opportunity` | Opportunity reaches won state | `sales`, `workflows` | Candidate trigger for downstream sales behavior |
| `OpportunityLost` | `1.0` | `crm` | `opportunity` | Opportunity reaches lost state | `workflows`, `notifications` | Useful for operational follow-up |
| `QuoteCreated` | `1.0` | `sales` | `quote` | Quote is created | `workflows`, `notifications` | Confirmed in code constants |
| `QuoteSent` | `1.0` | `sales` | `quote` | Quote is sent | `workflows`, `notifications` | External customer touchpoint |
| `QuoteAccepted` | `1.0` | `sales` | `quote` | Quote is accepted | `inventory`, `workflows` | Router currently attempts inventory auto-reserve after accept |
| `QuoteRejected` | `1.0` | `sales` | `quote` | Quote is rejected | `workflows`, `notifications` | Commercial dead-end signal |
| `SalesOrderCreated` | `1.0` | `sales` | `sales_order` | Sales order is created | `inventory`, `workflows` | Wedge bridge between quote and execution |
| `SalesOrderConfirmed` | `1.0` | `sales` | `sales_order` | Sales order is confirmed | `inventory`, `workflows`, `notifications` | Important fulfillment/commitment signal |
| `InventoryReserved` | `1.0` | `inventory` | `inventory_reservation` | Stock is reserved | `sales`, `workflows`, `notifications` | Confirmed in code constants |
| `InventoryReleased` | `1.0` | `inventory` | `inventory_reservation` | Reserved stock is released | `sales`, `workflows` | Inventory correction signal |
| `StockMovementRecorded` | `1.0` | `inventory` | `stock_movement` | Stock movement is created | `workflows`, `analytics` | Good operational trace event |
| `InventoryLowThresholdDetected` | `1.0` | `inventory` | `inventory_item` | Stock falls below threshold | `notifications`, `workflows` | Good alerting event |

## Wedge-Critical Minimum Set

These are the minimum events that must remain healthy for the MVP wedge:

- `LeadCaptured`
- `LeadConvertedToOpportunity`
- `OpportunityStageChanged`
- `QuoteAccepted`
- `SalesOrderCreated`
- `InventoryReserved`
- `SalesOrderConfirmed`

## Producer Rules

- The owning domain service is responsible for publishing the event
- Published payloads should contain enough context for downstream automation without forcing direct DB reads when avoidable
- Events should be emitted after the business state change has been committed or made durable enough for safe reaction

## Consumer Rules

- Workflow consumers are the default cross-domain reaction mechanism
- Consumers should be idempotent where repeated delivery would be harmful
- Inventory and sales integrations should prefer event reaction over hidden tight coupling where practical

## Current Gaps To Fix

- Event naming uses current PascalCase constants, while the broader documentation was trending toward a more normalized naming model
- The current envelope lacks `entity_type`
- The current envelope uses `timestamp` rather than `occurred_at`
- The registry should be cross-checked against actual publisher calls in each domain service during Sprint 1
- Workflow operational events are not yet clearly standardized in the shared event constants

## Immediate Adoption Rule

Starting now:

- all new wedge-critical events must be added here first
- new events must include a version
- event changes must update this registry and `docs/IMPLEMENTATION_ALIGNMENT.md`
- envelope-breaking changes require ADR

