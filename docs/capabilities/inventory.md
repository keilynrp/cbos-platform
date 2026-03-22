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

Minimum future event candidates:

- `inventory.product_created`
- `inventory.stock_adjusted`
- `inventory.stock_reserved`
- `inventory.stock_released`
- `inventory.stock_below_threshold`

## MVP Scope

- maintain product data
- expose stock availability
- support reservation logic from order and sale flows

## Current Gaps

- order ownership between inventory and sales needs sharper definition
- reservation semantics should be documented as a contract
- inventory event model should be formalized before workflow depth increases

