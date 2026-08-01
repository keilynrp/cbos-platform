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
| `UserRegistered` | `1.0` | `identity` | `user` | A user account is registered | `workflows`, `analytics` | Confirmed in code constants and publisher |
| `WorkspaceCreated` | `1.0` | `identity` | `workspace` | A workspace is created during registration | `discovery`, `workflows`, `analytics` | Confirmed in code constants and publisher |
| `UserAuthenticated` | `1.0` | `identity` | `user` | A user successfully authenticates | `analytics`, `audit` | Confirmed in code constants and publisher |
| `ModuleActivated` | `1.0` | `platform` | `module` | A capability module is activated for a workspace | `workflows`, `analytics` | Reserved platform event; constant exists, publisher not yet statically detected |
| `LeadCaptured` | `1.0` | `crm` | `lead` | A new lead is created | `workflows`, `notifications`, `discovery` | Confirmed in code constants |
| `LeadConvertedToOpportunity` | `1.0` | `crm` | `lead/opportunity` | A lead is converted into an opportunity | `workflows`, `sales` | Important wedge transition |
| `OpportunityCreated` | `1.0` | `crm` | `opportunity` | Opportunity is created | `workflows`, `sales` | Confirmed in code constants |
| `OpportunityUpdated` | `1.0` | `crm` | `opportunity` | Opportunity details are updated | `workflows` | Useful for downstream sync |
| `OpportunityStageChanged` | `1.0` | `crm` | `opportunity` | Opportunity changes stage | `workflows`, `notifications`, `sales` | Wedge-critical progression signal |
| `OpportunityWon` | `1.0` | `crm` | `opportunity` | Opportunity reaches won state | `sales`, `workflows` | Candidate trigger for downstream sales behavior |
| `OpportunityLost` | `1.0` | `crm` | `opportunity` | Opportunity reaches lost state | `workflows`, `notifications` | Useful for operational follow-up |
| `DiscoverySessionStarted` | `1.0` | `discovery` | `discovery_session` | A discovery session starts | `workflows`, `analytics` | Confirmed in code constants and publisher |
| `DiscoverySessionCompleted` | `1.0` | `discovery` | `discovery_session` | A discovery session completes | `workflows`, `analytics` | Confirmed in code constants and publisher |
| `PainPointDetected` | `1.0` | `discovery` | `pain_point` | Discovery detects a business pain point | `workflows`, `analytics` | Confirmed in code constants and publisher |
| `CapabilityMatched` | `1.0` | `discovery` | `capability_match` | Discovery maps a pain point to a capability | `workflows`, `analytics` | Confirmed in code constants and publisher |
| `SolutionComposed` | `1.0` | `discovery` | `solution_blueprint` | Discovery composes recommended solution structure | `workflows`, `analytics` | Confirmed in code constants and publisher |
| `BlueprintGenerated` | `1.0` | `discovery` | `blueprint` | A workspace blueprint is generated | `workflows`, `analytics` | Confirmed in code constants and publisher |
| `WorkspaceActivated` | `1.0` | `discovery` | `workspace` | A discovery blueprint is applied to a workspace | `workflows`, `analytics`, `notifications` | Confirmed in code constants and publisher |
| `QuoteCreated` | `1.0` | `sales` | `quote` | Quote is created | `workflows`, `notifications` | Confirmed in code constants |
| `QuoteSent` | `1.0` | `sales` | `quote` | Quote is sent | `workflows`, `notifications` | External customer touchpoint |
| `QuoteAccepted` | `1.0` | `sales` / `portal` | `quote` | Quote is accepted | `inventory`, `workflows`, `notifications` | May originate from internal sales flow or public portal acceptance |
| `QuoteRejected` | `1.0` | `sales` / `portal` | `quote` | Quote is rejected | `workflows`, `notifications` | Commercial dead-end signal; portal can originate the rejection |
| `SalesOrderCreated` | `1.0` | `sales` / `portal` | `sales_order` | Sales order is created | `inventory`, `workflows`, `notifications` | Wedge bridge between quote and execution; portal acceptance creates an order directly |
| `SalesOrderConfirmed` | `1.0` | `sales` | `sales_order` | Sales order is confirmed | `inventory`, `workflows`, `notifications` | Important fulfillment/commitment signal |
| `SalesOrderInFulfillment` | `1.0` | `sales` | `sales_order` | Sales order enters fulfillment | `inventory`, `workflows`, `notifications` | Confirmed in code constants and publisher |
| `SalesOrderFulfilled` | `1.0` | `sales` | `sales_order` | Sales order is fulfilled | `accounting`, `workflows`, `notifications` | Confirmed in code constants and publisher |
| `SalesOrderCancelled` | `1.0` | `sales` | `sales_order` | Sales order is cancelled | `inventory`, `workflows`, `notifications` | Confirmed in code constants and publisher |
| `FulfillmentCompleted` | `1.0` | `sales` | `fulfillment` | Fulfillment is completed | `accounting`, `workflows`, `analytics` | Confirmed in code constants and publisher |
| `PortalSessionCreated` | `1.0` | `portal` | `portal_session` | A seller creates a customer portal session for a quote | `notifications`, `workflows` | Used for share-link visibility and portal funnel tracking |
| `PortalSessionAccessed` | `1.0` | `portal` | `portal_session` / `quote` | Customer opens the portal quote for the first time | `notifications`, `analytics`, `workflows` | Emitted only on first access |
| `CustomerActionPerformed` | `1.0` | `portal` | `portal_session` | Customer accepts or rejects through the portal | `notifications`, `analytics`, `workflows` | Payload carries the action and commercial context |
| `InventoryReserved` | `1.0` | `inventory` | `inventory_reservation` | Stock is reserved | `sales`, `workflows`, `notifications` | Confirmed in code constants |
| `InventoryReleased` | `1.0` | `inventory` | `inventory_reservation` | Reserved stock is released | `sales`, `workflows` | Inventory correction signal |
| `StockMovementRecorded` | `1.0` | `inventory` | `stock_movement` | Stock movement is created | `workflows`, `analytics` | Good operational trace event |
| `InventoryLowThresholdDetected` | `1.0` | `inventory` | `inventory_item` | Stock falls below threshold | `notifications`, `workflows` | Good alerting event |
| `InvoiceCreated` | `1.0` | `accounting` | `invoice` | Invoice is created | `workflows`, `notifications`, `analytics` | Confirmed in code constants and publisher |
| `InvoiceSent` | `1.0` | `accounting` | `invoice` | Invoice is sent | `workflows`, `notifications` | Confirmed in code constants and publisher |
| `InvoicePaid` | `1.0` | `accounting` | `invoice` | Invoice reaches paid state | `workflows`, `notifications`, `analytics` | Confirmed in code constants and publisher |
| `InvoiceOverdue` | `1.0` | `accounting` | `invoice` | Overdue scanner marks an invoice overdue | `workflows`, `notifications`, `analytics` | Confirmed in code constants and publisher |
| `PaymentRecorded` | `1.0` | `accounting` | `payment` | Payment is recorded against an invoice | `workflows`, `notifications`, `analytics` | Confirmed in code constants and publisher |
| `WorkflowTriggered` | `1.0` | `workflows` | `workflow_run` | A workflow run is triggered | `notifications`, `analytics` | Confirmed in code constants and publisher |
| `WorkflowCompleted` | `1.0` | `workflows` | `workflow_run` | A workflow run completes successfully | `notifications`, `analytics` | Confirmed in code constants and publisher |
| `WorkflowFailed` | `1.0` | `workflows` | `workflow_run` | A workflow run fails | `notifications`, `analytics` | Confirmed in code constants and publisher |
| `ContractCreated` | `1.0` | `contracts` | `contract` | Contract is created | `workflows`, `notifications`, `analytics` | Confirmed in code constants and publisher |
| `ContractSent` | `1.0` | `contracts` | `contract` | Contract is sent | `workflows`, `notifications` | Constant exists; publisher uses dynamic transition expression |
| `ContractSigned` | `1.0` | `contracts` | `contract` | Contract is signed | `workflows`, `notifications`, `analytics` | Constant exists; publisher uses dynamic transition expression |
| `ContractExecuted` | `1.0` | `contracts` | `contract` | Contract is executed | `workflows`, `notifications`, `analytics` | Constant exists; publisher uses dynamic transition expression |
| `ContractTerminated` | `1.0` | `contracts` | `contract` | Contract is terminated | `workflows`, `notifications` | Constant exists; publisher uses dynamic transition expression |
| `ProjectCreated` | `1.0` | `projects` | `project` | Project is created | `workflows`, `notifications`, `analytics` | Confirmed in code constants and publisher |
| `ProjectActivated` | `1.0` | `projects` | `project` | Project becomes active | `workflows`, `notifications`, `analytics` | Constant exists; publisher uses dynamic transition expression |
| `ProjectCompleted` | `1.0` | `projects` | `project` | Project completes | `workflows`, `notifications`, `analytics` | Constant exists; publisher uses dynamic transition expression |
| `ProjectCancelled` | `1.0` | `projects` | `project` | Project is cancelled | `workflows`, `notifications` | Constant exists; publisher uses dynamic transition expression |
| `ProjectTaskCompleted` | `1.0` | `projects` | `project_task` | A project task is completed | `workflows`, `notifications`, `analytics` | Confirmed in code constants and publisher |
| `EmployeeOnboarded` | `1.0` | `hr` | `employee` | Employee is created/onboarded | `workflows`, `analytics` | Confirmed in code constants and publisher |
| `EmployeeTerminated` | `1.0` | `hr` | `employee` | Employee is terminated | `workflows`, `analytics` | Constant exists; publisher uses dynamic transition expression |
| `EmployeeStatusChanged` | `1.0` | `hr` | `employee` | Employee status changes | `workflows`, `analytics` | Constant exists; publisher uses dynamic transition expression |
| `DepartmentCreated` | `1.0` | `hr` | `department` | Department is created | `workflows`, `analytics` | Confirmed in code constants and publisher |

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
- CI enforces parity between event constants in `backend/app/events/types.py`, rows in this registry, version `1.0`, PascalCase naming, and statically detectable `Event(event_type=...)` publishers.
- Some publisher paths choose the event type dynamically before constructing `Event(...)`; those paths are covered by constant/registry parity today, and static branch-level publisher detection should be expanded over time.

## Immediate Adoption Rule

Starting now:

- all new wedge-critical events must be added here first
- new events must include a version
- event changes must update this registry and `docs/IMPLEMENTATION_ALIGNMENT.md`
- CI runs `scripts/ci/check_event_registry.py` and fails when event constants, registry rows, or statically detectable publishers drift
- envelope-breaking changes require ADR
