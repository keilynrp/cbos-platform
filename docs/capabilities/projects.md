# Capability Spec: Projects

> Module: `backend/app/modules/projects/`
> Status: Tier 2 → Tier 1 (integration tests added 2026-04-13)
> ADR: pending (ADR 0017 planned)

---

## Purpose

The Projects module manages the delivery lifecycle of work committed to a client. A project is typically created after a contract is signed or a sales order is placed. It contains an ordered list of tasks and supports a status machine that reflects real-world project stages.

---

## Data Model

### Project

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (UUID) | Primary key |
| `workspace_id` | FK → workspaces | Workspace isolation |
| `project_number` | String(30) | Human-readable: `PRJ-{year}-{seq:04d}` |
| `title` | String(255) | Project name |
| `description` | Text | Optional scope description |
| `status` | String(30) | State machine status |
| `budget` | Float | Planned budget |
| `currency` | String(10) | ISO currency code (default: USD) |
| `start_date` | Date | Planned start |
| `end_date` | Date | Planned end |
| `activated_at` | DateTime(tz) | When project went active |
| `completed_at` | DateTime(tz) | When project completed |
| `cancelled_at` | DateTime(tz) | When project was cancelled |
| `notes` | Text | Internal notes |
| `contract_id` | FK → contracts | Optional link |
| `sales_order_id` | FK → sales_orders | Optional link |
| `contact_id` | FK → persons | Client contact |
| `organization_id` | FK → organizations | Client org |
| `owner_id` | FK → users | Project owner |

### ProjectTask

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (UUID) | Primary key |
| `project_id` | FK → projects | Cascade delete |
| `task_order` | Integer | Sort order (ascending) |
| `title` | String(255) | Task title |
| `description` | Text | Optional details |
| `status` | String(30) | Task status |
| `due_date` | Date | Optional deadline |
| `assignee_id` | FK → users | Optional assignee |

---

## Project State Machine

```
planning ─────────────────────────────┐
  │                                   │
  ▼                                   ▼
active ──────────── on_hold      cancelled (terminal)
  │                    │
  │         ┌──────────┘
  │         ▼
  └──► active ────────────────► completed (terminal)
```

| From | To | Timestamp field |
|------|----|-----------------|
| planning → active | active | `activated_at` |
| active → completed | completed | `completed_at` |
| any non-terminal → cancelled | cancelled | `cancelled_at` |

**Terminal states:** `completed`, `cancelled`.

### Edit restrictions on terminal projects

| Field | Editable after completed/cancelled? |
|-------|-------------------------------------|
| `title`, `notes` | ✅ Yes |
| `description` | ✅ Yes |
| `budget`, `currency` | ❌ No (silently ignored) |
| `start_date`, `end_date` | ❌ No |
| Tasks (add/update/delete) | ❌ No (409) |

---

## Task State Machine

```
todo ──────────────────────────── cancelled (terminal)
  │
  ▼
in_progress ──────────────────── cancelled
  │
  ▼
done ──────────────────────────► todo  (reopenable)
```

| Transition | Notes |
|------------|-------|
| `todo → in_progress` | Work started |
| `in_progress → done` | Emits `ProjectTaskCompleted` event |
| `done → todo` | Reopen — work not actually done |
| `any → cancelled` | Task abandoned |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/projects` | List projects (filter: `status`, `organization_id`) |
| `GET` | `/api/v1/projects/{id}` | Get project with tasks |
| `POST` | `/api/v1/projects` | Create project (with optional tasks) |
| `PATCH` | `/api/v1/projects/{id}` | Update fields or transition status |
| `DELETE` | `/api/v1/projects/{id}` | Delete (only `planning` status) |
| `POST` | `/api/v1/projects/{id}/tasks` | Add task |
| `PATCH` | `/api/v1/projects/{id}/tasks/{tid}` | Update task (title, status, due_date, assignee) |
| `DELETE` | `/api/v1/projects/{id}/tasks/{tid}` | Delete task |

### Filters

- `?status=planning|active|on_hold|completed|cancelled`
- `?organization_id={id}`

---

## Domain Events

| Event | Trigger |
|-------|---------|
| `ProjectCreated` | POST /projects |
| `ProjectActivated` | PATCH status → active |
| `ProjectCompleted` | PATCH status → completed |
| `ProjectCancelled` | PATCH status → cancelled |
| `ProjectTaskCompleted` | PATCH task status → done |

---

## Numbering

Format: `PRJ-{year}-{seq:04d}`

- Scoped per workspace per year
- Example: `PRJ-2026-0001`

---

## Business Rules

1. Only `planning` projects can be deleted (409 otherwise).
2. Task management is blocked for `completed` and `cancelled` projects (409).
3. Budget and date fields are silently ignored for terminal projects.
4. `task_order` auto-assigned as `max_existing_order + 1` when not provided.
5. Tasks are returned sorted by `task_order` ascending.
6. All queries scoped to `workspace_id`.

---

## Cross-module Links

| Module | Link | Direction |
|--------|------|-----------|
| Contracts | `contract_id` | Project → Contract |
| Sales | `sales_order_id` | Project → SalesOrder |
| CRM | `contact_id`, `organization_id` | Project → Person/Organization |

---

## Test Coverage

| File | Tests | Coverage |
|------|-------|----------|
| `test_projects_contract.py` | 28 | Auth guards, lifecycle, state machine, task management, workspace isolation |
| `test_projects.py` | 16 | Sequential numbering, full lifecycle, edit restrictions, task status machine, reopen, auto-order, org filter, multi-status |

**Total: 44 tests**
