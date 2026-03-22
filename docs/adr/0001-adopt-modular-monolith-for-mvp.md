# ADR 0001: Adopt Modular Monolith For MVP

## Status

Accepted

## Context

CBOS needs speed of iteration, shared data evolution, and low operational overhead while multiple business capabilities are still stabilizing.

## Decision

CBOS will use a modular monolith as the official backend architecture for the MVP.

The system keeps:

- one FastAPI application
- one PostgreSQL database
- one Redis instance for events and notifications
- explicit module boundaries inside the codebase

## Consequences

Benefits:

- faster iteration
- simpler deployment
- easier schema evolution
- lower operational load

Tradeoffs:

- stronger internal governance is needed to avoid coupling

