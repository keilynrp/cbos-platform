# Public Site Lead Intake V1

**Status:** Initial backend implementation baseline
**Type:** Governing design for the first external brand-site integration slice
**Scope:** External brand websites creating leads in CBOS through a hardened public boundary

---

## Purpose

Define the first small, implementable bridge between independent brand sites and CBOS core.

This document intentionally does **not** define a Portal SDK, Portal Builder, or generalized public API layer. It defines one narrow slice:

`public website -> validated CBOS intake endpoint -> CRM lead -> LeadCaptured event`

---

## Why This Slice

- It is the first step of the wedge
- CRM already owns Lead creation
- `LeadCaptured` already exists in the active event registry
- It validates external-site integration without forcing broader platform commitments

---

## Current State

Today, lead creation exists in two forms:

- `POST /api/v1/crm/leads`
- `POST /api/v1/crm/public/leads`

The internal route:

- requires JWT authentication
- assumes workspace context from the authenticated user
- creates the Lead in CRM
- emits `LeadCaptured`

The public route is intended to:

- resolve workspace context from a site key
- validate request origin
- accept public lead submissions without end-user JWT
- emit the same `LeadCaptured` event through CRM ownership

What still needs hardening or verification:

- production audit trail persistence for site-key administration
- production verification of origin validation for public intake
- request-level idempotency validation under real runtime conditions beyond contract tests
- explicit operational validation of rate limiting behavior under load

What now exists in the current implementation:

- `POST /api/v1/crm/public/leads`
- `GET /api/v1/public-sites`
- `POST /api/v1/public-sites`
- `PATCH /api/v1/public-sites/{site_id}`
- `POST /api/v1/public-sites/{site_id}/rotate-key`

This means V1 now has:

- database-backed site-key resolution
- internal API administration for approved public sites
- key rotation at the API layer
- Docker-backed contract verification for workspace scoping, origin validation, and idempotency
- request-decision logging for accepted, rejected, duplicate, conflicted, and rate-limited submissions
- `Retry-After: 60` on public intake rate-limit responses
- `LeadCaptured` payload enrichment with `site_slug`, `form_id`, `source_page`, `origin`, and `public_intake`

---

## Decision Summary

Public Site Lead Intake V1 should be implemented as a **CRM-owned public route** with a distinct boundary from the internal authenticated CRM API.

Recommended route:

- `POST /api/v1/crm/public/leads`

This keeps:

- module ownership in CRM
- route versioning under `/api/v1`
- clear separation from the internal authenticated `POST /api/v1/crm/leads`

---

## Contract

### Visibility

- Public internet-facing endpoint
- Intended for direct use by approved external brand sites
- Not intended for browserless anonymous bulk ingestion

### Authentication model

V1 should use:

- `X-CBOS-Site-Key` header
- origin validation against a server-side allowlist

Optional future additions, but not required for V1:

- signed payloads
- HMAC signatures
- per-site secret rotation UI

### Workspace scoping

The site key resolves server-side to:

- `workspace_id`
- `site_slug`
- `allowed_origins`
- `is_active`

The request body must **not** be trusted to provide workspace identity.

---

## Request Shape

```json
{
  "first_name": "Keilyn",
  "last_name": "Rodriguez",
  "email": "hello@example.com",
  "phone": "+52 555 555 5555",
  "company_name": "InboundUXD",
  "notes": "Interested in AI strategy support",
  "source_page": "https://inbounduxd.com/ai-diagnostic",
  "form_id": "hero-contact-form",
  "campaign": {
    "utm_source": "linkedin",
    "utm_medium": "organic",
    "utm_campaign": "q2-authority"
  },
  "consent": {
    "accepted": true,
    "accepted_at": "2026-05-13T18:30:00Z"
  }
}
```

### V1 field rules

- `first_name`: required
- `email`: recommended, but not strictly required if phone exists
- at least one of `email` or `phone` should be required
- `source_page`: optional but strongly recommended
- `form_id`: optional but strongly recommended
- `campaign`: optional metadata
- `consent.accepted`: required if the site flow claims consent collection

### Mapping into current CRM model

Map into existing `LeadCreate` shape:

- `first_name` -> `LeadCreate.first_name`
- `last_name` -> `LeadCreate.last_name`
- `email` -> `LeadCreate.email`
- `phone` -> `LeadCreate.phone`
- `company_name` -> `LeadCreate.company_name`
- `notes` -> `LeadCreate.notes`
- `source` -> derived server-side, for example `website:inbounduxd`

V1 should not require immediate CRM schema changes. Extra public metadata can be appended into `notes` or persisted in a narrow auxiliary field only if needed during implementation.

---

## Response Shape

Use the current minimum API error convention from `docs/API_CONVENTIONS.md`.

Successful create:

```json
{
  "id": "lead_uuid",
  "status": "new",
  "source": "website:inbounduxd",
  "message": "Lead captured"
}
```

### Response code

- `201 Created` on successful new lead creation

### Error codes

- `401 Unauthorized` if site key is missing or invalid
- `403 Forbidden` if origin is not allowed or site is inactive
- `429 Too Many Requests` if the per-site/IP rate limit is exceeded; response includes `Retry-After: 60`
- `409 Conflict` if idempotency key resolves to an already accepted submission and V1 chooses explicit duplicate signaling
- `422 Unprocessable Entity` for validation failures

---

## Idempotency

V1 should support one of these approaches:

### Preferred

- `Idempotency-Key` request header stored server-side for a short TTL or persisted log

### Acceptable fallback

- deterministic duplicate detection using site key + normalized email/phone + form_id + short time window

The preferred option is better because public websites and edge runtimes can retry safely without guessing duplicate semantics.

---

## Events

V1 must reuse the active event system.

### Required emitted event

- `LeadCaptured`

### Event rules

- keep PascalCase naming
- keep current event envelope from `backend/app/events/types.py`
- do not introduce dotted event names in V1

### Suggested payload additions

```json
{
  "first_name": "Keilyn",
  "last_name": "Rodriguez",
  "email": "hello@example.com",
  "source": "website:inbounduxd",
  "site_slug": "inbounduxd",
  "form_id": "hero-contact-form",
  "source_page": "https://inbounduxd.com/ai-diagnostic"
}
```

The current implementation emits these public-intake fields on `LeadCaptured`:

- `site_slug`
- `form_id`
- `source_page`
- `origin`
- `public_intake: true`

`actor_id` should be `null` for anonymous public submissions in V1.

---

## Security Requirements

V1 minimum requirements:

- workspace resolution from site key, never from body input
- origin allowlist validation
- rate limiting per site key and IP
- request body validation through Pydantic
- basic abuse logging
- no exposure of internal CRM records in the response

Not required for V1:

- OAuth
- end-user JWTs
- public access to CRM read endpoints
- generalized webhook ingestion

---

## Observability

Track at minimum:

- total accepted submissions per site
- rejected submissions by reason
- validation failures
- rate-limit hits
- duplicate or idempotent retries
- `LeadCaptured` emit success/failure

Suggested logs:

- `site_slug`
- `workspace_id`
- request origin
- decision outcome
- lead id on success

Current implementation logs public intake decisions through `app.modules.crm.service` with:

- `outcome`: `accepted`, `rejected`, or `duplicate`
- `reason`: for rejected requests, including `missing_site_key`, `invalid_site_key`, `inactive_site`, `origin_not_allowed`, `rate_limited`, and `idempotency_conflict`
- `site_slug`, `workspace_id`, `origin`, `client_ip`, and `lead_id` where available

---

## Ownership

### CRM owns

- canonical Lead creation
- final persisted Lead state
- `LeadCaptured` emission

### Core or shared infrastructure owns

- site-key resolution
- origin validation helpers
- rate limiting primitives
- audit logging primitives

### Workflows consumes

- `LeadCaptured` exactly as it already does today

---

## Out Of Scope

- embeddable SDK components
- drag-and-drop portal or site builder
- bookings
- diagnostics
- proposal requests
- billing widgets
- generalized event collector endpoints
- multi-entity public ingestion framework

---

## Suggested Hardening Order

1. Add site-key configuration model and allowlist lookup
2. Add public CRM intake schema distinct from internal `LeadCreate`
3. Add `POST /api/v1/crm/public/leads`
4. Reuse CRM lead creation service with server-side source mapping
5. Emit `LeadCaptured` with site metadata in payload
6. Add contract tests for auth boundary, origin validation, workspace scoping, idempotency behavior, event metadata, rate-limit response headers, and rejection logs
7. Validate the flow in Docker-backed tests and deployment-like runtime
8. Document the route in `API_CONVENTIONS.md` once the runtime contract is fully verified

Steps 1 through 6 now have a hardened implementation baseline in the repository. Remaining hardening is operational: production-like load validation, durable audit storage if needed, and deployment confirmation.

---

## Open Questions

1. Site keys now live in database tables for V1. The remaining question is whether future production hardening needs hashing, vault-backed storage, or UI-only reveal semantics.
2. Should extra public metadata stay in event payload plus notes, or does production reporting require structured storage?
3. Strict `Idempotency-Key` support now exists for retries. Do we also want duplicate detection for submissions without an idempotency key?
4. Do we need separate keys for browser-submitted forms vs server-side site actions?
