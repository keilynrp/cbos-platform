# Capability Spec: Identity

## Purpose

Provide authentication, user access, and workspace scoping for all protected CBOS capabilities.

## Role In MVP

Identity is a foundational capability and a hard dependency for the MVP wedge.

## Owns

- user authentication lifecycle
- access token and refresh token behavior
- current user resolution
- workspace scoping for protected requests
- administration of approved `PublicSite` records for external intake bootstrap

## Core Entities

- User
- Person — holds the human details, `full_name` among them. `User.person_id`
  is nullable, so a user without a Person is legal and simply has no name
- Workspace membership or workspace association
- Authentication credentials
- PublicSite

## Exposed API Surface

The module is expected to own:

- register
- login
- token refresh
- current user/session resolution — `GET /api/v1/auth/me` returns the user plus
  `full_name`, joined from the linked Person because the field does not live on
  `users`. The join is done in the route and not in `get_current_user`, which
  runs on every protected route and does not need the name. `full_name` is
  `null` when the user has no Person
- `DELETE /api/v1/users/{user_id}?confirm_email=<email>` — destructive and
  irreversible, so it is gated four ways, none of which replaces the others:
  admin-only (`get_current_admin_user`); scoped to the caller's workspace, so a
  user from another tenant returns `404` and never `403`; refuses self-deletion
  and refuses the workspace owner; and requires `confirm_email` to match the
  target exactly, which forces the caller to name who they are deleting instead
  of trusting a pasted id. If the user still owns records the database refuses
  the delete and the route returns `409 IDENTITY_USER_HAS_RECORDS` carrying the
  foreign key that blocked it, rather than an opaque `500`. The linked Person
  survives on purpose: it may also be a business contact referenced by quotes,
  orders or contracts
- `PATCH /api/v1/auth/me` — sets the caller's own `locale` (ADR 0016). The body
  must carry the `locale` key: a tag (`"es"`, `"es-MX"`) sets it, `null` returns
  the user to following the workspace default, and an absent key is a `422`
  because absent and `null` mean different things. Validated against the shipped
  catalogues (today only `es`) and rejected with
  `422 IDENTITY_LOCALE_UNSUPPORTED` rather than silently falling back. Region
  subtags are kept and canonicalised (`es_mx` → `es-MX`)
- `GET /api/v1/workspaces/me` — includes `default_locale`
- `POST /api/v1/persons`
- `GET /api/v1/organizations`
- `POST /api/v1/organizations`
- `GET /api/v1/public-sites`
- `POST /api/v1/public-sites`
- `PATCH /api/v1/public-sites/{site_id}`
- `POST /api/v1/public-sites/{site_id}/rotate-key`

## Locale

Two columns, both resolved only through `app.core.i18n.resolve_locale` — nothing
reads them directly:

- `users.locale`, nullable. `NULL` means "follow the workspace", not "no
  language", so changing the workspace default moves everyone who never chose.
- `workspaces.default_locale`, not null, `"es"`. `POST /auth/register` is the one
  place `Accept-Language` decides anything: there is no stored preference and no
  workspace to inherit from yet, so the header seeds the new workspace's default.
  The new user keeps `locale = NULL`.

`GET /auth/me` returns both: `locale` (what is stored, `null` = follows the
workspace) and `effective_locale` (what the client should use, already resolved
by `resolve_locale` from `users.locale` then `workspaces.default_locale`, with no
`Accept-Language` — the header only counts at registration). The frontend applies
`effective_locale` and does not reimplement the chain.

Until a second catalogue ships (plan task 12) every valid value resolves to
`es`, so none of this changes what is rendered.

## Dependencies

- `core.security`
- `core.deps`
- `core.i18n`
- persistence layer

## Event Responsibilities

Minimum future event candidates:

- `identity.user_registered`
- `identity.user_logged_in`
- `identity.session_refreshed`

Identity events are not required to block wedge delivery, but access boundaries must be stable.

## MVP Scope

- reliable login and registration
- workspace-aware authorization
- active/inactive user enforcement
- internal bootstrap for external-site keys used by public CRM intake
- owner/admin-gated management of `PublicSite` records and key rotation

## Current Gaps

- explicit identity event contract is not yet formalized
- role and permission model should be documented more explicitly
- token storage strategy in the frontend should be reviewed before production hardening
- `PublicSite` administration now enforces owner/admin access, but it still lacks stronger secret masking policy and audit-trail semantics for production use
