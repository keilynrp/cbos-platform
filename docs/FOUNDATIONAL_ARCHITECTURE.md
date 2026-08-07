# Foundational Architecture

## Purpose

This document is the single source of truth for the foundational architecture of CBOS.

It aligns:

- the current implementation in the repository
- the MVP target to be completed next
- the future architecture that remains intentionally out of scope for now

Its job is to reduce ambiguity between product vision, technical architecture, and what the team is actively building.

## Architectural Thesis

CBOS is a composable business operating system built around business capabilities instead of isolated applications.

The foundational architecture is guided by these principles:

- Capability-first design
- Event-driven coordination
- Shared canonical data model
- AI as platform infrastructure
- Modular composition with explicit boundaries
- MVP-first execution over speculative platform expansion

## Current State

The official baseline implemented in this repository is:

- Frontend: React 18, TypeScript, Vite, Tailwind, shadcn/ui
- Backend: FastAPI, Python 3.12, SQLAlchemy async
- Database: PostgreSQL 16
- Event Backbone: Redis Streams plus Redis Pub/Sub
- Runtime shape: modular monolith
- Local runtime: Docker Compose

### Repository Boundaries

- `composable-os/`: frontend application and UI surfaces
- `backend/`: backend API, domain modules, events, and infrastructure code
- `docs/`: strategy, architecture, roadmap, and domain references
- root Docker files: local and production orchestration

### Implemented Backend Domains

- `identity`
- `crm`
- `sales`
- `inventory`
- `portal`
- `discovery`
- `workflows`
- `notifications`
- `accounting`

### Implemented Patterns

- modular backend organization by capability
- shared FastAPI application with per-domain routers
- async SQLAlchemy persistence
- event publication from domain services
- startup workflow consumption
- shared frontend API client and service modules

## MVP Target

The MVP must be anchored on one complete operating wedge:

`Lead -> Customer -> Order -> Inventory -> Sale`

This wedge is the priority rule for architecture and delivery.

### In-Scope Foundational Capabilities

- Identity and access
- CRM
- Sales
- Inventory
- Portal or external interaction surfaces required by the wedge
- Workflows and event processing
- Notifications required by the wedge

### Supporting But Not Primary

- Discovery
- Accounting

These may remain partial as long as they do not block the wedge.

### Cross-Cutting Commitments

Not capabilities of their own, but constraints every capability has to respect.

- **Internationalization.** Serving more than one language is a core product
  requirement, confirmed 2026-08-07 and recorded in ADR 0010. The architectural
  consequence is that **the backend stays language-neutral**: domain services
  raise registered error codes with structured `detail`, never prose meant for
  a user to read, and the wording lives in the frontend catalogue. That half is
  built and enforced in CI.

  What is committed but not built is the rest: string catalogues for the ~470
  user-facing strings, a locale on the user or workspace, `Accept-Language`
  negotiation, and the server-rendered artifacts — invoice PDFs and
  notification emails — that no frontend catalogue can reach.

  This belongs here rather than under Future Architecture because it is not a
  candidate to weigh later. It is decided, and it constrains how new surfaces
  are written from now on: **a new module that hardcodes user-facing prose in
  the backend is creating work that will have to be undone.**

## Future Architecture

The following are valid future directions, but not part of the current architectural commitment:

- Next.js as frontend runtime replacement
- NestJS as backend replacement
- Neo4j or graph database adoption
- pgvector-backed semantic retrieval
- Kafka or NATS replacing Redis Streams
- dedicated API gateway
- distributed service decomposition

These belong to roadmap discussions until promoted by ADR.

## Domain Rules

Each domain must declare:

- the entities it owns
- the APIs it exposes
- the events it publishes
- the events it consumes
- the modules it is allowed to depend on

### Boundary Rules

- domain logic belongs in the owning module service layer
- cross-domain coordination should prefer events or explicit APIs
- shared infrastructure belongs under `backend/app/core` or `backend/app/events`
- frontend pages should map to real backend capabilities whenever possible

## Canonical MVP Data Backbone

The MVP shared data backbone is centered around:

- Workspace
- User
- Organization
- Person or Contact
- Lead
- Opportunity
- Product
- Order
- Inventory Item
- Sale or transaction record

Only entities needed for the wedge should be stabilized first.

## Event Model

Events are part of the architecture, not an implementation detail.

Each business event should carry:

- `event_type`
- `event_version`
- `entity_type`
- `entity_id`
- `workspace_id`
- `actor_id`
- `occurred_at`
- `payload`

### Event Rules

- events must be named from business meaning
- events must be versioned
- consumers should be idempotent where possible
- new events must be registered in the event catalog

## Governance Rules

The foundational architecture changes only through explicit decisions.

Changes require:

- an ADR for any major stack or topology change
- a capability spec for any new business module
- an event contract entry for any new business event

## Decision Filter

Before adding a new component, ask:

1. Does this improve the MVP wedge directly?
2. Is this needed now, or only for a future target state?
3. Can the same outcome be achieved by strengthening existing modules first?

If the answer points to future ambition instead of present delivery, defer it.
