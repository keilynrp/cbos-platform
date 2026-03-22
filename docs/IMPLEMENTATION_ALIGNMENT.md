# Implementation Alignment

## Purpose

This document tracks alignment between the governing architecture documents and the code currently implemented in the repository.

The governing documents are:

- `docs/FOUNDATIONAL_ARCHITECTURE.md`
- `docs/CAPABILITY_MATRIX_MVP.md`
- `docs/adr/`

Legacy documents are historical reference only unless explicitly promoted by ADR.

## Current Alignment Summary

### Aligned

- Backend is implemented as a modular monolith
- FastAPI is the active backend stack
- React plus Vite is the active frontend stack
- PostgreSQL is the primary transactional database
- Redis is the active event and notification backbone
- Core backend modules exist for the main capability areas
- CRM already emits business events from the service layer

### Partially Aligned

- The MVP wedge is conceptually clear, but still needs hardening end to end
- Workflows exist, but event contracts and consumer guarantees need formalization
- Frontend capability breadth is larger than the hardened backend wedge
- Shared data backbone exists conceptually, but MVP entities still need explicit ownership by domain

### Misaligned Or At Risk

- Historical docs still describe multiple possible stacks and target states
- Several frontend surfaces appear ahead of validated backend capability maturity
- Event governance is not yet formalized as a strict contract system
- Testing depth appears below what the platform ambition requires

## Gap Register

| Area | Current State | Target State | Priority | Action |
|---|---|---|---|---|
| Architectural source of truth | Many overlapping docs | One governing architecture set | High | Use new docs as the default and archive legacy docs |
| MVP scope control | Broad product surface | Wedge-driven prioritization | High | Prioritize `Lead -> Customer -> Order -> Inventory -> Sale` |
| Event contracts | Events exist but need stricter governance | Versioned domain contracts | High | Standardize event envelope and registration |
| Domain boundaries | Modules exist but boundaries need stronger ownership rules | Explicit ownership and dependencies | High | Add per-capability specs |
| Frontend alignment | Many surfaces, uneven maturity | UI backed by owned capabilities | High | Mark exploratory surfaces and avoid over-promising |
| Test coverage | Limited visible automated coverage | Module and wedge-level confidence | High | Add API, service, and wedge smoke tests |
| Data model stabilization | Shared model exists in docs | MVP entity ownership in code | Medium | Reduce to wedge-first canonical entities |
| Future stack pressure | Docs mention many possible evolutions | Current stack frozen until justified | Medium | Route changes through ADRs |

## Immediate Working Rules

- The team should make architecture decisions against the new governing documents first
- Legacy documents are reference inputs, not current commitments
- No new module should be treated as core without ownership, contract, and wedge relevance
- No future-stack discussion should affect implementation without a new ADR

## Review Cadence

Update this document:

- at the end of each sprint
- whenever a major capability is promoted into core MVP scope
- whenever an ADR changes the architecture baseline

