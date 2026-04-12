> **\xe2\x9a\xa0\xef\xb8\x8f ARCHIVED** \xe2\x80\x94 This document is historical reference only. It has been superseded by the governing architecture (ADRs 0001\xe2\x80\x930010) and current capability specs in `docs/capabilities/`. Do not use for implementation decisions.

---

# Enterprise Intelligence Graph OS

## Master Event Catalog

Version: 1.0

Purpose: Define the canonical events that connect modules, capabilities,
workflows, and intelligence layers across the Composable Business OS
(CBOS) and the Universal Knowledge Intelligence Platform (UKIP).

------------------------------------------------------------------------

# 1. Event Philosophy

The platform follows an **event-driven architecture**.

Events represent significant state changes in the system and allow:

-   loose coupling between modules
-   asynchronous workflows
-   real-time analytics
-   intelligence layer ingestion
-   knowledge graph updates

Events are immutable records describing something that already happened.

------------------------------------------------------------------------

# 2. Event Structure

Each event follows a standard structure:

event_id\
event_type\
event_version\
timestamp\
source_module\
workspace_id\
actor_id\
entity_id\
payload

Example:

{ "event_type": "LeadCaptured", "timestamp": "2026-01-10T12:45:33Z",
"source_module": "PortalBuilder", "workspace_id": "ws_102", "entity_id":
"lead_9821", "payload": { "source": "website_form", "campaign":
"product_launch" } }

------------------------------------------------------------------------

# 3. Acquisition & Discovery Events

LeadCaptured\
LeadQualified\
LeadDisqualified\
DiscoverySessionStarted\
DiscoverySessionCompleted\
PainPointDetected\
CapabilityMatched\
SolutionRecommendationGenerated\
TenantBlueprintGenerated\
WorkspaceProvisioned

------------------------------------------------------------------------

# 4. CRM & Revenue Events

OpportunityCreated\
OpportunityUpdated\
OpportunityStageChanged\
OpportunityWon\
OpportunityLost\
LeadConvertedToOpportunity\
AccountCreated\
AccountUpdated

------------------------------------------------------------------------

# 5. Sales & Commerce Events

QuoteCreated\
QuoteUpdated\
QuoteSent\
QuoteAccepted\
QuoteRejected\
SalesOrderCreated\
SalesOrderConfirmed\
SalesOrderCancelled

------------------------------------------------------------------------

# 6. Inventory & Fulfillment Events

InventoryReserved\
InventoryReleased\
StockMovementRecorded\
InventoryLowThresholdDetected\
InventoryReplenishmentRequested

FulfillmentStarted\
FulfillmentCompleted\
ShipmentCreated\
ShipmentDispatched\
ShipmentDelivered

------------------------------------------------------------------------

# 7. Payment & Revenue Events

PaymentInitiated\
PaymentCompleted\
PaymentFailed\
RefundIssued\
RevenueRecorded

------------------------------------------------------------------------

# 8. Customer Experience Events

PortalSessionStarted\
PortalSessionEnded\
CustomerLoggedIn\
CustomerActionPerformed

AppointmentScheduled\
AppointmentRescheduled\
AppointmentCancelled

EventRegistered\
EventAttended

------------------------------------------------------------------------

# 9. Workflow & Automation Events

WorkflowTriggered\
WorkflowStarted\
WorkflowStepCompleted\
WorkflowFailed\
WorkflowCompleted

------------------------------------------------------------------------

# 10. Knowledge & Intelligence Events

EntityResolved\
KnowledgeEntityCreated\
KnowledgeRelationCreated\
DocumentIndexed\
SemanticQueryExecuted

AIModelInvoked\
PredictionGenerated\
RecommendationGenerated\
AnomalyDetected

------------------------------------------------------------------------

# 11. Simulation Events

SimulationScenarioCreated\
SimulationRunStarted\
SimulationRunCompleted\
RiskDistributionGenerated\
SensitivityAnalysisGenerated

------------------------------------------------------------------------

# 12. IoT & Telemetry Events

DeviceRegistered\
DeviceConnected\
DeviceDisconnected

TelemetrySignalReceived\
TelemetryAnomalyDetected

AlertTriggered\
AlertAcknowledged\
AlertResolved

------------------------------------------------------------------------

# 13. Platform Infrastructure Events

UserAuthenticated\
UserPermissionChanged\
FeatureFlagUpdated\
ModuleActivated\
ModuleDeactivated

SystemHealthWarning\
SystemHealthCritical

------------------------------------------------------------------------

# 14. Event Domains

acquisition\
crm\
sales\
commerce\
inventory\
fulfillment\
payments\
customer_experience\
workflow\
knowledge\
simulation\
iot\
platform

------------------------------------------------------------------------

# 15. Event Flow Example

LeadCaptured → LeadQualified → OpportunityCreated → QuoteCreated →
QuoteAccepted → SalesOrderCreated → InventoryReserved →
FulfillmentCompleted → PaymentCompleted → RevenueRecorded

------------------------------------------------------------------------

# 16. Event Bus Architecture

All events are published to the **Event Bus**.

Example technologies:

Kafka\
NATS\
Redpanda\
Pulsar

------------------------------------------------------------------------

# 17. Event Governance

Rules:

1.  Events must be immutable.
2.  Events must include schema versioning.
3.  Events should describe facts, not commands.
4.  Payloads must be minimal but meaningful.
5.  Domain ownership must be clear.

------------------------------------------------------------------------

# 18. Strategic Value

A well-designed event catalog allows the platform to support:

-   composable workflows
-   AI data ingestion
-   analytics pipelines
-   knowledge graph updates
-   simulation inputs

This makes the **event layer the nervous system of the platform**.
