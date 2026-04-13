# CBOS — Composable Business Operating System

> Plataforma de gestión empresarial modular, event-driven y AI-native para PYMEs.

![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)

---

## Tabla de contenidos

1. [Overview](#overview)
2. [Stack técnico](#stack-técnico)
3. [Módulos implementados](#módulos-implementados)
4. [Estructura del repositorio](#estructura-del-repositorio)
5. [Inicio rápido](#inicio-rápido)
6. [Desarrollo sin Docker](#desarrollo-sin-docker)
7. [Tests](#tests)
8. [Migraciones de base de datos](#migraciones-de-base-de-datos)
9. [Deploy en producción](#deploy-en-producción-dokploy)
10. [Variables de entorno](#variables-de-entorno)
11. [Documentación](#documentación)

---

## Overview

CBOS es una plataforma de gestión empresarial composable: cada capacidad de negocio — CRM, ventas, inventario, facturación, portal del cliente — es un módulo independiente que se integra mediante un bus de eventos común. Las empresas activan las capacidades que necesitan, no un paquete rígido.

El sistema está construido como un **monolito modular** con límites de dominio explícitos — no microservicios prematuros. El event bus (Redis Streams) desacopla los módulos y alimenta el motor de workflows y las notificaciones en tiempo real. La IA (Anthropic Claude API) es infraestructura transversal disponible para cualquier módulo, no un addon.

**Estado actual:** MVP operativo en producción — 9 módulos Tier 1 + analytics cross-módulo cubriendo el flujo completo:

```
Discovery → Lead → Opportunity → Quote → Order → Inventory → Portal → Invoice → Payment
```

**360 tests** (unitarios + contrato + integración + e2e) en 30 archivos. Dashboard con datos reales (facturación, pipeline CRM, operaciones).

---

## Stack técnico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | React + TypeScript + Vite + Tailwind CSS + shadcn/ui | 18.3 / 5.x / 7.3 |
| Backend | FastAPI + SQLAlchemy (async) + asyncpg | Python 3.12 |
| Base de datos | PostgreSQL + Alembic (migrations) | 16 |
| Cache / Events | Redis Streams | 7 |
| Proxy local | Nginx | 1.27-alpine |
| Deploy | Docker Compose + Dokploy (Traefik + Let's Encrypt) | — |

**Frontend adicional:** TanStack React Query 5, React Router 6, React Hook Form + Zod, Zustand, Recharts, Sonner.

---

## Módulos implementados

9 módulos activos en `backend/app/modules/` — todos Tier 1 (6/6 en maturity scorecard):

| Módulo | Descripción | Tests |
|--------|-------------|-------|
| **Identity** | Auth JWT, registro, usuarios, workspaces, roles | Contract + integration |
| **CRM** | Leads, Opportunities (kanban: new → qualified → proposal → negotiation → won/lost), Activities | Contract + integration + e2e |
| **Sales** | Cotizaciones con líneas, SalesOrders, conversión Quote → Order | Contract + integration + e2e |
| **Inventory** | Catálogo de productos, stock por ubicación, movimientos, reservas, alertas de stock bajo | Contract + integration |
| **Portal** | Portal del cliente: cotizaciones públicas, aceptación vía token, sesiones | Contract + integration + e2e |
| **Discovery** | Solution Discovery AI — diagnóstico de necesidades vía Anthropic Claude API, blueprints | Contract + integration + e2e |
| **Workflows** | Motor de automatización event-driven (Redis Streams), acciones condicionales, DLQ | Contract + integration + consumer |
| **Notifications** | Email transaccional + WebSocket tiempo real, preferencias por usuario | Contract + integration + e2e pipeline |
| **Accounting** | Facturación completa: invoices, pagos parciales/totales, auto-invoice, overdue scanner | Contract + integration + e2e |

**Cross-módulo:**
- **Analytics** — 3 endpoints de agregación (summary, revenue time-series, pipeline breakdown). 24 tests.
- **Event bus** — 14+ tipos de eventos, consumers dedicados (workflow, invoice, notification).

Documentación detallada por módulo: [`docs/capabilities/`](docs/capabilities/).

---

## Estructura del repositorio

```
cbos-platform/
├── backend/                        FastAPI modular monolith (Python 3.12)
│   ├── app/
│   │   ├── core/                   Config, deps, middleware, event bus, security
│   │   ├── events/                 Bus de eventos (Redis Streams), tipos de eventos
│   │   ├── modules/                9 módulos de negocio + analytics
│   │   │   ├── identity/           Auth, usuarios, workspaces
│   │   │   ├── crm/                Leads, opportunities, activities
│   │   │   ├── sales/              Quotes, sales orders
│   │   │   ├── inventory/          Productos, stock, movimientos
│   │   │   ├── portal/             Portal del cliente
│   │   │   ├── discovery/          Discovery AI (Anthropic)
│   │   │   ├── workflows/          Motor de automatización
│   │   │   ├── notifications/      Email + WebSocket
│   │   │   ├── accounting/         Facturación, pagos, overdue scanner
│   │   │   └── analytics/          Agregación cross-módulo
│   │   └── main.py                 Lifespan, routers, CORS, background tasks
│   ├── tests/                      360 tests (pytest-asyncio)
│   ├── alembic/                    Migraciones de base de datos
│   └── requirements.txt
├── composable-os/                  React 18 + Vite frontend
│   └── src/
│       ├── pages/                  10 páginas activas (Dashboard, CRM, Sales, Inventory…)
│       ├── services/               API clients (fetch + React Query)
│       ├── components/             shadcn/ui + componentes custom
│       └── lib/                    Auth, API wrapper, utilidades
├── nginx/
│   ├── local-http.conf             Dev HTTP (activo por defecto via override)
│   └── local-ssl.conf              Dev SSL (requiere mkcert -install)
├── docs/                           Arquitectura, ADRs, specs de capacidades
│   ├── adr/                        12 Architecture Decision Records
│   └── capabilities/               Spec por módulo (9 archivos)
├── .github/workflows/ci.yml       CI pipeline (pytest en push/PR)
├── docker-compose.yml              Servicios base compartidos
├── docker-compose.override.yml     Dev local (auto-merge, HTTP, puerto 80)
└── docker-compose.prod.yml         Producción (Dokploy)
```

> **Docker Compose override:** `docker-compose.override.yml` se fusiona automáticamente con `docker-compose.yml`. Activa modo HTTP local, expone puerto 80 y configura `VITE_API_URL`. Para producción, Dokploy usa `docker-compose.prod.yml` de forma explícita.

---

## Inicio rápido

### Prerrequisitos

- Docker Desktop (o Docker Engine + Compose plugin)
- Git

### Pasos

```bash
git clone https://github.com/keilynrp/cbos-platform.git
cd cbos-platform

cp .env.example .env          # defaults funcionan para dev — no requiere editar

docker compose up --build

# Primera vez: aplicar migraciones
docker compose exec backend alembic upgrade head
```

Abrir **http://localhost** — la app está lista.

### URLs locales

| Servicio | URL |
|----------|-----|
| App (Frontend + API via nginx) | http://localhost |
| Backend API directo | http://localhost:8000 |
| Swagger / API Docs | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |
| Health check | http://localhost:8000/health |
| PostgreSQL | `localhost:5433` |
| Redis | `localhost:6380` |

> Los puertos de PostgreSQL (5433) y Redis (6380) están desplazados para evitar conflictos con instancias locales. Configurables en `.env` vía `POSTGRES_PORT` y `REDIS_PORT`.

---

## Desarrollo sin Docker

Para iterar rápido se puede levantar la infraestructura en Docker y el servicio a desarrollar localmente.

### Backend

```bash
# Infraestructura
docker compose up postgres redis -d

# Python
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Migraciones y arranque
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd composable-os
npm install
npm run dev                      # http://localhost:5173 con HMR
```

> Con el backend local, `VITE_API_URL` debe apuntar a `http://localhost/api/v1` (vía nginx) o `http://localhost:8000/api/v1` (directo).

---

## Tests

Suite de integración con pytest-asyncio contra una base de datos PostgreSQL real (`cbos_test`).

```bash
# Con Docker (recomendado)
docker compose exec backend pytest --tb=short -q

# Local
cd backend && pytest --tb=short -q
```

**360 tests** en 30 archivos:

| Categoría | Archivos | Cobertura |
|-----------|----------|-----------|
| Contract tests | 9 archivos (`test_*_contract.py`) | Auth guards, lifecycle, workspace isolation por módulo |
| Integration tests | 9 archivos (`test_*.py`) | Flows de servicio, lógica de negocio |
| E2E cross-module | 5 archivos (`test_e2e_*.py`) | Sales→Accounting, Portal→WS, Discovery→Blueprint, Notification pipeline |
| Consumer / scanner | 3 archivos | Workflow consumer, invoice consumer, overdue scanner |
| Smoke | 1 archivo (`test_wedge_smoke.py`) | Funnel completo: CRM→Sales→Inventory→Portal→Accounting (7 módulos) |
| Analytics | 1 archivo | Summary, revenue, pipeline: auth, shape, workspace isolation, empty state |

```bash
# Cobertura detallada
docker compose exec backend pytest --tb=short -v
```

---

## Migraciones de base de datos

CBOS usa Alembic para gestionar el esquema de PostgreSQL.

```bash
# Aplicar migraciones pendientes
docker compose exec backend alembic upgrade head

# Nueva migración tras cambiar modelos
docker compose exec backend alembic revision --autogenerate -m "descripcion_del_cambio"

# Ver historial
docker compose exec backend alembic history

# Revertir la última
docker compose exec backend alembic downgrade -1
```

Las migraciones se generan en `backend/alembic/versions/`. Revisar siempre el archivo generado antes de aplicar en producción.

---

## Deploy en producción (Dokploy)

CBOS se despliega en un VPS vía [Dokploy](https://dokploy.com), que gestiona SSL (Let's Encrypt) y el reverse proxy (Traefik) automáticamente.

### Pasos

1. Conectar el repositorio en el panel de Dokploy
2. Seleccionar `docker-compose.prod.yml` como compose file
3. Configurar las variables de entorno en el panel
4. Dokploy gestiona certificados SSL y dominios automáticamente

---

## Variables de entorno

### Desarrollo (`.env.example`)

| Variable | Default | Descripción |
|----------|---------|-------------|
| `POSTGRES_DB` | `cbos_dev` | Base de datos |
| `POSTGRES_USER` | `cbos` | Usuario PostgreSQL |
| `POSTGRES_PASSWORD` | `cbos_dev_pass` | Contraseña PostgreSQL |
| `POSTGRES_PORT` | `5433` | Puerto local PostgreSQL |
| `REDIS_PORT` | `6380` | Puerto local Redis |
| `SECRET_KEY` | `dev-secret-key-...` | Firma JWT — cambiar en producción |
| `ENVIRONMENT` | `development` | `development` / `production` |
| `ALLOWED_ORIGINS` | `["http://localhost", ...]` | CORS — lista JSON |
| `ANTHROPIC_API_KEY` | — | API key de Anthropic (módulo Discovery) |

### Producción (`.env.prod.example`)

| Variable | Descripción |
|----------|-------------|
| `POSTGRES_PASSWORD` | Contraseña segura para PostgreSQL |
| `REDIS_PASSWORD` | Contraseña segura para Redis |
| `SECRET_KEY` | String aleatorio, mínimo 32 caracteres |
| `DOMAIN` | Dominio de producción (nginx enruta `/api/` → backend, `/` → frontend) |
| `ANTHROPIC_API_KEY` | Requerido para Discovery AI |
| `FROM_EMAIL` | Remitente para notificaciones |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | Config SMTP para email transaccional |

---

## Documentación

```
docs/
├── FOUNDATIONAL_ARCHITECTURE.md        Arquitectura y principios de diseño
├── CAPABILITY_MATRIX_MVP.md            Matriz de capacidades del MVP
├── CAPABILITY_MATURITY_SCORECARD.md    Scorecard de madurez por módulo
├── API_CONVENTIONS.md                  Convenciones de la API REST
├── EVENT_REGISTRY_V1.md                Catálogo de eventos del sistema (14+ tipos)
├── Q4_2026_SPRINT_PLAN.md              Sprint plan actual (G2, G6, E1 — cerrado)
├── IMPLEMENTATION_ALIGNMENT.md         Alineación entre plan e implementación
├── adr/                                12 Architecture Decision Records
│   ├── 0001  Modular monolith for MVP
│   ├── 0002  Freeze MVP stack
│   ├── 0003  Commercial operations wedge
│   ├── 0004  Events as versioned domain contracts
│   ├── 0005  Bound frontend to owned capabilities
│   ├── 0006  Promote Portal to Tier 2
│   ├── 0007  Sales-Inventory boundary via Gateway
│   ├── 0008  Promote Discovery + Accounting to Tier 2
│   ├── 0009  Promote Discovery to Tier 1
│   ├── 0010  Promote Accounting to Tier 1
│   ├── 0011  Promote Portal to Tier 1
│   └── 0012  Promote Notifications to Tier 1
└── capabilities/                       Especificación por módulo
    ├── identity.md       ├── sales.md        ├── workflows.md
    ├── crm.md            ├── inventory.md    ├── notifications.md
    ├── discovery.md      ├── portal.md       └── accounting.md
```
