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
- `GET /api/v1/workspaces/me`
- `POST /api/v1/persons`
- `GET /api/v1/organizations`
- `POST /api/v1/organizations`
- `GET /api/v1/public-sites`
- `POST /api/v1/public-sites`
- `PATCH /api/v1/public-sites/{site_id}`
- `POST /api/v1/public-sites/{site_id}/rotate-key`

## Dependencies

- `core.security`
- `core.deps`
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
