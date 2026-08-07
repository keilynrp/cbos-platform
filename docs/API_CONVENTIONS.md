# API Conventions

## Purpose

This document defines the active API conventions for wedge-critical modules in the current CBOS foundation.

It is based on the implementation currently visible in:

- `backend/app/modules/identity`
- `backend/app/modules/crm`
- `backend/app/modules/sales`
- `backend/app/modules/inventory`
- `backend/app/modules/workflows`

When current implementation and desired convention differ, this document states both:

- `Current`: what the code does today
- `Standard`: what the team should normalize toward

## Scope

These conventions apply first to:

- Identity
- CRM
- Sales
- Inventory
- Workflows

## Base API Prefix

### Current

The backend is mounted under `/api/v1`.

### Standard

All application routes must remain versioned under `/api/v1` until a formal versioning change is approved by ADR.

## Authentication

### Current

- Public auth endpoints:
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/refresh`
- Protected routes use Bearer token auth via `Authorization: Bearer <token>`
- User resolution is enforced through `get_current_user`
- Workspace scoping is enforced through `get_current_workspace_id`

### Standard

- All protected routes must require a valid access token
- All wedge-critical routes must be workspace-scoped
- Auth behavior must be consistent across modules, not reimplemented ad hoc
- Refresh-token handling stays limited to auth endpoints

## Authorization And Workspace Boundaries

### Current

- Protected routes depend on both current user and workspace context
- `get_current_workspace_id` derives workspace directly from the authenticated user

### Standard

- Every wedge-critical record access must be filtered by `workspace_id`
- A route is not considered complete unless workspace filtering is enforced in both router and service behavior

## Response Codes

### Current

Observed current patterns:

- `200 OK` for successful reads and updates
- `201 Created` for creates
- `204 No Content` for delete in workflows
- `401 Unauthorized` for invalid or expired credentials
- `403 Forbidden` for disabled accounts
- `404 Not Found` for missing entities
- `409 Conflict` for invalid state transitions or uniqueness conflicts
- `422 Unprocessable Entity` for domain validation failures

### Standard

- `200` for successful read and update operations
- `201` for successful create operations
- `204` only for true no-body deletion responses
- `401` for authentication failures only
- `403` for authenticated-but-disallowed requests
- `404` when the entity does not exist within the caller workspace
- `409` for business-state conflicts
- `422` for semantic validation errors

### 404 Versus 403 In Workspace-Scoped Access

**Anything outside the caller's workspace is a `404`, never a `403`.** A record
that belongs to another workspace is indistinguishable from one that does not
exist. This is the same reasoning that keeps login from saying which half of the
pair was wrong: a `403` would confirm the id is real, turning any endpoint into
an oracle for probing ids across tenants.

In practice this needs no separate check. Every workspace-scoped query filters
by `workspace_id`, so the row is simply not found and the module raises its own
`*_NOT_FOUND` code. A route that fetches by id first and compares the workspace
afterwards is the shape to avoid — it is the only way to end up with a `403`
here by accident.

`403` stays for authorization decisions that do not depend on tenancy:
`AUTH_ADMIN_REQUIRED` for a role the caller lacks,
`IDENTITY_ACCOUNT_DISABLED` for a deactivated account, and the public-intake
rejections in CRM (`CRM_PUBLIC_SITE_INACTIVE`,
`CRM_PUBLIC_SITE_ORIGIN_NOT_ALLOWED`), which are about the site, not a
workspace boundary.

## Error Shape

### Current

There is one shape. Every module and `core/deps.py` raise `CBOSException`
(`app/core/exceptions.py`), which the handler in `app/main.py` renders as:

```json
{
  "error": {
    "code": "PROJECT_DELETE_NOT_PLANNING",
    "message": "Cannot delete a project in 'active' status.",
    "detail": { "status": "active" }
  }
}
```

No `HTTPException` with a free-text `detail` remains in `backend/app/modules/`
or in the auth dependencies. `docs/ERROR_CODE_REGISTRY_V1.md` holds the 74
registered codes.

### Standard

New and touched code raises `CBOSException`. Adopted by
[ADR 0010](adr/0010-internationalization-strategy.md):

- **`code` is a stable machine identifier** and must be registered in
  `docs/ERROR_CODE_REGISTRY_V1.md`. CI enforces the parity
  (`scripts/ci/check_error_registry.py`). Renaming a code is a breaking change:
  add a new one and retire the old.
- **`code` is specific, not generic.** `CONFLICT` cannot be turned into a useful
  sentence; `PROJECT_DELETE_NOT_PLANNING` can. The generic subclasses in
  `core/exceptions.py` are for cases with nothing more precise to say and are
  not translated.
- **`message` is English and developer-facing.** It is what lands in logs, and
  the client's fallback — not the string the user is meant to read.
- **Interpolated values go in `detail`, never baked into `message`.** The client
  needs the parts to build its own sentence.
- **Response headers are part of the contract too.** `CBOSException` takes
  `headers` and the handler propagates them, so a `429` still sends
  `Retry-After`. A translated body does not tell an automated client when to
  retry.

Clients read `code` and render their own text; `composable-os/src/lib/errors.ts`
does this for the Spanish UI. An unmapped code falls back to `message`, so a
code that reaches the client ahead of its translation degrades to English prose
rather than to a bare identifier.

## Resource Naming

### Current

- Modules use plural resource names
- Path parameters follow `<entity>_id`
- Action endpoints are represented as explicit subpaths such as:
  - `/leads/{lead_id}/convert`
  - `/opportunities/{opp_id}/stage`
  - `/quotes/{quote_id}/send`
  - `/orders/{order_id}/confirm`

### Standard

- Keep plural collection names
- Keep singular path parameter names ending in `_id`
- Use explicit action subpaths only for real business transitions, not generic mutations

## Pagination

### Current

Observed current patterns:

- CRM and Sales list routes use `limit=50`, `offset=0`, max `200`
- Workflows run listing uses `limit=50`, max `200`
- Inventory list routes use `limit=50`, `offset=0`, max `200`, including
  `/categories` and `/stock`, which returned unbounded lists until they were
  aligned

### Standard

For wedge-critical modules, normalize to:

- `limit` default `50`
- `limit` max `200`
- `offset` default `0`

Every wedge-critical list route now meets this. A list route must also carry an
explicit `ORDER BY`: without one the database may return rows in any order, and
two consecutive pages then overlap or skip records.

## Filtering

### Current

Filtering is query-driven and explicit. Examples include:

- CRM: `status`, `source`, `stage`, `owner_id`
- Sales: `status`, `opportunity_id`
- Inventory: `category_id`, `is_active`, `is_service`, `product_id`, `location`, `low_stock_only`, `movement_type`, `reference_id`

### Standard

- Use explicit query parameters for filtering
- Keep filters domain-meaningful
- Avoid overloaded search parameters until the wedge is hardened

## Mutation Behavior

### Current

- `POST` is used for create
- `PATCH` is used for partial updates and business-state transitions
- `DELETE` is used sparingly
- Some mutations represent business actions rather than CRUD

### Standard

- `POST` for create
- `PATCH` for partial update or domain transition
- `PUT` only for full replacement if later needed
- `DELETE` only when the resource truly disappears or is intentionally removed

## IDs

### Current

- Shared base model uses string UUID identifiers
- IDs are exposed as strings in schemas

### Standard

- All wedge-critical IDs remain UUID strings
- Do not introduce mixed numeric identifiers

## Time Fields

### Current

- Shared model uses `created_at` and `updated_at`
- Pydantic schemas expose datetime fields
- Event payloads use timezone-aware timestamps

### Standard

- Timestamps should be ISO 8601 serializable
- New time fields should be timezone-aware
- Use `created_at` and `updated_at` consistently for persisted entities

## Response Models

### Current

- Routes consistently declare `response_model`
- List endpoints return typed arrays
- Create and update endpoints return the resulting entity model

### Standard

- Continue using explicit `response_model` on all wedge-critical routes
- Return the canonical updated entity after successful mutations unless a no-body response is intentional

## Delete Behavior

### Current

- Workflows delete uses `204 No Content`

### Standard

- Deletions should return `204` with no response body
- Clients must not depend on response content from delete endpoints

## Domain Transition Endpoints

### Current

The API already uses explicit business transitions, which is a good fit for CBOS. Examples:

- lead conversion
- opportunity stage change
- quote send
- quote accept
- quote reject
- order confirm
- inventory reserve
- inventory release

### Standard

- Keep explicit transition endpoints for business actions
- Domain transitions must enforce current-state validity and return `409` or `422` when rules are violated

## Current Gaps To Fix

- `inventory` raises registered codes, but no frontend surface mutates stock,
  so its translations are prospective and nothing exercises them end to end
- Equivalent business errors may still use uneven wording across modules

## Immediate Adoption Rule

Starting now:

- new wedge-critical routes should follow this document
- existing routes should be aligned when touched
- any exception requires an explicit note in `docs/IMPLEMENTATION_ALIGNMENT.md`

