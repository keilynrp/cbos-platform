# CBOS Spec Driven Development Contract
## Portal Integration, Brand Sites and Composable Business Operating System

**Version:** 0.1  
**Status:** Draft for architectural alignment  
**Scope:** keirodriguez.com, inbounduxd.com and CBOS platform integration  
**Primary Objective:** Establish a development contract to ensure that independent brand websites, CBOS APIs, Portal SDK, and future Portal Builder evolve coherently within a scalable composable architecture.

---

## 0. Alignment Status

This document is a **forward-looking integration contract**, not the governing implementation source of truth for current CBOS behavior.

Current implementation authority remains:

- `docs/FOUNDATIONAL_ARCHITECTURE.md`
- `docs/IMPLEMENTATION_ALIGNMENT.md`
- `docs/API_CONVENTIONS.md`
- `docs/EVENT_REGISTRY_V1.md`
- `docs/capabilities/`
- `docs/adr/`

Interpretation rules:

- When this document describes future contracts, SDKs, builders, event shapes, or public integration models that do not yet exist in code, treat them as **target-state guidance**
- When this document conflicts with active API routes, event names, or envelope fields already implemented in code, the active docs and code win
- This spec must not be used to silently replace current PascalCase event names, `/api/v1` route patterns, or the current event envelope without ADR

---

## 1. Executive Intent

CBOS must not begin as a generic website builder. CBOS must begin as a composable business operating backend capable of serving independent digital properties through APIs, webhooks, embeddable components and eventually a native Portal Builder.

The first real-world validation environments are:

1. **keirodriguez.com**  
   Personal brand, authority engine, consulting funnel and AI strategy command center.

2. **inbounduxd.com**  
   Business brand, commercial execution layer, agency operations lab and client delivery system.

Both properties must retain their own visual identity, UX, SEO strategy and frontend autonomy while progressively connecting to the CBOS ecosystem.

CBOS becomes the operational and intelligence backbone.

---

## 2. Core Architectural Decision

### Decision

CBOS shall support a hybrid portal strategy:

1. **Phase 1:** Independent websites connected to CBOS through APIs, webhooks and tracking events.
2. **Phase 2:** CBOS Portal SDK for embeddable operational components.
3. **Phase 3:** CBOS Portal Builder for dynamic microsites, client portals, landing pages and operational web interfaces.

### Rationale

Starting with a full Portal Builder would introduce excessive product complexity before validating reusable operational patterns. Independent sites connected to CBOS allow faster validation, lower architectural risk and clearer product learning.

### Non-Negotiable Principle

CBOS must own the business logic, data model, workflows, intelligence layer and operational state. External sites may own presentation, content and brand experience.

---

## 3. Product Boundaries

### CBOS Is Responsible For

- Identity and access management
- Tenancy and workspace management
- CRM records and lifecycle state
- Lead capture and qualification
- Sales pipelines
- Workflow orchestration
- Event tracking
- Proposal generation
- Client onboarding
- Billing and invoicing integrations
- Notification orchestration
- AI-assisted routing and recommendations
- Knowledge and context enrichment through UKIP-compatible services
- Operational analytics

### Brand Sites Are Responsible For

- Public-facing UX/UI
- Brand identity
- Content presentation
- SEO structure
- Landing page design
- Public navigation
- Editorial experience
- Static or headless content delivery
- Campaign-specific storytelling

### Portal SDK Is Responsible For

- Embeddable CBOS components
- Secure frontend-to-CBOS interaction
- Form submission components
- Booking widgets
- Lead qualification flows
- Client portal widgets
- Proposal viewers
- Checkout or billing widgets where applicable
- Event instrumentation utilities

### Portal Builder Is Responsible For, Eventually

- Dynamic microsite creation
- Client-specific portals
- Campaign landing pages
- Authenticated dashboards
- Template-driven page creation
- Domain or subdomain publishing
- Role-aware content rendering
- Native connection to CBOS modules

---

## 4. System Architecture

### 4.1 Target Hybrid Architecture

```txt
keirodriguez.com          inbounduxd.com
       |                        |
       | API / SDK / Webhooks   | API / SDK / Webhooks
       v                        v
+---------------------------------------------+
|                  CBOS Core                   |
|---------------------------------------------|
| Auth | Tenancy | CRM | Sales | Workflows     |
| Billing | Proposals | Events | Analytics     |
+---------------------------------------------+
                    |
                    v
+---------------------------------------------+
|             Intelligence Layer               |
|---------------------------------------------|
| AI Gateway | Context Memory | Semantic Graph |
| Entity Resolution | Recommendations          |
+---------------------------------------------+
                    |
                    v
+---------------------------------------------+
|              UKIP-Compatible Layer           |
|---------------------------------------------|
| Knowledge Graph | RDF/LOD | Vector Search    |
| Semantic Enrichment | Data Interoperability   |
+---------------------------------------------+
```

---

## 5. Development Contract

Every feature, module or integration must comply with the following contract before implementation.

---

## 6. Capability Contract

Each CBOS capability must define:

```yaml
capability:
  name: string
  domain: string
  owner: string
  description: string
  business_goal: string
  primary_users:
    - string
  inputs:
    - name: string
      type: string
      required: boolean
  outputs:
    - name: string
      type: string
  events_emitted:
    - string
  events_consumed:
    - string
  api_endpoints:
    - method: string
      path: string
  permissions_required:
    - string
  data_entities:
    - string
  workflow_triggers:
    - string
  ai_assistance:
    enabled: boolean
    purpose: string
  observability:
    metrics:
      - string
    logs:
      - string
    traces:
      - string
```

No capability should be implemented without this minimum specification.

---

## 7. Brand Site Integration Contract

Any external site connecting to CBOS must comply with this integration contract.

```yaml
site:
  name: string
  domain: string
  brand_type: personal | business | client | campaign | internal
  frontend_stack: string
  content_source: static | headless_cms | custom_cms | cbos_portal
  cbos_workspace_id: string
  authentication_required: boolean
  connected_modules:
    - crm
    - forms
    - booking
    - workflows
    - analytics
    - proposals
    - billing
  event_tracking:
    enabled: boolean
    events:
      - page_view
      - form_submit
      - lead_created
      - booking_requested
      - proposal_viewed
      - checkout_started
      - payment_completed
  api_access:
    method: public_api | server_api | sdk | webhook
    rate_limit_policy: string
  security:
    allowed_origins:
      - string
    captcha_required: boolean
    signed_payloads_required: boolean
```

---

## 8. Initial Site Specifications

### 8.1 keirodriguez.com

```yaml
site:
  name: Kei Rodríguez Personal Brand
  domain: keirodriguez.com
  brand_type: personal
  strategic_role: authority_engine
  cbos_workspace_id: workspace_kei_personal
  primary_goals:
    - build authority
    - capture consulting leads
    - qualify AI strategy opportunities
    - distribute strategic content
    - test semantic lead intelligence
  connected_modules:
    - crm
    - lead_capture
    - diagnostic_forms
    - booking
    - content_intelligence
    - analytics
    - proposals
    - ai_recommendations
  required_events:
    - page_view
    - article_read
    - service_page_view
    - diagnostic_started
    - diagnostic_completed
    - lead_created
    - booking_requested
    - proposal_requested
  initial_embeds:
    - CBOSLeadForm
    - CBOSBookingWidget
    - CBOSDiagnosticFlow
    - CBOSProposalRequest
```

### 8.2 inbounduxd.com

```yaml
site:
  name: InboundUXD Business Brand
  domain: inbounduxd.com
  brand_type: business
  strategic_role: commercial_execution_layer
  cbos_workspace_id: workspace_inbounduxd
  primary_goals:
    - acquire clients
    - manage commercial pipeline
    - test client onboarding
    - validate agency operations workflows
    - generate proposals and delivery plans
  connected_modules:
    - crm
    - sales_pipeline
    - onboarding
    - proposal_builder
    - workflow_engine
    - billing
    - analytics
    - client_portal
  required_events:
    - page_view
    - service_page_view
    - form_submit
    - lead_created
    - sales_stage_changed
    - onboarding_started
    - onboarding_completed
    - proposal_created
    - proposal_accepted
    - invoice_requested
  initial_embeds:
    - CBOSLeadForm
    - CBOSClientIntake
    - CBOSProposalViewer
    - CBOSClientPortalWidget
    - CBOSBookingWidget
```

---

## 9. API Contract

CBOS APIs must be designed as stable contracts between external sites and internal business capabilities.

The principles below are valid design direction. The **operational contract today** is still defined by `docs/API_CONVENTIONS.md` and the implemented backend routes.

### 9.1 Required API Principles

- API-first design
- Versioned endpoints
- Workspace-aware requests
- Idempotent write operations where applicable
- Strict validation schemas
- Consistent error objects
- Audit logging for sensitive operations
- Rate limiting per workspace and origin
- Clear public vs server-side API boundaries

### 9.2 Example Endpoint Contract

The following YAML is an **illustrative future public-site contract**, not a statement that this exact endpoint, auth model, or response shape already exists in CBOS today.

```yaml
endpoint:
  method: POST
  path: /api/v1/leads
  visibility: public_safe
  purpose: create lead from external site or SDK component
  authentication: public_site_key + origin validation
  idempotency_required: true
  request_body:
    workspace_id: string
    source_site: string
    form_id: string
    contact:
      name: string
      email: string
      phone: string
    interest:
      service: string
      budget_range: string
      urgency: string
      notes: string
    metadata:
      utm_source: string
      utm_medium: string
      utm_campaign: string
      landing_page: string
      referrer: string
  response:
    lead_id: string
    status: created | duplicate | enriched
    next_action: string
  events_emitted:
    - LeadCaptured
    - WorkflowTriggered
```

---

## 10. Event Contract

All meaningful interactions must generate normalized events.

For current implementation, `docs/EVENT_REGISTRY_V1.md` and `backend/app/events/types.py` remain authoritative. The shape below is a **target-state normalization model**, not the active runtime envelope.

### 10.1 Event Shape

```json
{
  "event_id": "evt_123",
  "event_type": "LeadCaptured",
  "workspace_id": "workspace_inbounduxd",
  "source": "inbounduxd.com",
  "actor": {
    "type": "anonymous|contact|user|system|agent",
    "id": "string|null"
  },
  "entity": {
    "type": "lead",
    "id": "lead_123"
  },
  "timestamp": "2026-05-11T00:00:00Z",
  "payload": {},
  "schema_version": "1.0.0"
}
```

Alignment note:

- Active code uses `source_module`, `actor_id`, `entity_id`, and `timestamp`
- Active registry uses PascalCase event names such as `LeadCaptured`, `QuoteAccepted`, and `PortalSessionCreated`
- Nested `actor` / `entity`, dotted event names, and `correlation_id` should be treated as future design candidates until adopted explicitly

### 10.2 Required Event Categories

- `site.*`
- `lead.*`
- `crm.*`
- `booking.*`
- `workflow.*`
- `proposal.*`
- `billing.*`
- `client_portal.*`
- `ai.*`
- `knowledge.*`

---

## 11. Data Contract

CBOS must maintain canonical business entities independently from frontend implementation.

### 11.1 Initial Canonical Entities

```yaml
entities:
  - Workspace
  - User
  - Contact
  - Lead
  - Account
  - Opportunity
  - Service
  - Offer
  - Form
  - Submission
  - Booking
  - Proposal
  - Invoice
  - Workflow
  - WorkflowRun
  - Event
  - ContentItem
  - KnowledgeEntity
  - ClientPortal
  - Project
```

### 11.2 Entity Ownership Rule

The frontend must never be the source of truth for operational entities. The frontend may display, request, submit or render data, but CBOS owns the canonical state.

---

## 12. Portal SDK Contract

The Portal SDK must allow CBOS capabilities to be embedded into independent websites without forcing those sites to be built inside CBOS.

### 12.1 SDK Goals

- Reduce integration friction
- Preserve brand autonomy
- Standardize event tracking
- Enable secure CBOS interactions
- Provide reusable operational widgets
- Prepare migration path toward Portal Builder

### 12.2 Initial SDK Components

```tsx
<CBOSLeadForm workspace="workspace_kei_personal" form="ai-strategy-diagnostic" />
<CBOSBookingWidget workspace="workspace_kei_personal" service="strategy-session" />
<CBOSDiagnosticFlow workspace="workspace_kei_personal" flow="ai-readiness" />
<CBOSClientIntake workspace="workspace_inbounduxd" flow="project-intake" />
<CBOSProposalViewer workspace="workspace_inbounduxd" proposalId="proposal_123" />
<CBOSClientPortalWidget workspace="workspace_inbounduxd" clientId="client_123" />
```

### 12.3 SDK Requirements

- Framework-compatible with React/Next.js first
- Future support for plain JavaScript embeds
- Configurable theme tokens
- Workspace scoped
- Origin restricted
- Event-aware by default
- Accessible components
- Minimal bundle footprint
- Graceful failure states

---

## 13. Portal Builder Contract

The Portal Builder shall not be implemented until the following conditions are met:

1. At least three reusable portal patterns have emerged from real operations.
2. API contracts for CRM, forms, booking, workflows and proposals are stable.
3. Portal SDK components are used successfully in production.
4. Event tracking and workspace scoping are mature.
5. There is a clear business need for non-technical portal creation.

### 13.1 Future Portal Types

- Public landing page
- Campaign microsite
- Client onboarding portal
- Proposal portal
- Project delivery portal
- Knowledge hub
- Internal dashboard
- Member area

---

## 14. AI and Intelligence Contract

AI must not be added as decoration. Every AI feature must map to a business decision, workflow improvement or contextual intelligence function.

```yaml
ai_feature:
  name: string
  business_problem: string
  decision_supported: string
  input_context:
    - string
  output_type: recommendation | classification | generation | routing | summarization | enrichment
  human_review_required: boolean
  confidence_required: number
  fallback_behavior: string
  audit_log_required: boolean
```

### 14.1 Initial AI Use Cases

For keirodriguez.com:

- Lead intent classification
- AI maturity diagnosis
- Content recommendation
- Consulting offer recommendation
- Proposal draft generation

For inbounduxd.com:

- Client intake summarization
- Sales opportunity scoring
- Proposal generation
- Workflow recommendation
- Delivery risk detection

---

## 15. Security Contract

### 15.1 Minimum Security Requirements

- Workspace isolation
- Role-based access control
- Origin validation for public embeds
- API keys scoped by workspace and site
- Signed webhook payloads
- Input validation for all public endpoints
- Rate limiting
- Audit logs
- Secure secret management
- No sensitive data in frontend bundles
- PII classification and protection

### 15.2 Public API Boundary

Public endpoints may accept lead forms, bookings, event tracking and diagnostic submissions. Public endpoints must never expose CRM internals, billing records, private proposals or workflow definitions.

---

## 16. Observability Contract

Every production capability must include:

```yaml
observability:
  metrics:
    - request_count
    - error_rate
    - latency_p95
    - conversion_rate
    - workflow_success_rate
  logs:
    - structured_application_logs
    - security_logs
    - audit_logs
  traces:
    - api_request_trace
    - workflow_run_trace
    - event_correlation_trace
```

---

## 17. Acceptance Criteria

A feature is accepted only if it satisfies:

1. Capability spec exists.
2. API or SDK contract is documented.
3. Events are defined.
4. Data entities are identified.
5. Security boundaries are clear.
6. Workspace scoping is implemented.
7. Basic tests are included.
8. Error states are handled.
9. Observability hooks exist.
10. Documentation is updated.

---

## 18. Anti-Scope Rules

CBOS must reject or postpone features that violate these principles:

- Do not build a full website builder before validating Portal SDK usage.
- Do not duplicate frontend logic across brand sites.
- Do not let brand sites become sources of truth for business entities.
- Do not create modules without events.
- Do not add AI features without clear business utility.
- Do not build generic ERP features before proving agency and consulting workflows.
- Do not implement multi-tenant features without workspace isolation.
- Do not create visual builders before stable APIs exist.

---

## 19. Initial Implementation Roadmap

### Sprint 1: Integration Foundation

- Define Workspace model
- Define Site Registry model
- Define public site keys
- Implement lead creation API
- Implement basic event ingestion API
- Connect one form from keirodriguez.com
- Connect one form from inbounduxd.com

### Sprint 2: CRM and Workflow Linkage

- Map leads to contacts
- Add lifecycle stages
- Trigger workflow on lead creation
- Add notifications
- Add UTM and source attribution
- Add event timeline per contact

### Sprint 3: Portal SDK Alpha

- Build React SDK package
- Create CBOSLeadForm
- Create CBOSBookingWidget stub
- Add theme token support
- Add event tracking helper
- Test in both brand sites

### Sprint 4: Intelligence Layer Alpha

- Add lead classification
- Add service interest detection
- Add recommended next action
- Add AI-generated intake summary
- Add human review flag

### Sprint 5: Client Portal Prototype

- Create authenticated client portal API
- Create proposal viewer
- Create onboarding intake flow
- Create client dashboard widget
- Test first internal client scenario through InboundUXD

---

## 20. Definition of Done

CBOS integration with keirodriguez.com and inbounduxd.com is considered successful when:

1. Both sites can create leads inside CBOS.
2. Both sites emit normalized events.
3. Leads are attributed to site, campaign and service interest.
4. CRM records are created or updated automatically.
5. At least one workflow is triggered per site.
6. At least one SDK component is embedded in each site.
7. AI classification produces reviewed recommendations.
8. Operational analytics show conversion and lifecycle movement.
9. The implementation is documented.
10. The pattern can be replicated for a third site or client portal.

---

## 21. Strategic Conclusion

CBOS should evolve as a composable business operating backend first, a portal integration layer second and a portal builder third.

The immediate goal is not to replace keirodriguez.com or inbounduxd.com. The immediate goal is to make both properties operationally intelligent through CBOS.

Once repeated patterns emerge, those patterns can be productized into Portal SDK components and later into a native Portal Builder.

This contract protects the architecture from premature complexity while preserving the long-term vision of a scalable, AI-native, composable business operating system.
