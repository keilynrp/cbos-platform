# ADR 0004: Treat Events As Versioned Domain Contracts

## Status

Accepted

## Context

CBOS already publishes events from domain services. As the platform grows, those events must become stable contracts instead of ad hoc payloads.

## Decision

Business events are first-class architectural contracts.

Each business event must include:

- `event_type`
- `event_version`
- `entity_type`
- `entity_id`
- `workspace_id`
- `actor_id`
- `occurred_at`
- `payload`

New events must be registered and versioned.

## Consequences

Benefits:

- cleaner orchestration
- safer evolution
- better traceability

Tradeoffs:

- adds governance overhead
- requires discipline across modules

