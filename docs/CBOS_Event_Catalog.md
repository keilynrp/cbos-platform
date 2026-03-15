# ERP Event Catalog

## Purpose

This document defines the core events emitted across the CBOS platform.

Events are first-class citizens in the architecture and allow modules to
communicate asynchronously.

## Event Naming Convention

DomainAction

Examples: LeadCreated OrderCompleted InventoryUpdated

## Core Event Domains

### CRM Events

LeadCreated LeadQualified ContactUpdated OpportunityCreated
OpportunityClosed

### Commerce Events

ProductCreated InventoryUpdated OrderCreated OrderPaid OrderCancelled

### Payment Events

PaymentInitiated PaymentCompleted RefundIssued

### Contract Events

ContractCreated ContractApproved ContractSigned ContractMilestoneReached
ContractExpired

### Operations Events

TaskCreated TaskCompleted ProjectCreated

### Warehouse Events

ShipmentReceived InventoryLow StockTransferred

### IoT Events

DeviceRegistered TelemetryReceived DeviceAlert DeviceOffline

### System Events

UserCreated RoleAssigned WorkflowTriggered AIInvocationCompleted

## Event Metadata

Every event should contain:

-   event_id
-   event_type
-   timestamp
-   source_module
-   payload
-   correlation_id

Example:

{ "event_type": "OrderCreated", "timestamp": "2026-03-09T10:20:00Z",
"source_module": "commerce", "payload": { "order_id": "ORD-1001",
"customer_id": "CUS-23" } }
