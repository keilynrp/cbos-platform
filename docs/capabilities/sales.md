# Capability Spec: Sales

## Purpose

Own the commercial transaction side of the wedge after opportunity maturity, including sale execution and related documents.

## Role In MVP

Sales is a Tier 1 wedge capability. It owns quote-to-order execution and the explicit boundary from commercial acceptance into inventory-backed fulfillment.

## Owns

- sales transaction lifecycle
- quote or sale record creation
- downstream commercial execution rules
- sales-related output artifacts such as PDFs if needed

## Core Entities

- Quote
- QuoteLine
- SalesOrder
- SalesOrderLine
- Customer linkage

## Exposed API Surface

The module owns the sales API and service layer for:

- quotes and quote lines
- quote send, accept, reject, and PDF generation
- sales orders and order state transitions
- the Sales→Inventory gateway at `backend/app/modules/sales/inventory_gateway.py`

## Dependencies

- `crm` for upstream opportunity context
- `inventory` for stock-aware reservation, consumption, and release through the Sales-owned gateway from ADR 0007
- `identity` for auth and workspace scoping

## Event Responsibilities

Sales publishes and maintains versioned contracts for:

- `QuoteCreated`
- `QuoteSent`
- `QuoteAccepted`
- `QuoteRejected`
- `SalesOrderCreated`
- `SalesOrderConfirmed`
- `SalesOrderInFulfillment`
- `SalesOrderFulfilled`
- `SalesOrderCancelled`
- `FulfillmentCompleted`

## MVP Scope

- create and manage sale records
- connect sales execution to inventory and order state
- provide enough commercial closure to complete the wedge
- centralize inventory calls through `reserve_for_order`, `consume_for_order`, and `release_for_order`

## Current Gaps

- Continue expanding tests around partial inventory reservation failures at the gateway boundary.
- Keep any future event-driven replacement behind a new ADR; ADR 0007 currently keeps the gateway synchronous and explicit.
