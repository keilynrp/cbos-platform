# ADR 0005: Bound Frontend Surfaces To Owned Capabilities

## Status

Accepted

## Context

The frontend already exposes more product surfaces than the currently validated backend wedge.

## Decision

A frontend surface may be promoted as a core capability only when it has:

- a named business owner
- a backend module or explicit platform owner
- an API contract or intentional no-backend scope
- at least one end-to-end scenario

Exploratory surfaces are allowed, but must be treated as staged or internal until promoted.

## Consequences

Benefits:

- reduces product surface inflation
- improves alignment between UI and domain reality
- makes roadmap commitments clearer

Tradeoffs:

- slows visible expansion in favor of deeper completion

