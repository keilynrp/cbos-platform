> **\xe2\x9a\xa0\xef\xb8\x8f ARCHIVED** \xe2\x80\x94 This document is historical reference only. It has been superseded by the governing architecture (ADRs 0001\xe2\x80\x930010) and current capability specs in `docs/capabilities/`. Do not use for implementation decisions.

---

# Enterprise Intelligence Graph OS

## Domain Model Reference

Version: 1.0\
Purpose: Define the core domains, entities and relationships of the
integrated architecture formed by the Composable Business OS (CBOS) and
the Universal Knowledge Intelligence Platform (UKIP).

------------------------------------------------------------------------

# 1. Domain Model Philosophy

The platform is modeled as an **Enterprise Intelligence Graph** where:

-   business operations produce events
-   entities are connected through semantic relationships
-   intelligence services consume structured context
-   interfaces render data dynamically
-   orchestration services connect modules through capabilities

The model is organized into six major domains:

1.  Identity & Organization
2.  Revenue & Customer
3.  Commerce & Fulfillment
4.  Operations & Physical Systems
5.  Knowledge & Intelligence
6.  Platform & Orchestration

------------------------------------------------------------------------

# 2. Identity & Organization Domain

## Person

Represents a human individual.

Attributes: - id - full_name - email - phone - role_labels - status

Relations: - belongs_to → Organization - is_user_of → Workspace - owns →
Opportunity - attends → Event - books → Appointment

## Organization

Represents a company, institution, supplier, customer account or
partner.

Attributes: - id - legal_name - brand_name - type - industry - country -
status

Relations: - has_contact → Person - owns → Project - purchases →
Product - signs → Contract - operates_in → Location

## User

Represents an authenticated user with permissions.

Attributes: - id - person_id - workspace_id - access_role -
permission_set - auth_status

Relations: - linked_to → Person - belongs_to → Workspace - can_execute →
Capability

## Workspace

Represents a tenant or operational environment.

Attributes: - id - organization_id - plan - active_modules -
feature_flags

Relations: - contains → User - contains → ModuleInstance - configured_by
→ TenantBlueprint

------------------------------------------------------------------------

# 3. Revenue & Customer Domain

## Lead

A potential customer or opportunity source.

Attributes: - id - source - status - pain_points - score - captured_at

Relations: - converts_to → Opportunity - associated_with → Person -
associated_with → Organization - created_from → DiscoverySession

## Opportunity

A qualified commercial opportunity.

Attributes: - id - stage - value_estimate - probability -
expected_close_date

Relations: - belongs_to → Organization - managed_by → Person -
results_in → Quote - mapped_to → RevPathStage

## Quote

A commercial proposal or quotation.

Attributes: - id - version - status - subtotal - discount - total -
expires_at

Relations: - created_from → Opportunity - accepted_as → SalesOrder -
contains → QuoteLine - exposed_in → PortalPage

## SalesOrder

A confirmed sales transaction.

Attributes: - id - status - channel - ordered_at - total_amount

Relations: - created_from → Quote - reserves → InventoryItem -
fulfilled_by → FulfillmentTask - linked_to → Payment - linked_to →
Contract

## CustomerAccount

Represents the commercial state of a customer inside CRM.

Attributes: - id - lifecycle_stage - health_score - last_activity_at -
account_owner

Relations: - linked_to → Organization - has_contact → Person - has_order
→ SalesOrder - has_contract → Contract

## RevPathStage

Represents a stage in the revenue journey.

Attributes: - id - name - sequence - conversion_goal

Relations: - next_stage → RevPathStage - receives → Opportunity -
receives → RevenueEvent

------------------------------------------------------------------------

# 4. Commerce & Fulfillment Domain

## Product

Represents a sellable product or service.

Attributes: - id - sku - name - type - price - status

Relations: - has_variant → ProductVariant - stored_as → InventoryItem -
belongs_to → ProductCategory - included_in → Bundle

## ProductVariant

Represents a purchasable variation of a product.

Attributes: - id - product_id - attributes - price_override - barcode

Relations: - variant_of → Product

## ProductCategory

Attributes: - id - name - parent_id

Relations: - contains → Product

## Bundle

A grouped offer of products or services.

Attributes: - id - name - pricing_model - status

Relations: - includes → Product - proposed_in → Quote

## InventoryItem

Represents stock availability of a product in a location.

Attributes: - id - product_id - location_id - quantity_on_hand -
quantity_reserved - reorder_point

Relations: - refers_to → Product - stored_in → Location - updated_by →
StockMovement

## StockMovement

Represents inventory change.

Attributes: - id - movement_type - quantity - reason - created_at

Relations: - affects → InventoryItem - performed_in → Location -
linked_to → SalesOrder

## Payment

Represents a commercial payment event.

Attributes: - id - method - amount - status - paid_at

Relations: - pays → SalesOrder - attached_to → Contract - recorded_as →
RevenueEvent

## FulfillmentTask

Represents a picking, packing, shipping or completion task.

Attributes: - id - type - status - assigned_to - due_at

Relations: - fulfills → SalesOrder - executed_in → Warehouse - updates →
Shipment

## Shipment

Represents outbound movement to customer.

Attributes: - id - shipment_status - carrier - tracking_number -
shipped_at

Relations: - linked_to → SalesOrder - originated_from → Warehouse -
delivered_to → Location

------------------------------------------------------------------------

# 5. Operations & Physical Systems Domain

## Project

Attributes: - id - name - status - owner - start_date - end_date

Relations: - contains → Task - belongs_to → Organization

## Task

Attributes: - id - title - status - priority - assigned_to - due_date

Relations: - part_of → Project - triggers → WorkflowRun

## Warehouse

Attributes: - id - name - type - status

Relations: - contains → Location - stores → InventoryItem - monitored_by
→ Device

## Location

Represents a physical or logical place.

Attributes: - id - name - type - address - geo_coordinates

Relations: - belongs_to → Warehouse - stores → InventoryItem - hosts →
Device - serves → Organization

## Device

Represents an IoT or operational device.

Attributes: - id - device_type - firmware_version -
connectivity_status - last_seen_at

Relations: - located_in → Location - emits → TelemetryEvent - grouped_in
→ DeviceGroup

## DeviceGroup

Attributes: - id - name - purpose

Relations: - contains → Device

## TelemetryEvent

Represents a physical signal or sensor reading.

Attributes: - id - signal_type - signal_value - timestamp - severity

Relations: - emitted_by → Device - triggers → Alert - consumed_by →
WorkflowRun

## Alert

Attributes: - id - type - status - severity - created_at

Relations: - triggered_by → TelemetryEvent - assigned_to → User -
escalated_to → WorkflowRun

## Appointment

Attributes: - id - appointment_type - status - scheduled_at -
duration_minutes

Relations: - booked_by → Person - linked_to → Opportunity - rendered_in
→ PortalPage

## Event

Attributes: - id - name - event_type - date - status

Relations: - attended_by → Person - hosted_in → Location - linked_to →
Campaign

------------------------------------------------------------------------

# 6. Knowledge & Intelligence Domain

## KnowledgeEntity

A generalized semantic node.

Attributes: - id - label - entity_type - canonical_name -
confidence_score

Relations: - same_as → KnowledgeEntity - related_to → KnowledgeEntity -
cited_in → Document

## Document

Attributes: - id - title - source - mime_type - created_at

Relations: - references → KnowledgeEntity - indexed_in → VectorIndex -
linked_to → Organization

## KnowledgeRelation

Represents a typed semantic relationship.

Attributes: - id - predicate - confidence - provenance

Relations: - source_entity → KnowledgeEntity - target_entity →
KnowledgeEntity

## PromptTemplate

Attributes: - id - name - version - objective - output_type

Relations: - used_by → Agent - invoked_from → ModuleInstance

## Agent

Attributes: - id - name - specialization - status

Relations: - uses → PromptTemplate - calls → MCPTool - analyzes →
Document - recommends → Capability

## MCPTool

Attributes: - id - name - provider - access_scope - status

Relations: - invoked_by → Agent - connected_to → ExternalSystem

## SimulationScenario

Attributes: - id - domain - objective - iteration_count - created_at

Relations: - consumes → VariableDefinition - executed_by → SimulationRun

## VariableDefinition

Attributes: - id - name - distribution_type - min_value - max_value -
source_metric

Relations: - used_in → SimulationScenario

## SimulationRun

Attributes: - id - status - started_at - completed_at - summary_metrics

Relations: - generated → RiskDistribution - generated →
SensitivityReport

## RiskDistribution

Attributes: - id - expected_value - percentile_10 - percentile_50 -
percentile_90

Relations: - belongs_to → SimulationRun

## SensitivityReport

Attributes: - id - top_drivers - narrative_summary

Relations: - belongs_to → SimulationRun

------------------------------------------------------------------------

# 7. Platform & Orchestration Domain

## Capability

Represents a reusable functional unit.

Attributes: - id - name - domain - maturity_level - complexity_level

Relations: - provided_by → ModuleDefinition - required_by →
SolutionRecommendation - depends_on → Capability

## ModuleDefinition

Represents a platform module blueprint.

Attributes: - id - name - domain - status - version

Relations: - exposes → Capability - emits → EventType - subscribes_to →
EventType

## ModuleInstance

Represents an enabled module in a workspace.

Attributes: - id - module_definition_id - workspace_id - enabled -
configured_at

Relations: - instance_of → ModuleDefinition - belongs_to → Workspace

## DiscoverySession

Represents an onboarding or diagnosis session.

Attributes: - id - account_id - status - summary - readiness_score

Relations: - detects → PainPoint - generates → SolutionRecommendation -
owned_by → User

## PainPoint

Attributes: - id - category - severity - confidence_score - description

Relations: - matched_to → Capability - detected_in → DiscoverySession

## SolutionRecommendation

Attributes: - id - name - rationale - expected_outcome -
complexity_level

Relations: - includes → Capability - suggests → ModuleDefinition -
provisions → TenantBlueprint

## TenantBlueprint

Represents the initial recommended configuration.

Attributes: - id - workspace_id - enabled_modules - enabled_features -
default_workflows

Relations: - activates → ModuleInstance - generated_from →
SolutionRecommendation

## EventType

A canonical event definition.

Attributes: - id - name - domain - payload_schema - version

Relations: - produced_by → ModuleDefinition - consumed_by →
ModuleDefinition

## WorkflowDefinition

Attributes: - id - name - trigger_event - status - version

Relations: - uses → Capability - responds_to → EventType

## WorkflowRun

Attributes: - id - status - started_at - completed_at

Relations: - instance_of → WorkflowDefinition - triggered_by →
EventType - affects → ModuleInstance

## PortalPage

Attributes: - id - name - route - visibility_rule - status

Relations: - renders → Capability - binds_to → DynamicBinding

## DynamicBinding

Attributes: - id - source_field - target_component - condition_rule

Relations: - belongs_to → PortalPage - maps_to → KnowledgeEntity

------------------------------------------------------------------------

# 8. Cross-Domain Relationships

The integrated architecture becomes powerful through cross-domain links
such as:

-   Lead → Opportunity → Quote → SalesOrder → Payment → RevenueEvent
-   SalesOrder → InventoryItem → StockMovement → Warehouse
-   Organization → Contract → Payment → RevenueEvent
-   Device → TelemetryEvent → Alert → WorkflowRun
-   DiscoverySession → PainPoint → Capability → ModuleDefinition
-   Agent → PromptTemplate → MCPTool → KnowledgeEntity
-   SimulationScenario → RiskDistribution → DecisionRecommendation
-   PortalPage → DynamicBinding → Capability → Entity

------------------------------------------------------------------------

# 9. Canonical Query Examples

This model enables higher-order queries such as:

-   Which organizations have high-value opportunities, delayed quotes
    and no active portal access?
-   Which products have high stockout risk in warehouses monitored by
    devices showing anomaly alerts?
-   Which onboarding sessions recommend Sales Builder and Inventory
    Builder due to quote inefficiency and inventory mismatch?
-   Which customers are linked to contracts with payment milestones at
    risk due to delayed fulfillment events?

------------------------------------------------------------------------

# 10. Modeling Principles

1.  Reuse canonical entities instead of duplicating domain concepts.
2.  Keep operational events separate from semantic relationships.
3.  Make capabilities first-class objects.
4.  Use the graph layer for context, not as a replacement for
    transactional storage.
5.  Keep the intelligence layer connected to both event streams and
    knowledge entities.
