# Capability Spec: Workflows

## Purpose

Coordinate event-driven automations and cross-capability reactions without creating tight coupling between modules.

## Role In MVP

Workflows is a foundational infrastructure capability required to make the event-driven architecture real.

## Owns

- workflow trigger matching
- event consumption from the Redis stream
- orchestration of reactions to business events

## Core Entities

- Workflow definition
- Trigger
- Execution record
- Event-consumption state

## Exposed API Surface

The module owns workflow-facing APIs plus a background consumer that reads from the event backbone.

## Dependencies

- `app.events`
- Redis stream infrastructure
- domain event publishers from business modules

## Event Responsibilities

Workflows primarily consumes business events and may publish operational events such as:

- `workflows.execution_started`
- `workflows.execution_completed`
- `workflows.execution_failed`

## MVP Scope

- react to meaningful domain events
- support a small number of reliable wedge automations
- avoid becoming a generic platform before the wedge is hardened

## Current Gaps

- event envelope and consumer guarantees need explicit standardization
- retry, idempotency, and poison-message handling should be documented
- workflow observability should be improved before deeper automation adoption

