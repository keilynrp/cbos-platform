# Capability Spec: CRM

**Module:** `backend/app/modules/crm/`
**Tier:** 1 - Wedge-Critical
**Owner:** Platform team
**Status:** API, persisted, tested, event-emitting, production-aligned

---

## Purpose

Manage leads, opportunities, customer-related activity, and the first stages of the commercial wedge.

## Role In MVP

CRM is the entry point of the wedge and one of the most mature implemented capabilities.

## Owns

- lead creation and listing
- lead qualification state
- lead conversion into opportunity
- opportunity lifecycle and stage changes
- related activity tracking

## Core Entities

- Lead
- Opportunity
- Activity
- Contact or customer linkage

## Exposed API Surface

The module currently supports:

- `POST /api/v1/crm/leads`
- `POST /api/v1/crm/public/leads`
- `GET /api/v1/crm/leads`
- `GET /api/v1/crm/leads/{lead_id}`
- `PATCH /api/v1/crm/leads/{lead_id}`
- `POST /api/v1/crm/leads/{lead_id}/convert`
- `POST /api/v1/crm/opportunities`
- `GET /api/v1/crm/opportunities`
- `GET /api/v1/crm/opportunities/{opp_id}`
- `PATCH /api/v1/crm/opportunities/{opp_id}`
- `PATCH /api/v1/crm/opportunities/{opp_id}/stage`
- `GET /api/v1/crm/pipeline/summary`
- `POST /api/v1/crm/activities`
- `GET /api/v1/crm/activities`
- `PATCH /api/v1/crm/activities/{activity_id}/complete`

All current internal CRM write routes are authenticated and workspace-scoped.
The public intake route is anonymous, workspace-resolved from a site key, and bounded by origin validation, idempotency handling, per-site/IP rate limiting, and decision logging.

## Dependencies

- `identity` for auth and workspace scoping
- shared persistence layer
- event backbone for business events

## Event Responsibilities

CRM should publish and maintain versioned contracts for events such as:

- `LeadCaptured`
- `LeadConvertedToOpportunity`
- `OpportunityCreated`
- `OpportunityUpdated`
- `OpportunityStageChanged`
- `OpportunityWon`
- `OpportunityLost`

For public lead intake, `LeadCaptured` includes public-site context (`site_slug`, `form_id`, `source_page`, `origin`, `public_intake`) while keeping `actor_id` null.

## MVP Scope

- lead intake
- qualification
- opportunity progression
- handoff into downstream order and sales flow

## Current Gaps

- public site intake v1 now has implementation plus contract verification for site-key auth, origin policy, workspace scoping, idempotency, event metadata, rate-limit response headers, and rejection logging; remaining hardening is production-like validation and secret/audit storage policy
- customer conversion boundary should be made explicit
- ownership line between CRM and Sales needs clearer documentation
- public site integration depends on `identity` administration routes for `PublicSite` bootstrap and key rotation, and should continue following ADR 0013 and `docs/PUBLIC_SITE_LEAD_INTAKE_V1.md`
