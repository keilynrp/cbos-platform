# Capability Spec: HR / Team

> Module: `backend/app/modules/hr/`
> Status: Tier 2 → Tier 1 (integration tests added 2026-04-13)
> ADR: pending (ADR 0018 planned)

---

## Purpose

The HR module manages team members (employees) and organisational structure (departments) within a workspace. It is intentionally standalone — employees are not linked to the identity `persons` table to maintain module independence. The module covers the full employee lifecycle from onboarding to termination, with a simple three-state machine and audit-safe deletion rules.

---

## Data Model

### Department

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (UUID) | Primary key |
| `workspace_id` | FK → workspaces | Workspace isolation |
| `name` | String(255) | Department name |
| `description` | Text | Optional description |

**Note:** Deleting a department sets `department_id = NULL` on all linked employees (SET NULL). Employees are never deleted by a department delete.

### Employee

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (UUID) | Primary key |
| `workspace_id` | FK → workspaces | Workspace isolation |
| `employee_number` | String(30) | Human-readable: `EMP-{year}-{seq:04d}` |
| `full_name` | String(255) | Required |
| `email` | String(255) | Optional contact |
| `phone` | String(50) | Optional contact |
| `status` | String(30) | State machine status |
| `employment_type` | String(30) | `full_time`, `part_time`, `contractor`, `intern` |
| `position` | String(255) | Job title |
| `department_id` | FK → departments | Optional, SET NULL on dept delete |
| `start_date` | Date | Hire date |
| `end_date` | Date | Contract end (optional) |
| `on_leave_since` | DateTime(tz) | Set when status → on_leave; cleared on return |
| `terminated_at` | DateTime(tz) | Set when status → terminated |
| `salary` | Float | Compensation |
| `currency` | String(10) | ISO currency code (default: USD) |
| `notes` | Text | Internal notes |

---

## Employee State Machine

```
active ──────────────────────────────────────────────────┐
  │                                                      │
  ▼                                                      ▼
on_leave ──────────────────────────────────────────► terminated (terminal)
  │
  └──────────────────────────────────────────────► active
```

| Transition | Timestamp field | Notes |
|------------|-----------------|-------|
| active → on_leave | `on_leave_since` set | |
| on_leave → active | `on_leave_since` cleared | Return from leave |
| active/on_leave → terminated | `terminated_at` set | Terminal |

**Terminal state:** `terminated` — no outgoing transitions.

### Edit restrictions on terminated employees

| Field | Editable after terminated? |
|-------|---------------------------|
| `full_name`, `email`, `phone`, `position`, `notes` | ✅ Yes |
| `employment_type`, `department_id`, `salary`, `currency` | ❌ No (silently ignored) |
| `start_date`, `end_date` | ❌ No |

**Rationale:** Terminated employees are retained for audit trail and payroll history. Notes remain editable to support exit interview documentation.

---

## API Endpoints

### Employees

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/employees` | List employees (filter: `status`, `department_id`, `employment_type`) |
| `GET` | `/api/v1/employees/{id}` | Get employee by ID |
| `POST` | `/api/v1/employees` | Create (onboard) employee |
| `PATCH` | `/api/v1/employees/{id}` | Update fields or transition status |
| `DELETE` | `/api/v1/employees/{id}` | Delete (only non-terminated, 409 if terminated) |

### Departments

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/departments` | List departments (sorted A→Z) |
| `POST` | `/api/v1/departments` | Create department |
| `PATCH` | `/api/v1/departments/{id}` | Update name/description |
| `DELETE` | `/api/v1/departments/{id}` | Delete (unlinks employees, does not delete them) |

### Filters (employees)

- `?status=active|on_leave|terminated`
- `?department_id={id}`
- `?employment_type=full_time|part_time|contractor|intern`

Filters compose: `?status=active&employment_type=contractor` returns active contractors.

---

## Domain Events

| Event | Trigger |
|-------|---------|
| `EmployeeOnboarded` | POST /employees |
| `EmployeeStatusChanged` | PATCH status → on_leave or active |
| `EmployeeTerminated` | PATCH status → terminated |
| `DepartmentCreated` | POST /departments |

---

## Numbering

Format: `EMP-{year}-{seq:04d}`

- Scoped per workspace per year
- Example: `EMP-2026-0001`

---

## Business Rules

1. **Terminated employees cannot be deleted** (409 with audit trail message). Use termination as the permanent off-boarding action.
2. **Department delete is safe** — it unlinks employees (SET NULL) rather than cascading. Employees continue to exist without a department.
3. **on_leave_since** is automatically cleared when returning from leave to active status.
4. Department validation: if `department_id` is provided on create or update, it must belong to the same workspace (404 otherwise).
5. Departments are returned sorted alphabetically by name.
6. All queries scoped to `workspace_id`.

---

## Design Decision: Standalone Employee Model

Employees are **not** linked to the identity `persons` table. Rationale:

- `persons` (CRM contacts) represents external clients and prospects
- Employees are internal team members with different fields (salary, employment_type, etc.)
- Module independence: HR can be enabled/disabled without affecting CRM data
- Avoids circular dependency between identity and HR layers

If a user account corresponds to an employee, that linkage is managed at the application level (not enforced by FK).

---

## Cross-module Links

| Module | Link | Direction |
|--------|------|-----------|
| Projects | `assignee_id` on ProjectTask | ProjectTask → User (not Employee) |
| Contracts | none | — |
| Analytics | headcount queries | Read-only aggregation |

---

## Test Coverage

| File | Tests | Coverage |
|------|-------|----------|
| `test_hr_contract.py` | 30 | Auth guards, dept CRUD, employee lifecycle, state machine, filters, workspace isolation |
| `test_hr.py` | 18 | Sequential numbering, dept→employee link, dept delete unlinks, filter combinations, timestamp semantics, terminal restrictions, alphabetical dept sort |

**Total: 48 tests**
