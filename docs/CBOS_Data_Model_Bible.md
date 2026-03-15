# CBOS Data Model Bible

## Purpose

Define the canonical entities used across the Composable Business
Operating System (CBOS). These entities form the shared data backbone
used by all modules.

## Core Entities

### Person

Represents an individual interacting with the system.

Attributes: - id - name - email - phone - role - organization_id

### Organization

Represents a company or group using the platform.

Attributes: - id - name - industry - created_at

### User

Represents a system user with access credentials.

Attributes: - id - person_id - role - permissions

### Product

Attributes: - id - name - sku - price - status

### Order

Attributes: - id - customer_id - status - total_amount - created_at

### InventoryItem

Attributes: - id - product_id - location_id - quantity

### Contract

Attributes: - id - parties - status - effective_date

### Event

Attributes: - id - name - date - location

### Device

Attributes: - id - device_type - location - status

### Location

Attributes: - id - name - geo_coordinates

### Asset

Attributes: - id - name - location_id - status

## Relationships

Person → Organization Order → Product Order → Customer InventoryItem →
Product Device → Location Contract → Organization
