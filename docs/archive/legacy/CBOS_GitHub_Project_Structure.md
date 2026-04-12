> **\xe2\x9a\xa0\xef\xb8\x8f ARCHIVED** \xe2\x80\x94 This document is historical reference only. It has been superseded by the governing architecture (ADRs 0001\xe2\x80\x930010) and current capability specs in `docs/capabilities/`. Do not use for implementation decisions.

---

# CBOS GitHub Project Structure


    cbos-platform/
    │
    ├── README.md
    │
    ├── docs/
    │   ├── strategy/
    │   ├── architecture/
    │   ├── product/
    │   ├── neural-graph/
    │   └── events/
    │
    ├── adr/
    │   └── architecture-decisions/
    │
    ├── schemas/
    │   ├── data-models/
    │   └── event-schemas/
    │
    ├── workflows/
    │   └── automation/
    │
    ├── services/
    │   ├── api-gateway/
    │   ├── identity-service/
    │   ├── crm-service/
    │   ├── commerce-service/
    │   ├── inventory-service/
    │   ├── ai-hub/
    │   └── event-service/
    │
    ├── apps/
    │   ├── portal/
    │   ├── pos/
    │   └── admin-console/
    │
    ├── packages/
    │   ├── ui-components/
    │   ├── sdk/
    │   └── schemas/
    │
    ├── infrastructure/
    │   ├── docker/
    │   ├── terraform/
    │   └── k8s/
    │
    └── scripts/
        └── dev-tools/

## Design Principles

-   Modular services
-   Event-driven architecture
-   Clear separation of layers
-   Documentation-first development
