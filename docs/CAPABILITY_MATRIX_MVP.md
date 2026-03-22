# Capability Matrix MVP

## Status Legend

- `Placeholder`: vision or shell only
- `UI`: page exists with little or no validated backend support
- `API`: backend routes or services exist
- `Persisted`: backed by database state
- `Evented`: emits or consumes business events
- `Tested`: meaningful automated coverage exists

## Backend-Aligned Capabilities

| Capability | Backend Module | Frontend Surface | Role In MVP Wedge | Current State | Notes |
|---|---|---|---|---|---|
| Identity & Access | `identity` | `Login`, `Register`, account surfaces | Required | API, Persisted | Auth and workspace boundary |
| CRM | `crm` | `CRM`, `Prospecting`, `RevPathIntelligence` | Required | API, Persisted, Evented | Strong start of the wedge |
| Sales | `sales` | `SalesBuilder`, `POSBuilder` | Required | API | Needs hardening around wedge flow |
| Inventory | `inventory` | `InventoryOrders`, `WarehouseBuilder` | Required | API | Critical to order and sale flow |
| Portal | `portal` | `PortalBuilder`, `ShopBuilder` | Conditional | API | Keep wedge-focused |
| Workflows | `workflows` | `Workflows` | Required infrastructure | API, Evented | Central orchestration layer |
| Notifications | `notifications` | implicit UI/system notifications | Supporting | API, Evented | Useful, but not wedge-driving |
| Discovery | `discovery` | `Discovery` | Optional in MVP | API | Prevent scope drift |
| Accounting | `accounting` | `Invoicing` | Optional in MVP | API | Follow-on unless wedge requires it |

## Frontend Surfaces Ahead Of Backend Maturity

These should remain exploratory or clearly staged until tied to ownership and tested flows:

- `KnowledgeGraph`
- `Analytics`
- `AIAgents`
- `Marketplace`
- `Documents`
- `ExperienceMapper`
- `MCPIntegrationHub`
- `IoTBuilder`
- `SynapticModeler`
- `IntelligenceGraphOS`
- `LeadMagnetBuilder`
- `EventBuilder`
- `AppointmentBuilder`
- `ChatbotBuilder`
- `PersonaBuilder`
- `PlatformMap`
- `TeamStructure`
- `ContractStudio`

## Recommended Capability Tiers

### Tier 1: Must Harden Now

- Identity & Access
- CRM
- Sales
- Inventory
- Workflows

### Tier 2: Support The Wedge

- Portal
- Notifications

### Tier 3: Keep Controlled

- Discovery
- Accounting

### Tier 4: Future-Oriented Or Exploratory

- Graph, AI, marketplace, IoT, and modeling surfaces without hardened domain backing

## Execution Rule

No capability should move from exploratory to core without:

- a named owner
- a module boundary
- an API contract
- an event contract if applicable
- at least one end-to-end scenario
