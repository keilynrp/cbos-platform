# ADR 0013 - Adopt Public Site Lead Intake V1 As The First External Integration Slice

**Date:** 2026-05-13
**Status:** Accepted
**Deciders:** Platform team

---

## Context

`docs/cbos_sdd_portal_integration_contract.md` establishes a broader target architecture in which independent brand sites connect to CBOS through APIs, events, webhooks, and future embeddable components.

That direction is strategically useful, but it is too broad to implement safely as one initiative. Today:

- Portal is the only mature public interaction surface
- CRM already owns lead creation and publishes `LeadCaptured`
- there is no hardened public site intake endpoint
- there is no approved public site-key model
- there is no rate-limit or origin-validation contract for external site intake

If the team jumps directly into Portal SDK or Portal Builder work, it will expand the architecture before validating the operational boundary between external sites and CBOS core.

---

## Decision

Adopt **Public Site Lead Intake V1** as the **first approved external brand-site integration slice**.

This slice is the only external integration target that should move from strategic guidance toward implementation immediately.

The slice will:

1. expose a bounded public lead-intake endpoint owned by CRM
2. remain under the active `/api/v1` routing model
3. reuse the current CRM lead creation flow and `LeadCaptured` event
4. introduce explicit public-site authentication and origin validation rules
5. avoid SDK, Portal Builder, billing widgets, booking widgets, and generalized external APIs for now

---

## Why This Slice First

### Strategic fit

- It validates the thesis that independent brand sites can use CBOS as their operating backend
- It is narrow enough to implement without destabilizing the wedge
- It creates real operating data at the entry point of the funnel

### Architectural fit

- CRM already owns the canonical Lead entity
- Workflows already know how to react to `LeadCaptured`
- Notifications explicitly do not need to surface acquisition-stage events in the UI today
- It does not require changing the current event envelope or naming scheme

### Risk reduction

- It forces explicit answers on abuse prevention
- It avoids premature SDK surface design
- It keeps the first public integration close to an already mature domain

---

## Consequences

### Positive

- The external integration roadmap now has a concrete first implementation target
- Public integration work stays wedge-adjacent instead of drifting into generic platform building
- CRM remains the clear owner of inbound lead state
- Public-site integration can be validated before broader public API claims are made

### Negative / Constraints

- Other ideas from the strategic integration contract remain deferred
- The first public integration will add security and operational requirements not currently present in CRM
- The route, auth model, and idempotency contract will need deliberate implementation rather than simple reuse of the authenticated endpoint

---

## Explicit Deferrals

The following remain **out of scope** until this slice is implemented and proven:

- Portal SDK
- Portal Builder
- generalized public event ingestion
- booking widgets
- proposal viewer embeds
- billing or checkout widgets
- new dotted event taxonomies
- event envelope redesign
- semantic or UKIP-oriented infrastructure changes

---

## Implementation Baseline

Implementation design should follow:

- `docs/PUBLIC_SITE_LEAD_INTAKE_V1.md`
- `docs/API_CONVENTIONS.md`
- `docs/EVENT_REGISTRY_V1.md`
- `docs/FOUNDATIONAL_ARCHITECTURE.md`

---

## Related

- `docs/cbos_sdd_portal_integration_contract.md`
- `docs/IMPLEMENTATION_ALIGNMENT.md`
- `docs/capabilities/crm.md`
- ADR 0003
- ADR 0004
