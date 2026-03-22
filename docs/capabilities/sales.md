# Capability Spec: Sales

## Purpose

Own the commercial transaction side of the wedge after opportunity maturity, including sale execution and related documents.

## Role In MVP

Sales is a required wedge capability but appears less hardened than CRM.

## Owns

- sales transaction lifecycle
- quote or sale record creation
- downstream commercial execution rules
- sales-related output artifacts such as PDFs if needed

## Core Entities

- Sale
- Sales line item
- Quote or commercial document
- Customer linkage

## Exposed API Surface

The module owns the sales API and service layer, and should become the system of record for sale execution.

## Dependencies

- `crm` for upstream opportunity context
- `inventory` for stock-aware fulfillment constraints
- `identity` for auth and workspace scoping

## Event Responsibilities

Minimum future event candidates:

- `sales.sale_created`
- `sales.sale_confirmed`
- `sales.sale_cancelled`
- `sales.invoice_requested`

## MVP Scope

- create and manage sale records
- connect sales execution to inventory and order state
- provide enough commercial closure to complete the wedge

## Current Gaps

- explicit boundary between order and sale needs stronger definition
- relationship with accounting should be deferred until wedge completion requires it
- sales event contract and end-to-end tests should be prioritized

