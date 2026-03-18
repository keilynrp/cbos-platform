# Sprint 1 API And Events Audit

## Purpose

This document records a focused audit of wedge-critical modules against:

- `docs/API_CONVENTIONS.md`
- `docs/EVENT_REGISTRY_V1.md`

The goal is to make Sprint 1 execution evidence-based and reduce ambiguity before deeper implementation work.

## Modules Audited

- Identity
- CRM
- Sales
- Inventory
- Workflows

## Executive Summary

The current codebase is more aligned with the governing architecture than it first appears.

Strong areas:

- Bearer auth and workspace scoping are consistent across wedge-critical routes
- response models are explicit
- business transitions are modeled as domain endpoints instead of generic CRUD only
- CRM, Sales, and Inventory already publish real domain events through a shared event bus

Main gaps:

- `inventory` pagination does not match the proposed cross-module API standard
- `sales` currently triggers inventory reservation through direct module invocation in the router, which bypasses cleaner event-driven coordination
- `workflows` consumes the event stream, but retry and failure-handling behavior is still minimal and not yet governed as a contract
- the event envelope in code is stable, but differs from the future-normalized contract described in foundational docs

## Identity

### Alignment

- aligned with Bearer-token auth convention
- aligned with workspace-scoped protected access
- aligned with explicit response models
- aligned with HTTP status usage for `201`, `401`, `403`, and `409`

### Notes

- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, and `GET /auth/me` fit the current API conventions
- protected access is consistently enforced via `get_current_user`
- workspace identity is derived through `get_current_workspace_id`

### Gaps

- no identity events are visible in the shared event catalog yet
- frontend token storage remains a future hardening concern, but this is outside the backend API contract itself

## CRM

### Alignment

- aligned with pagination convention: `limit=50`, `offset=0`, max `200`
- aligned with business transition endpoint style
- aligned with explicit `404`, `409`, and `422` usage
- aligned with event publication through shared envelope

### Notes

- CRM is currently the strongest example of the target model
- lead and opportunity flows map cleanly to domain actions
- CRM publishes wedge-relevant events such as:
  - `LeadCaptured`
  - `LeadConvertedToOpportunity`
  - `OpportunityCreated`
  - `OpportunityUpdated`
  - `OpportunityStageChanged`
  - `OpportunityWon`
  - `OpportunityLost`

### Gaps

- the customer handoff boundary between CRM and Sales still needs explicit documentation
- event publishers should be cross-checked against the registry during Sprint 1 to confirm full parity

## Sales

### Alignment

- aligned with pagination convention: `limit=50`, `offset=0`, max `200`
- aligned with explicit business transition endpoints
- aligned with response model usage
- aligned with event publication for sales and quote lifecycle events

### Notes

- Sales uses clear commercial transition endpoints such as send, accept, reject, and confirm
- event constants in the shared catalog include:
  - `QuoteCreated`
  - `QuoteSent`
  - `QuoteAccepted`
  - `QuoteRejected`
  - `SalesOrderCreated`
  - `SalesOrderConfirmed`

### Gaps

- quote acceptance currently triggers inventory auto-reservation via direct service invocation from the router
- this creates tighter coupling between `sales` and `inventory` than the event-driven architecture intends
- the order-versus-sale ownership boundary still needs explicit documentation

## Inventory

### Alignment

- aligned with explicit domain action endpoints such as reserve and release
- aligned with explicit response models
- aligned with event publication through shared envelope
- aligned with strong business-state validation through `409` and `422`

### Notes

- inventory publishes at least these shared events:
  - `InventoryReserved`
  - `InventoryReleased`
  - `StockMovementRecorded`
  - `InventoryLowThresholdDetected`

### Gaps

- pagination differs from the cross-module standard:
  - default `100`
  - max `500`
- this is workable, but currently inconsistent with CRM, Sales, and Workflows
- reservation semantics are implemented, but should be elevated into an explicit contract document

## Workflows

### Alignment

- aligned with protected route conventions
- aligned with explicit response models
- aligned with `204` delete semantics
- aligned with the current shared event envelope through `Event.model_validate_json`

### Notes

- workflows clearly acts as the event-consumption and orchestration layer
- route structure is consistent with the rest of the API

### Gaps

- `list_runs` exposes `limit` but not `offset`, unlike the prevailing list pattern
- the consumer logs failures but does not yet implement stronger retry, dead-letter, or poison-message handling
- workflow operational events are not yet clearly standardized in the shared event registry
- `MAX_RETRIES` is declared in the consumer but not clearly reflected in the observed control flow

## Cross-Cutting Findings

### Good

- the modular monolith pattern is real in code, not only in docs
- the current API style is coherent enough to standardize from
- the event backbone is present and already meaningful for CRM, Sales, and Inventory

### Needs Action

- unify pagination policy, especially in `inventory`
- reduce direct cross-module calls where domain events or explicit contracts are the better boundary
- formalize workflow failure handling
- keep current event envelope stable while documenting the path toward future normalization

## Recommended Sprint 1 Follow-Up

1. Accept the current API and event shape as the operational baseline.
2. Log the three main gaps in `IMPLEMENTATION_ALIGNMENT.md`.
3. Treat `sales` to `inventory` auto-reserve coupling as an explicit architectural decision to revisit in Sprint 2 or 3.
4. Treat workflow retry and failure handling as a priority hardening item before expanding automations.

