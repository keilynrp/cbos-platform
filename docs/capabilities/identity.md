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

## Core Entities

- User
- Workspace membership or workspace association
- Authentication credentials

## Exposed API Surface

The module is expected to own:

- register
- login
- token refresh
- current user/session resolution

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

## Current Gaps

- explicit identity event contract is not yet formalized
- role and permission model should be documented more explicitly
- token storage strategy in the frontend should be reviewed before production hardening

