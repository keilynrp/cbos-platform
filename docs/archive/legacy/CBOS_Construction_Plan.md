# CBOS — Plan Maestro de Construcción
## Composable Business Operating System

**Versión:** 1.0
**Fecha:** 2026-03-14
**Autor:** Equipo de Producto y Arquitectura
**Estado:** Activo — Guía de referencia para planificación por Sprints

---

## Índice

1. [Contexto estratégico](#1-contexto-estratégico)
2. [Principios de ejecución](#2-principios-de-ejecución)
3. [Stack tecnológico](#3-stack-tecnológico)
4. [Arquitectura del sistema](#4-arquitectura-del-sistema)
5. [Estructura del repositorio](#5-estructura-del-repositorio)
6. [MVP Wedge — Alcance exacto](#6-mvp-wedge--alcance-exacto)
7. [Fases de construcción](#7-fases-de-construcción)
8. [Modelo de datos del MVP](#8-modelo-de-datos-del-mvp)
9. [Catálogo de eventos del MVP](#9-catálogo-de-eventos-del-mvp)
10. [Registro de capacidades del MVP](#10-registro-de-capacidades-del-mvp)
11. [Infraestructura y deployment](#11-infraestructura-y-deployment)
12. [Métricas de éxito del MVP](#12-métricas-de-éxito-del-mvp)
13. [Roadmap post-MVP](#13-roadmap-post-mvp)
14. [Lo que NO construir todavía](#14-lo-que-no-construir-todavía)

---

## 1. Contexto estratégico

### Qué es CBOS

El **Composable Business Operating System (CBOS)** no es un ERP tradicional. Es un **sistema operativo empresarial** donde:

- Las capacidades se componen on-demand según las necesidades reales del cliente
- La IA es infraestructura transversal, no un módulo aislado
- El sistema detecta problemas operativos, compone la solución y aprende de los resultados
- Todo cambio significativo genera eventos que conectan módulos y disparan automatizaciones

### El pitch del producto

> "Un sistema operativo empresarial que detecta tus problemas operativos y compone automáticamente las herramientas necesarias para resolverlos."

### El sistema integrado completo

| Nombre | Capa |
|--------|------|
| **CBOS** | Composable Business Operating System — plataforma operacional |
| **UKIP** | Universal Knowledge Intelligence Platform — capa semántica y knowledge graph |
| **EIGOS** | Enterprise Intelligence Graph OS — nombre del sistema integrado |

### El verdadero diferenciador

La ventaja competitiva **no está** en tener CRM, inventario o POS. Eso ya existe.

La ventaja está en el **control plane**:

- **Solution Discovery Engine** — onboarding inteligente por diagnóstico
- **Capability Registry** — capacidades reutilizables componibles
- **MCP Integration Hub** — IA como infraestructura transversal
- **Synaptic System Modeler** — visualización arquitectónica viva
- **Decision Intelligence Engine** — recomendaciones y forecasting

---

## 2. Principios de ejecución

Estos principios gobiernan **todas** las decisiones de construcción.

### 2.1 Modular monolith primero

Construir como un monolito con límites de dominio impecables. Extraer servicios **solo** cuando la presión de escala sea real y medible.

> "Muchos equipos diseñan una ciudad de microservicios cuando todavía no tienen ni una calle asfaltada."

### 2.2 Capacidades, no aplicaciones

Cada nueva funcionalidad se evalúa como capacidad reutilizable, no como feature aislada de un módulo.

### 2.3 Eventos como sistema nervioso

Todo cambio significativo emite un evento. Los módulos se comunican a través del Event Bus, no mediante llamadas directas entre sí.

### 2.4 Datos como núcleo

Modelo de datos unificado con entidades canónicas compartidas. Los módulos extienden entidades, no las redefinen.

### 2.5 IA como infraestructura

La inteligencia artificial no es un módulo. Es accesible desde cualquier componente mediante el MCP Integration Hub.

### 2.6 Disciplina de secuencia

> "Tu problema no es falta de visión. Tu problema potencial es tener demasiada visión simultánea."

La clave no es imaginar más. Es elegir qué **no** construir todavía.

### 2.7 Primero circulación, luego el escáner

> "Primero crea circulación sanguínea. Luego construyes el escáner neural."

Synaptic Modeler, Monte Carlo y Knowledge Graph entran **después** de que los flujos operacionales estén vivos.

---

## 3. Stack tecnológico

### Frontend

| Tecnología | Rol | Estado |
|------------|-----|--------|
| React 18 + TypeScript | Framework UI | Existente |
| Vite 7 | Build tool | Existente |
| Tailwind CSS + shadcn/ui | Styling y componentes | Existente |
| Zustand | State management | Existente |
| TanStack Query | Data fetching y cache | Existente |
| React Router DOM 6 | Routing | Existente |
| Recharts | Gráficas | Existente |

> El frontend existente se mantiene y se conecta a la API real. No se migra a Next.js en el MVP.

### Backend

| Tecnología | Rol |
|------------|-----|
| **FastAPI** | Framework API principal |
| **Python 3.12+** | Lenguaje |
| **SQLAlchemy (async)** | ORM con soporte async |
| **Alembic** | Migraciones de base de datos |
| **Pydantic v2** | Validación de datos y schemas |
| **asyncpg** | Driver PostgreSQL async |
| **python-jose** | JWT para autenticación |
| **Redis** | Event bus MVP + cache |
| **Celery** | Tareas asíncronas (workflows) |
| **Uvicorn** | ASGI server |

### Base de datos

| Tecnología | Rol |
|------------|-----|
| **PostgreSQL 16** | Base de datos transaccional principal |
| **JSONB** | Payloads flexibles en eventos y configuraciones |
| **pgvector** | Vector search (cuando se active la capa AI) |

### Infraestructura

| Tecnología | Rol |
|------------|-----|
| **Docker + Docker Compose** | Contenedores para todos los servicios |
| **Dokploy** | Self-hosted PaaS en VPS — deployment, SSL, dominios |
| **Traefik** | Reverse proxy (incluido en Dokploy) |
| **Redis 7** | Event bus del MVP y cache |
| **Nginx** | Serve del frontend en producción |

### Capa AI (se activa en Fase 5)

| Tecnología | Rol |
|------------|-----|
| **Claude API (Anthropic)** | AI Discovery Assistant |
| **MCP Protocol** | Integración de herramientas AI |
| **pgvector** | Embeddings y búsqueda semántica |

### Capa Knowledge (post-MVP)

| Tecnología | Rol |
|------------|-----|
| Neo4j o GraphDB | Knowledge graph semántico |
| NATS / Redpanda | Event backbone escalable (reemplaza Redis Streams) |

---

## 4. Arquitectura del sistema

### Capas arquitectónicas

```
┌─────────────────────────────────────────────────────────────┐
│                    EXPERIENCE LAYER                         │
│     Portal Builder · Admin Dashboard · POS Interface        │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP / WebSocket
┌────────────────────────────▼────────────────────────────────┐
│                  OPERATIONAL MODULES                        │
│  CRM · Sales Builder · Inventory · Portal · Discovery       │
└────────────────────────────┬────────────────────────────────┘
                             │ Capabilities
┌────────────────────────────▼────────────────────────────────┐
│                   CAPABILITY LAYER                          │
│  lead_capture · pipeline_mgmt · quote_gen · order_mgmt      │
└────────────────────────────┬────────────────────────────────┘
                             │ Events
┌────────────────────────────▼────────────────────────────────┐
│                 ORCHESTRATION LAYER                         │
│      Event Bus (Redis) · Workflow Engine · Notifications    │
└─────────┬───────────────────────────────────────┬───────────┘
          │                                       │
┌─────────▼──────────┐               ┌────────────▼──────────┐
│  KNOWLEDGE LAYER   │               │  INTELLIGENCE LAYER   │
│  Graph · Semantic  │               │  MCP Hub · AI Agents  │
│  Context · Search  │               │  Decision Engine      │
└─────────┬──────────┘               └────────────┬──────────┘
          │                                       │
┌─────────▼───────────────────────────────────────▼──────────┐
│                  INFRASTRUCTURE LAYER                       │
│   PostgreSQL · Redis · API Gateway · Auth · Observability   │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de datos canónico

```
Acción de usuario
      ↓
  API Request
      ↓
  Módulo de dominio (FastAPI router)
      ↓
  Write transaccional (PostgreSQL)
      ↓
  Evento emitido (Redis Streams)
      ↓
  Consumidores del evento reaccionan
      ↓
  Analytics / Workflow / Notificación / Graph sync
      ↓
  UI actualizada o workflow disparado
```

### Loops de feedback (el valor real)

```
Loop A — Operacional:
Transacción → Evento → Analytics → Recomendación → Ajuste de workflow

Loop B — Descubrimiento:
Pain Point → Capability Match → Composición → Provisioning → Adopción → Mejor recomendación

Loop C — Inteligencia:
Dato operacional → Contexto semántico → AI output → Mejor decisión
```

---

## 5. Estructura del repositorio

```
cbos-platform/
│
├── composable-os/              ← Frontend React/Vite (existente)
│   ├── src/
│   │   ├── pages/              ← 32 módulos UI
│   │   ├── components/
│   │   ├── stores/
│   │   └── hooks/
│   ├── package.json
│   └── Dockerfile
│
├── backend/                    ← FastAPI modular monolith (NUEVO)
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py       ← Settings (env vars)
│   │   │   ├── database.py     ← SQLAlchemy async engine
│   │   │   ├── security.py     ← JWT auth
│   │   │   └── deps.py         ← FastAPI dependencies
│   │   │
│   │   ├── events/
│   │   │   ├── bus.py          ← Redis Streams publisher/consumer
│   │   │   ├── types.py        ← Definición de eventos canónicos
│   │   │   └── handlers/       ← Handlers por dominio
│   │   │
│   │   ├── capabilities/       ← Lógica reutilizable compartida
│   │   │   ├── lead_capture.py
│   │   │   ├── pipeline_mgmt.py
│   │   │   ├── quote_generation.py
│   │   │   └── inventory_visibility.py
│   │   │
│   │   └── modules/
│   │       ├── identity/       ← users, workspaces, auth
│   │       │   ├── models.py
│   │       │   ├── schemas.py
│   │       │   ├── service.py
│   │       │   └── router.py
│   │       │
│   │       ├── crm/            ← leads, opportunities, contacts
│   │       │   ├── models.py
│   │       │   ├── schemas.py
│   │       │   ├── service.py
│   │       │   └── router.py
│   │       │
│   │       ├── sales/          ← quotes, sales orders
│   │       │   ├── models.py
│   │       │   ├── schemas.py
│   │       │   ├── service.py
│   │       │   └── router.py
│   │       │
│   │       ├── inventory/      ← products, stock, movements
│   │       │   ├── models.py
│   │       │   ├── schemas.py
│   │       │   ├── service.py
│   │       │   └── router.py
│   │       │
│   │       ├── portal/         ← portal pages, customer access
│   │       │   ├── models.py
│   │       │   ├── schemas.py
│   │       │   ├── service.py
│   │       │   └── router.py
│   │       │
│   │       └── discovery/      ← Solution Discovery Engine
│   │           ├── models.py
│   │           ├── schemas.py
│   │           ├── service.py
│   │           ├── router.py
│   │           ├── capability_registry.py
│   │           └── ai_assistant.py
│   │
│   ├── alembic/                ← Migraciones de BD
│   │   ├── versions/
│   │   └── env.py
│   │
│   ├── main.py                 ← Entry point FastAPI
│   ├── requirements.txt
│   └── Dockerfile
│
├── infrastructure/
│   ├── docker-compose.yml      ← Desarrollo local
│   ├── docker-compose.prod.yml ← Producción en Dokploy
│   └── nginx/
│       └── nginx.conf
│
├── schemas/                    ← JSON Schemas de eventos canónicos
│   └── events/
│
├── docs/                       ← Documentación estratégica (existente)
│   ├── CBOS_Construction_Plan.md   ← Este documento
│   └── ...
│
└── README.md
```

---

## 6. MVP Wedge — Alcance exacto

### El problema que resuelve

Las empresas PYME pierden ingresos porque **ventas, operaciones e inventario no están conectados**.

Síntomas típicos:
- Leads que llegan pero nadie da seguimiento
- Cotizaciones creadas manualmente en Excel o email
- Pedidos que no coinciden con el inventario disponible
- Ventas online y tienda física desalineadas
- Sin visibilidad del pipeline comercial
- Forecasting inexistente

### Los 5 módulos del wedge

```
1. Solution Discovery Engine   ← Diagnóstico AI de necesidades del cliente
2. CRM Builder                 ← Pipeline de ventas y gestión de oportunidades
3. Intelligent Sales Builder   ← Cotizaciones y órdenes de venta
4. Inventory & Order Builder   ← Catálogo, stock y reservas
5. Portal Builder              ← Portal del cliente para aceptar propuestas
```

### El flujo end-to-end que demuestra la arquitectura

```
Lead capturado en portal
        ↓
Discovery Engine diagnostica necesidades
        ↓
CRM crea oportunidad
        ↓
Sales Builder genera cotización
        ↓
Cliente acepta en su portal
        ↓
SalesOrder creado automáticamente
        ↓
Inventario reservado via evento
        ↓
Portal muestra estado del pedido
        ↓
Revenue registrado
```

### Las 3 cosas que demuestra el MVP

1. **Capabilities componibles** — El sistema activa capacidades según necesidad del cliente
2. **Event-driven orchestration** — Todos los módulos se comunican mediante eventos
3. **AI-assisted discovery** — El sistema ayuda a diagnosticar necesidades en el onboarding

---

## 7. Fases de construcción

### Visión general del timeline

| Fase | Nombre | Duración | Resultado |
|------|--------|----------|-----------|
| 0 | Fundación de infraestructura | 2 semanas | Stack completo corriendo en VPS |
| 1 | CRM real | 2 semanas | Pipeline Kanban con datos reales en PostgreSQL |
| 2 | Sales Builder | 2 semanas | Cotizaciones PDF generadas desde oportunidades |
| 3 | Inventory & Orders | 2 semanas | Stock real con reservas automáticas por evento |
| 4 | Portal Builder | 2 semanas | Cliente acepta cotización en su portal |
| 5 | Solution Discovery Engine | 3 semanas | Onboarding inteligente con AI |
| 6 | Workflow Engine | 2 semanas | Automatizaciones entre módulos por eventos |
| 7 | Producción y primeros clientes | 1 semana | Primer cliente real onboardeado |

**Total estimado: 16 semanas**

---

### Fase 0 — Fundación de infraestructura

**Objetivo:** Todo el stack corriendo localmente y en el VPS con Dokploy.

#### Entregables

- [ ] Inicializar git en `cbos-platform/` (root del monorepo)
- [ ] Crear `backend/` con estructura FastAPI modular
- [ ] `docker-compose.yml` para desarrollo: PostgreSQL + Redis + backend + frontend
- [ ] `docker-compose.prod.yml` para Dokploy
- [ ] Configurar Alembic con primera migración
- [ ] Implementar auth JWT (login, refresh token, middleware de workspace)
- [ ] Modelos base: `Workspace`, `User`, `Person`, `Organization`
- [ ] Desplegar stack en Dokploy (VPS)
- [ ] Configurar variables de entorno del frontend para apuntar a la API
- [ ] Health check endpoints en FastAPI

#### Decisiones técnicas de la Fase 0

```python
# Dependencias core
fastapi==0.115+
uvicorn[standard]
sqlalchemy[asyncio]
asyncpg
alembic
pydantic==2.*
python-jose[cryptography]
passlib[bcrypt]
redis[asyncio]
python-dotenv
```

#### Estructura de auth JWT

- `POST /auth/login` → devuelve `access_token` + `refresh_token`
- `POST /auth/refresh` → renueva access token
- `POST /auth/register` → crea workspace + user inicial
- Header: `Authorization: Bearer <token>`
- Payload del token incluye: `user_id`, `workspace_id`, `role`

---

### Fase 1 — CRM real

**Objetivo:** El pipeline Kanban del frontend conectado a datos reales en PostgreSQL. Eliminar todo el mock data.

#### Entregables

- [ ] Modelos: `Lead`, `Opportunity`, `Contact` (extensión de Person), `CustomerAccount`
- [ ] API CRM completa:
  - `GET/POST /crm/leads`
  - `GET/POST/PATCH /crm/opportunities`
  - `PATCH /crm/opportunities/{id}/stage` — cambia etapa del pipeline
  - `GET /crm/contacts`
  - `GET /crm/organizations`
- [ ] Eventos emitidos:
  - `LeadCaptured`
  - `OpportunityCreated`
  - `OpportunityStageChanged`
  - `OpportunityWon`
  - `OpportunityLost`
- [ ] Conectar `CRM.tsx` del frontend a la API real
- [ ] Eliminar mock data del `useCRMStore.ts`
- [ ] Multi-tenant: `workspace_id` en todos los modelos

#### Capacidades implementadas

- `lead_capture`
- `pipeline_management`
- `customer_tracking`

---

### Fase 2 — Sales Builder

**Objetivo:** Generar cotizaciones reales desde el pipeline CRM con generación de PDF.

#### Entregables

- [ ] Modelos: `Quote`, `QuoteLine`, `SalesOrder`
- [ ] API Sales:
  - `POST /sales/quotes` — crear desde opportunity
  - `PATCH /sales/quotes/{id}/send` — enviar al cliente
  - `PATCH /sales/quotes/{id}/accept` — cliente acepta
  - `PATCH /sales/quotes/{id}/reject`
  - `GET/POST /sales/orders`
- [ ] Generación de PDF de cotización (WeasyPrint o ReportLab)
- [ ] Eventos emitidos:
  - `QuoteCreated`
  - `QuoteSent`
  - `QuoteAccepted`
  - `QuoteRejected`
  - `SalesOrderCreated`
- [ ] Conectar `SalesBuilder.tsx` del frontend a la API real

#### Capacidades implementadas

- `quote_generation`
- `approval_workflows` (básico)
- `revenue_tracking` (inicio)

---

### Fase 3 — Inventory & Orders

**Objetivo:** Inventario real con reservas automáticas disparadas por evento al aceptarse una cotización.

#### Entregables

- [ ] Modelos: `Product`, `ProductVariant`, `ProductCategory`, `InventoryItem`, `StockMovement`
- [ ] API Inventory:
  - `GET/POST /inventory/products`
  - `GET /inventory/stock` — niveles de stock por ubicación
  - `POST /inventory/movements` — registrar movimiento
  - `POST /inventory/reserve` — reservar stock para un orden
- [ ] Consumer del evento `SalesOrderCreated` → reserva inventario automáticamente
- [ ] Alerta automática cuando stock baja del threshold
- [ ] Eventos emitidos:
  - `InventoryReserved`
  - `InventoryReleased`
  - `StockMovementRecorded`
  - `InventoryLowThresholdDetected`
- [ ] Conectar `InventoryOrders.tsx` del frontend a la API real

#### Capacidades implementadas

- `product_catalog`
- `inventory_visibility`
- `order_management`
- `stock_tracking`

---

### Fase 4 — Portal Builder

**Objetivo:** Portal funcional donde el cliente accede con un link único, ve su cotización y la acepta.

#### Entregables

- [ ] Auth de cliente por token de acceso (sin cuenta interna requerida)
- [ ] Modelos: `PortalPage`, `PortalSession`
- [ ] API Portal:
  - `POST /portal/access` — generar link de acceso para cliente
  - `GET /portal/quote/{token}` — ver cotización en portal
  - `POST /portal/quote/{token}/accept`
  - `GET /portal/order/{token}` — estado del pedido
- [ ] UI del portal (ruta separada `/portal` en el frontend)
- [ ] Email de notificación al cliente con link al portal
- [ ] Eventos emitidos:
  - `PortalSessionStarted`
  - `QuoteAccepted` (desde portal del cliente)
  - `CustomerActionPerformed`

#### Flujo completo del portal

```
Vendedor crea quote → Sistema genera link de portal
        ↓
Cliente recibe email con link único
        ↓
Cliente abre portal → ve cotización detallada
        ↓
Cliente acepta → evento QuoteAccepted
        ↓
Sistema crea SalesOrder automáticamente
        ↓
Inventario se reserva via evento
        ↓
Portal muestra: "Tu pedido está confirmado"
```

#### Capacidades implementadas

- `portal_access`
- `intake_experience` (básico)

---

### Fase 5 — Solution Discovery Engine

**Objetivo:** El módulo más diferenciador. Convierte el onboarding en un proceso de diagnóstico inteligente.

#### Entregables MVP 1 — Rule-based (semanas 1-2)

- [ ] Modelos: `DiscoverySession`, `PainPoint`, `SolutionRecommendation`, `TenantBlueprint`
- [ ] API Discovery:
  - `POST /discovery/sessions` — iniciar sesión de discovery
  - `POST /discovery/sessions/{id}/pain-points` — registrar pain points
  - `GET /discovery/sessions/{id}/recommendations` — obtener recomendación
  - `POST /discovery/sessions/{id}/approve` — aprobar blueprint
  - `POST /discovery/workspaces/bootstrap` — provisionar workspace
- [ ] Intake wizard en el frontend (formulario adaptativo multi-paso)
- [ ] Pain point analyzer con taxonomía: `Acquire, Convert, Deliver, Operate, Retain, Analyze, Automate`
- [ ] Capability matching engine (reglas determinísticas en esta fase)
- [ ] Solution Composer — genera paquetes: `Starter`, `Growth`, `Operations Plus`
- [ ] Workspace Bootstrap: activa módulos vía feature flags al aprobar el blueprint
- [ ] Eventos:
  - `DiscoverySessionStarted`
  - `PainPointDetected`
  - `CapabilityMatched`
  - `SolutionComposed`
  - `BlueprintGenerated`
  - `WorkspaceActivated`

#### Entregables MVP 2 — AI Assistant (semana 3)

- [ ] Integración con Claude API (Anthropic) vía MCP Hub básico
- [ ] AI Discovery Assistant — hace preguntas adaptativas al cliente
- [ ] Clasifica respuestas y detecta pain points automáticamente
- [ ] Genera recomendaciones enriquecidas con contexto AI

#### Preguntas del AI Assistant

```
- ¿Dónde están perdiendo leads actualmente?
- ¿Qué procesos siguen siendo manuales?
- ¿Ventas e inventario están sincronizados?
- ¿Operan online, físico o ambos canales?
- ¿Cuál es el principal cuello de botella operativo hoy?
- ¿Tienen visibilidad del pipeline de ventas en tiempo real?
```

#### Capacidades implementadas

- `discovery_diagnosis`
- `capability_matching`
- `workspace_bootstrap`
- `recommendation_logic`
- `AI_classification` (MVP 2)

---

### Fase 6 — Workflow Engine

**Objetivo:** Automatizaciones reales disparadas por eventos entre módulos.

#### Entregables

- [ ] Redis Streams como event backbone (reemplaza pub/sub simple)
- [ ] Modelos: `WorkflowDefinition`, `WorkflowRun`, `WorkflowStep`
- [ ] API Workflows:
  - `GET/POST /workflows/definitions`
  - `GET /workflows/runs`
  - `POST /workflows/definitions/{id}/trigger`
- [ ] Workflows del MVP implementados:

| Trigger | Acción automática |
|---------|-------------------|
| `LeadCaptured` | Notificar al equipo de ventas |
| `QuoteAccepted` | Crear SalesOrder + reservar inventario |
| `InventoryLowThresholdDetected` | Alerta + solicitud de reabastecimiento |
| `DiscoveryCompleted` | Actualizar opportunity en CRM |
| `WorkspaceActivated` | Crear tareas de onboarding para el cliente |

- [ ] Dashboard de workflows activos en frontend
- [ ] Historial de ejecuciones con estado y errores

---

### Fase 7 — Producción y primeros clientes

**Objetivo:** Primer cliente real onboardeado. Sistema estable en producción.

#### Entregables

- [ ] Multi-tenant completo: cada cliente tiene su `workspace_id` aislado
- [ ] Feature flags por workspace (activa/desactiva módulos por plan)
- [ ] Backups automáticos de PostgreSQL (script en Dokploy)
- [ ] Logs estructurados (JSON) para todos los servicios
- [ ] Health check endpoints con status de todos los servicios
- [ ] HTTPS + dominio personalizado configurado en Dokploy
- [ ] Documentación de API auto-generada (FastAPI Swagger en `/docs`)
- [ ] Primer cliente onboardeado via Solution Discovery Engine
- [ ] Runbook de operaciones básico

---

## 8. Modelo de datos del MVP

### Entidades canónicas y sus módulos dueños

```
IDENTITY (Módulo: identity)
├── Workspace          id, organization_id, plan, active_modules, feature_flags
├── User               id, person_id, workspace_id, role, permissions, auth_status
├── Person             id, full_name, email, phone, role_labels, status
└── Organization       id, legal_name, brand_name, type, industry, country, status

CRM (Módulo: crm)
├── Lead               id, workspace_id, source, status, pain_points, score, captured_at
├── Opportunity        id, workspace_id, stage, value_estimate, probability, expected_close_date
└── CustomerAccount    id, workspace_id, lifecycle_stage, health_score, account_owner

SALES (Módulo: sales)
├── Quote              id, workspace_id, opportunity_id, version, status, subtotal, total, expires_at
├── QuoteLine          id, quote_id, product_id, quantity, unit_price, discount
└── SalesOrder         id, workspace_id, quote_id, status, channel, ordered_at, total_amount

INVENTORY (Módulo: inventory)
├── Product            id, workspace_id, sku, name, type, price, status
├── ProductVariant     id, product_id, attributes, price_override, barcode
├── InventoryItem      id, product_id, location_id, quantity_on_hand, quantity_reserved, reorder_point
└── StockMovement      id, inventory_item_id, movement_type, quantity, reason, created_at

PORTAL (Módulo: portal)
├── PortalPage         id, workspace_id, name, route, visibility_rule, status
└── PortalSession      id, workspace_id, customer_token, entity_type, entity_id, expires_at

DISCOVERY (Módulo: discovery)
├── DiscoverySession      id, workspace_id, account_id, status, readiness_score, summary
├── PainPoint             id, session_id, category, severity, confidence_score, description
├── SolutionRecommendation id, session_id, name, rationale, expected_outcome, complexity_level
└── TenantBlueprint       id, workspace_id, enabled_modules, enabled_features, default_workflows

ORCHESTRATION
├── WorkflowDefinition    id, workspace_id, name, trigger_event, status, version
└── WorkflowRun           id, definition_id, status, started_at, completed_at, error
```

### Relaciones clave del flujo MVP

```
Lead → converts_to → Opportunity
Opportunity → results_in → Quote
Quote → accepted_as → SalesOrder
SalesOrder → reserves → InventoryItem
DiscoverySession → detects → PainPoint
PainPoint → matched_to → Capability
SolutionRecommendation → provisions → TenantBlueprint
```

---

## 9. Catálogo de eventos del MVP

### Estructura estándar de evento

```json
{
  "event_id": "uuid",
  "event_type": "LeadCaptured",
  "event_version": "1.0",
  "timestamp": "2026-03-14T12:00:00Z",
  "source_module": "portal",
  "workspace_id": "ws_001",
  "actor_id": "user_001",
  "entity_id": "lead_001",
  "payload": {}
}
```

### Eventos por dominio

#### Acquisition & Discovery
| Evento | Fuente | Consumidores |
|--------|--------|--------------|
| `LeadCaptured` | portal | crm, workflow |
| `DiscoverySessionStarted` | discovery | crm |
| `PainPointDetected` | discovery | discovery |
| `CapabilityMatched` | discovery | discovery |
| `SolutionComposed` | discovery | crm |
| `BlueprintGenerated` | discovery | identity |
| `WorkspaceActivated` | identity | workflow, crm |

#### CRM & Revenue
| Evento | Fuente | Consumidores |
|--------|--------|--------------|
| `OpportunityCreated` | crm | sales, analytics |
| `OpportunityStageChanged` | crm | analytics, workflow |
| `OpportunityWon` | crm | sales, analytics |
| `OpportunityLost` | crm | analytics |

#### Sales & Commerce
| Evento | Fuente | Consumidores |
|--------|--------|--------------|
| `QuoteCreated` | sales | portal |
| `QuoteSent` | sales | portal, workflow |
| `QuoteAccepted` | portal | sales, inventory |
| `QuoteRejected` | portal | crm |
| `SalesOrderCreated` | sales | inventory, portal |
| `SalesOrderConfirmed` | inventory | portal, analytics |

#### Inventory & Fulfillment
| Evento | Fuente | Consumidores |
|--------|--------|--------------|
| `InventoryReserved` | inventory | sales, portal |
| `StockMovementRecorded` | inventory | analytics |
| `InventoryLowThresholdDetected` | inventory | workflow, notifications |

#### Workflow & Platform
| Evento | Fuente | Consumidores |
|--------|--------|--------------|
| `WorkflowTriggered` | orchestration | workflow |
| `WorkflowCompleted` | orchestration | analytics |
| `WorkflowFailed` | orchestration | notifications |

---

## 10. Registro de capacidades del MVP

Las 10 capacidades del MVP wedge y sus implementaciones:

| Capability ID | Descripción | Módulo dueño | Fase |
|---------------|-------------|--------------|------|
| `lead_capture` | Capturar leads desde portal, formularios | portal, crm | Fase 1 |
| `pipeline_management` | Gestionar etapas del pipeline comercial | crm | Fase 1 |
| `customer_tracking` | Seguimiento de cuentas y contactos | crm | Fase 1 |
| `quote_generation` | Generar cotizaciones y propuestas | sales | Fase 2 |
| `order_management` | Crear y gestionar órdenes de venta | sales | Fase 2 |
| `product_catalog` | Mantener catálogo de productos y servicios | inventory | Fase 3 |
| `inventory_visibility` | Visibilidad de stock en tiempo real | inventory | Fase 3 |
| `portal_access` | Acceso de clientes a portales | portal | Fase 4 |
| `discovery_diagnosis` | Diagnosticar pain points del cliente | discovery | Fase 5 |
| `capability_matching` | Mapear pain points a capacidades | discovery | Fase 5 |
| `workspace_bootstrap` | Provisionar workspace inicial | discovery, identity | Fase 5 |
| `workflow_automation` | Automatizar procesos via eventos | orchestration | Fase 6 |
| `revenue_tracking` | Registrar y monitorear ingresos | sales, analytics | Fase 6 |

---

## 11. Infraestructura y deployment

### Docker Compose — Desarrollo local

```yaml
# docker-compose.yml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: cbos_dev
      POSTGRES_USER: cbos
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    command: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    environment:
      DATABASE_URL: postgresql+asyncpg://cbos:${POSTGRES_PASSWORD}@postgres:5432/cbos_dev
      REDIS_URL: redis://redis:6379
      SECRET_KEY: ${SECRET_KEY}
      ENVIRONMENT: development
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app

  frontend:
    build: ./composable-os
    command: npm run dev
    environment:
      VITE_API_URL: http://localhost:8000
    ports:
      - "8080:8080"
    volumes:
      - ./composable-os:/app

volumes:
  postgres_data:
```

### Docker Compose — Producción (Dokploy)

```yaml
# docker-compose.prod.yml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

  redis:
    image: redis:7-alpine
    restart: always

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      SECRET_KEY: ${SECRET_KEY}
      ENVIRONMENT: production
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS}
    depends_on:
      - postgres
      - redis
    restart: always
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.backend.rule=Host(`api.tudominio.com`)"
      - "traefik.http.routers.backend.tls=true"

  frontend:
    build:
      context: ./composable-os
      dockerfile: Dockerfile
    restart: always
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`app.tudominio.com`)"
      - "traefik.http.routers.frontend.tls=true"

volumes:
  postgres_data:
```

### Configuración en Dokploy

```
Servicios expuestos:
  api.tudominio.com    → backend:8000  (FastAPI)
  app.tudominio.com    → frontend:80   (Nginx + React build)

Variables de entorno en Dokploy:
  DATABASE_URL
  REDIS_URL
  SECRET_KEY
  ANTHROPIC_API_KEY  (Fase 5)
  ALLOWED_ORIGINS
  ENVIRONMENT=production
```

### Variables de entorno necesarias

```bash
# Backend
DATABASE_URL=postgresql+asyncpg://user:pass@postgres:5432/cbos
REDIS_URL=redis://redis:6379
SECRET_KEY=<random-256-bit>
ENVIRONMENT=production
ALLOWED_ORIGINS=https://app.tudominio.com
ANTHROPIC_API_KEY=<claude-api-key>  # Fase 5

# Frontend
VITE_API_URL=https://api.tudominio.com
```

---

## 12. Métricas de éxito del MVP

### Métricas técnicas

| Métrica | Objetivo |
|---------|----------|
| Latencia API P95 | < 300ms |
| Uptime del sistema | > 99.5% |
| Tiempo de migración de BD | < 30 segundos |
| Build del frontend | < 2 minutos |
| Deploy completo en Dokploy | < 5 minutos |

### Métricas de negocio (por cliente)

| Métrica | Objetivo |
|---------|----------|
| Tiempo de activación de workspace | < 30 minutos |
| Tiempo para generar primera cotización | < 5 minutos |
| Conversión quote → sales order | Medible y visible |
| Sincronización ventas-inventario | En tiempo real via eventos |
| Flujo Lead → Revenue end-to-end | 100% funcional |

### Criterios de "MVP listo para clientes reales"

- [ ] Flujo completo Lead → Revenue funciona sin errores
- [ ] Al menos 1 cliente piloto onboardeado via Solution Discovery Engine
- [ ] Datos persistentes en PostgreSQL (no mock data)
- [ ] Multi-tenant funcional (clientes aislados por workspace_id)
- [ ] HTTPS en producción
- [ ] Backups automáticos de BD configurados
- [ ] Al menos 1 workflow automático funcionando (QuoteAccepted → SalesOrder)

---

## 13. Roadmap post-MVP

### Fase 2 post-MVP — Revenue Intelligence

- **RevPath Builder** — revenue stages avanzado y forecasting
- **Analytics Dashboard** — métricas de negocio reales
- **Workflow Builder** — editor visual de automatizaciones
- **Pricing Engine** — reglas de precios y descuentos

### Fase 3 post-MVP — Commerce completo

- **Warehouse Builder** — gestión de almacenes
- **POS Builder** — punto de venta físico
- **Appointment Builder** — sistema de reservas
- **Event Builder** — gestión de eventos
- **Contract Studio** — contratos programables

### Fase 4 post-MVP — Intelligence Layer completo

- **Decision Intelligence Engine** — scoring, recomendaciones, forecasting
- **Monte Carlo Simulation** — análisis probabilístico de escenarios
- **Synaptic System Modeler** — visualización arquitectónica viva del sistema
- **Knowledge Graph completo** — Neo4j/GraphDB con UKIP
- **AI Agents avanzados** — agentes especializados por dominio

### Visión de largo plazo (Año 2-3)

- Marketplace de capacidades y extensiones
- Ecosistema de partners e integradores
- APIs públicas para integraciones externas
- Multi-tenancy enterprise con planes y facturación
- Expansión internacional

---

## 14. Lo que NO construir todavía

La disciplina de construcción es tan importante como el plan mismo.

| Componente | Por qué espera |
|------------|----------------|
| Knowledge Graph (Neo4j) | Requiere flujos operacionales vivos para tener valor |
| Monte Carlo Simulation | Necesita datos reales acumulados |
| Synaptic System Modeler completo | Herramienta para observar un sistema que aún no existe |
| IoT Builder | Fuera del wedge inicial |
| Marketplace de capacidades | Requiere plataforma estable y múltiples módulos maduros |
| Multi-tenant avanzado (planes, billing) | MVP usa feature flags simples |
| AI Agents complejos | MCP Hub básico es suficiente para Discovery Engine |
| Microservicios | El monolith modular es la arquitectura correcta hasta que haya presión real |
| Migración a Next.js | El frontend actual (Vite/React) funciona para el MVP |
| NATS/Kafka | Redis Streams es suficiente para el volumen del MVP |

> **Regla de oro:** Si no sirve al flujo Lead → Revenue del MVP wedge, espera.

---

## Referencias

| Documento | Descripción |
|-----------|-------------|
| `Composable Business Operating System.md` | Visión estratégica y principios |
| `Wedge inicial exacto del MVP.md` | Definición exacta del MVP wedge |
| `EIGOS_Technical_Architecture_Blueprint.md` | Blueprint técnico detallado |
| `CBOS_Definitive_Capability_Registry.md` | Registro completo de capacidades |
| `CBOS_Master_Event_Catalog.md` | Catálogo completo de eventos |
| `EIGOS_Domain_Model_Reference.md` | Modelo de dominio completo |
| `CBOS_Solution_Discovery_Engine_Module.md` | Spec del módulo más diferenciador |
| `CBOS_Valoracion_senior_engineer.md` | Evaluación crítica de la visión |
| `CBOS_12M_Technical_Roadmap.md` | Roadmap técnico de 12 meses |

---

*Este documento es la guía maestra de construcción. Para la planificación operativa detallada, se derivan Sprints de 2 semanas a partir de cada Fase definida aquí.*
