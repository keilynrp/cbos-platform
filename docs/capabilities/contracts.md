# Capability Spec: Contracts

> Module: `backend/app/modules/contracts/`
> Status: Tier 2 → Tier 1 (integration tests added 2026-04-13)
> ADR: pending (ADR 0016 planned)

---

## Purpose

The Contracts module manages legally-binding documents between a workspace and its clients. A contract formalises the terms of a commercial relationship established through the Sales and CRM modules.

---

## Data Model

### Contract

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (UUID) | Primary key |
| `workspace_id` | FK → workspaces | Workspace isolation |
| `contract_number` | String(30) | Human-readable: `CTR-{year}-{seq:04d}` |
| `title` | String(255) | Contract name |
| `description` | Text | Optional body text |
| `status` | String(30) | State machine status |
| `value` | Float | Contract monetary value |
| `currency` | String(10) | ISO currency code (default: USD) |
| `start_date` | Date | Contract start |
| `end_date` | Date | Contract expiry |
| `sent_at` | DateTime(tz) | Timestamp when sent |
| `signed_at` | DateTime(tz) | Timestamp when signed |
| `executed_at` | DateTime(tz) | Timestamp when executed |
| `terminated_at` | DateTime(tz) | Timestamp when terminated |
| `expired_at` | DateTime(tz) | Timestamp when expired |
| `notes` | Text | Internal notes |
| `sales_order_id` | FK → sales_orders | Optional link |
| `opportunity_id` | FK → opportunities | Optional link |
| `contact_id` | FK → persons | Client contact |
| `organization_id` | FK → organizations | Client org |
| `owner_id` | FK → users | Assigned owner |

### ContractClause

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (UUID) | Primary key |
| `contract_id` | FK → contracts | Cascade delete |
| `clause_order` | Integer | Sort order (ascending) |
| `title` | String(255) | Section heading |
| `body` | Text | Section content |

---

## State Machine

```
draft ──────────────────────────────┐
  │                                 │
  ▼                                 │
sent ────────────────────────────── ┤
  │                                 │
  ▼                                 ▼
signed ─────────────────────── terminated (terminal)
  │
  ▼
executed ──────────────────── terminated
  │
  ▼
expired (terminal)
```

| From | To | Timestamp field |
|------|----|-----------------|
| any → sent | sent | `sent_at` |
| sent → signed | signed | `signed_at` |
| signed → executed | executed | `executed_at` |
| any → terminated | terminated | `terminated_at` |
| executed → expired | expired | `expired_at` |

**Terminal states:** `expired`, `terminated` — no outgoing transitions.

### Edit restrictions on terminal/executed contracts

| Field | Editable after executed? |
|-------|--------------------------|
| `title`, `notes` | ✅ Yes |
| `description` | ✅ Yes |
| `value`, `currency` | ❌ No (silently ignored) |
| `start_date`, `end_date` | ❌ No |
| Clauses (add/update/delete) | ❌ No (409) |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/contracts` | List contracts (filter: `status`, `organization_id`) |
| `GET` | `/api/v1/contracts/{id}` | Get contract with clauses |
| `POST` | `/api/v1/contracts` | Create contract (with optional clauses) |
| `PATCH` | `/api/v1/contracts/{id}` | Update fields or transition status |
| `DELETE` | `/api/v1/contracts/{id}` | Delete (only `draft` status) |
| `POST` | `/api/v1/contracts/{id}/clauses` | Add clause |
| `PATCH` | `/api/v1/contracts/{id}/clauses/{cid}` | Update clause |
| `DELETE` | `/api/v1/contracts/{id}/clauses/{cid}` | Delete clause |

### Filters

- `?status=draft|sent|signed|executed|expired|terminated`
- `?organization_id={id}`

---

## Domain Events

| Event | Trigger |
|-------|---------|
| `ContractCreated` | POST /contracts |
| `ContractSent` | PATCH status → sent |
| `ContractSigned` | PATCH status → signed |
| `ContractExecuted` | PATCH status → executed |
| `ContractTerminated` | PATCH status → terminated |

---

## Numbering

Format: `CTR-{year}-{seq:04d}`

- `seq` is scoped per workspace per year
- Monotonically increasing; no gaps guaranteed (gaps possible on rollback)
- Example: `CTR-2026-0001`, `CTR-2026-0042`

---

## Business Rules

1. Only `draft` contracts can be deleted.
2. Clause modifications are blocked for `executed`, `expired`, and `terminated` contracts (409).
3. Value and date fields are silently ignored for `executed`, `expired`, and `terminated` contracts.
4. Clause `clause_order` auto-assigned as `max_existing_order + 1` when not provided.
5. All queries are scoped to `workspace_id` — cross-workspace access returns 404.

---

## Cross-module Links

| Module | Link | Direction |
|--------|------|-----------|
| Sales | `sales_order_id` | Contract ← SalesOrder |
| CRM | `opportunity_id` | Contract ← Opportunity |
| CRM | `contact_id`, `organization_id` | Contract ← Person/Organization |
| Projects | FK in projects.contract_id | Projects → Contract |

---

## Test Coverage

| File | Tests | Coverage |
|------|-------|----------|
| `test_contracts_contract.py` | 28 | Auth guards, lifecycle, state machine, clause management, workspace isolation |
| `test_contracts.py` | 13 | Sequential numbering, number format, full lifecycle, edit restrictions, clause ordering, org filter, multi-clause ops |

**Total: 41 tests**
