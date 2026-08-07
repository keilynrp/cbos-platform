# Capability Spec: Inventory

## Purpose

Provide product catalog, stock visibility, inventory movements, and reservation logic required to support orders and sales.

## Role In MVP

Inventory is a required wedge capability and a critical control point between order intent and executable sale.

## Owns

- categories
- products
- stock levels
- movements
- reservation and release flows

## Core Entities

- Category
- Product
- Inventory item or stock record
- Movement
- Reservation

## Exposed API Surface

The module currently appears to support:

- category CRUD at least for create and list
- product create, list, get, and update
- stock visibility
- reserve and release operations
- order reservation requests

## Dependencies

- `identity` for auth and workspace scoping
- persistence layer
- event backbone where inventory changes should become visible to workflows

## Event Responsibilities

Inventory publishes and maintains versioned contracts for:

- `InventoryReserved`
- `InventoryReleased`
- `StockMovementRecorded`
- `InventoryLowThresholdDetected`

## MVP Scope

- maintain product data
- expose stock availability
- support reservation logic from order and sale flows
- own reservation, release, movement, and stock threshold semantics; Sales reaches these operations through `sales.inventory_gateway`

## Current Gaps

- Reservation semantics should be documented more deeply as an API contract, especially partial reservation behavior and failure reporting.
- `GET /stock` resolves `low_stock_only` and pagination in the database: stock is aggregated per product in a grouped subquery, joined with a `LEFT JOIN` so products with no `inventory_items` still surface (zero available is below any positive `min_stock`), and the page is bounded with `ORDER BY`/`LIMIT`/`OFFSET`. A second query then loads only the page to fill in the per-location detail. Both queries are bounded by `limit`, so the cost no longer grows with the catalogue.
- Inventory should not own order state; Sales owns order lifecycle and calls Inventory through the ADR 0007 gateway.
