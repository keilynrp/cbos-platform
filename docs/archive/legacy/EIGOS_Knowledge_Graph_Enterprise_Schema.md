> **\xe2\x9a\xa0\xef\xb8\x8f ARCHIVED** \xe2\x80\x94 This document is historical reference only. It has been superseded by the governing architecture (ADRs 0001\xe2\x80\x930010) and current capability specs in `docs/capabilities/`. Do not use for implementation decisions.

---

# Enterprise Intelligence Graph OS

## Knowledge Graph Enterprise Schema

Version: 1.0\
Purpose: Define the enterprise knowledge graph schema that connects UKIP
and CBOS.

------------------------------------------------------------------------

# 1. Graph Role

The knowledge graph provides structured context across operational,
semantic and intelligence layers.

It is not intended to replace transactional systems.\
It is intended to connect them through semantic relationships.

------------------------------------------------------------------------

# 2. Core Graph Domains

The enterprise graph includes these domains:

-   Identity
-   Commercial Relationships
-   Commerce & Fulfillment
-   Operations
-   Physical Systems
-   Knowledge Assets
-   Intelligence Objects
-   Platform Objects

------------------------------------------------------------------------

# 3. Core Node Types

## Identity Nodes

-   Person
-   Organization
-   User
-   Workspace

## Commercial Nodes

-   Lead
-   Opportunity
-   Quote
-   SalesOrder
-   CustomerAccount
-   RevPathStage

## Commerce Nodes

-   Product
-   ProductVariant
-   Bundle
-   InventoryItem
-   Payment
-   Shipment

## Operations Nodes

-   Project
-   Task
-   Warehouse
-   Location
-   Appointment
-   Event

## Physical Nodes

-   Device
-   DeviceGroup
-   TelemetryEvent
-   Alert

## Knowledge Nodes

-   Document
-   KnowledgeEntity
-   KnowledgeRelation
-   Topic
-   Dataset

## Intelligence Nodes

-   Agent
-   PromptTemplate
-   MCPTool
-   SimulationScenario
-   SimulationRun
-   RiskDistribution
-   SensitivityReport

## Platform Nodes

-   Capability
-   ModuleDefinition
-   ModuleInstance
-   DiscoverySession
-   PainPoint
-   SolutionRecommendation
-   TenantBlueprint
-   WorkflowDefinition
-   WorkflowRun
-   EventType
-   PortalPage
-   DynamicBinding

------------------------------------------------------------------------

# 4. Core Relationship Types

## Identity Relations

-   belongs_to
-   has_contact
-   linked_to
-   is_user_of

## Revenue Relations

-   converts_to
-   managed_by
-   created_from
-   accepted_as
-   mapped_to
-   recorded_as

## Commerce Relations

-   has_variant
-   includes
-   stored_in
-   reserves
-   fulfills
-   delivered_to

## Operations Relations

-   contains
-   part_of
-   scheduled_in
-   hosted_in
-   assigned_to

## Physical Relations

-   located_in
-   emits
-   triggers
-   monitored_by
-   grouped_in

## Knowledge Relations

-   same_as
-   related_to
-   references
-   cites
-   indexed_in
-   linked_to_topic

## Intelligence Relations

-   uses
-   calls
-   analyzes
-   recommends
-   consumes
-   generated
-   belongs_to_run

## Platform Relations

-   exposes
-   depends_on
-   suggests
-   activates
-   responds_to
-   renders
-   binds_to

------------------------------------------------------------------------

# 5. Identity Mapping Strategy

Each knowledge graph node may reference: - source_system -
source_entity_type - source_entity_id

This allows the graph to connect back to operational records while
preserving semantic flexibility.

Example: Organization node - source_system: CBOS-CRM -
source_entity_type: CustomerAccount - source_entity_id: acct_204

------------------------------------------------------------------------

# 6. Example Semantic Patterns

## Customer 360

Person → belongs_to → Organization → linked_to → CustomerAccount →
purchased → Product → signed → Contract

## Sales Context

Lead → converts_to → Opportunity → results_in → Quote → accepted_as →
SalesOrder → recorded_as → RevenueEvent

## Supply Context

Product → stored_in → Warehouse → monitored_by → Device → affected_by →
Alert

## Onboarding Context

DiscoverySession → detects → PainPoint → matched_to → Capability →
suggests → ModuleDefinition → activates → TenantBlueprint

## AI Context

Agent → uses → PromptTemplate → calls → MCPTool → analyzes → Document →
recommends → Capability

------------------------------------------------------------------------

# 7. Recommended Graph Modeling Rules

1.  Model business identity explicitly.
2.  Keep relationship types stable and readable.
3.  Store provenance for semantic assertions.
4.  Use the graph for context, recommendation and search.
5.  Avoid writing every low-level transaction as a first-class graph
    edge.
6.  Prefer derived semantic links over operational duplication.

------------------------------------------------------------------------

# 8. Graph Use Cases

-   semantic search across customers, products and documents
-   entity resolution across systems
-   context retrieval for AI agents
-   recommendation enrichment
-   onboarding intelligence
-   cross-domain analytics
-   simulation context generation

------------------------------------------------------------------------

# 9. Strategic Outcome

The enterprise knowledge graph becomes the **context engine** of the
platform.

It allows UKIP to enrich CBOS with: - semantic memory - contextual
reasoning - cross-domain discovery - explainable intelligence
