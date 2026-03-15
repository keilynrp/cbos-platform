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
