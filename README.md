# CBOS — Composable Business Operating System

> Sistema operativo empresarial modular, event-driven y AI-native para PYMEs.

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

CBOS es una plataforma de gestión empresarial composable: cada capacidad de negocio (CRM, ventas, inventario, facturación, portal del cliente) es un módulo independiente que se integra mediante un bus de eventos común. Las empresas activan las capacidades que necesitan, no un paquete rígido.

El sistema está construido como un **monolito modular** con límites de dominio explícitos — no microservicios prematuros. El event bus (Redis Streams) desacopla los módulos y alimenta el motor de workflows. La IA (Anthropic API) es infraestructura transversal disponible para cualquier módulo, no un addon.

**Estado actual:** MVP wedge operativo — 9 módulos en producción cubriendo el flujo `Lead → Opportunity → Quote → Order → Inventory → Portal → Invoice`.

---

## Stack técnico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | React + TypeScript + Vite + Tailwind CSS + shadcn/ui | 18.3 / 7.3 |
| Backend | FastAPI + SQLAlchemy (async) + asyncpg | Python 3.12 |
| Base de datos | PostgreSQL + Alembic (migrations) | 16 |
| Cache / Events | Redis Streams | 7 |
| Proxy local | Nginx | 1.27-alpine |
| Deploy | Docker Compose + Dokploy (Traefik + Let's Encrypt) | — |

**Frontend adicional:** TanStack Query 5, React Router 6, React Hook Form + Zod, Zustand, Recharts, Sonner.

---

## Módulos implementados

Los 9 módulos activos en `backend/app/modules/`:

| Módulo | Descripción |
|--------|-------------|
| **Identity** | Auth JWT, usuarios, workspaces, roles y permisos |
| **CRM** | Leads, Opportunities con kanban pipeline, Activities, máquina de estados (`new → qualified → proposal → negotiation → won/lost`) |
| **Sales** | Cotizaciones, SalesOrders, pipeline RevPath |
| **Inventory** | Catálogo de productos, stock, movimientos de inventario |
| **Portal** | Portal del cliente (rutas públicas + autenticadas) |
| **Discovery** | Solution Discovery AI — diagnóstico de necesidades via Anthropic API |
| **Workflows** | Workflow engine, event consumer (Redis Streams), definiciones de automatización |
| **Notifications** | Notificaciones por email y push, WebSocket para tiempo real |
| **Accounting** | Facturación e invoicing |

Documentación de capacidades por módulo: [`docs/capabilities/`](docs/capabilities/).

---

## Estructura del repositorio

```
cbos-platform/
├── backend/                        FastAPI modular monolith (Python 3.12)
│   ├── app/
│   │   ├── core/                   Config, deps, middleware, event bus
│   │   ├── modules/                9 dominios de negocio (ver arriba)
│   │   └── main.py                 Lifespan, routers, CORS
│   ├── tests/                      pytest-asyncio — 335 tests
│   ├── alembic/                    Migraciones de base de datos
│   └── requirements.txt
├── composable-os/                  React 18 + Vite frontend
│   └── src/
│       ├── pages/                  CRM, Sales, Inventory, Dashboard…
│       ├── services/               Capa de API client (fetch + React Query)
│       └── components/             shadcn/ui + componentes custom
├── nginx/
│   ├── local-http.conf             Dev local HTTP (sin SSL, sin mkcert)  ← activo por defecto
│   └── local-ssl.conf              Dev con SSL (requiere mkcert -install)
├── docs/                           Documentación técnica y arquitectónica
├── .env.example                    Template de variables de entorno
├── .env.prod.example               Template para producción
├── docker-compose.yml              Servicios base compartidos
├── docker-compose.override.yml     Dev local (auto-fusionado, modo HTTP)
└── docker-compose.prod.yml         Producción (Dokploy)
```

> **Nota sobre los Compose files:** Docker Compose fusiona automáticamente `docker-compose.override.yml` con `docker-compose.yml`. El override activa el modo HTTP local (sin SSL), expone el puerto 80 y configura `VITE_API_URL`. `docker-compose.prod.yml` solo lo usa Dokploy de forma explícita.

---

## Inicio rápido

### Prerrequisitos

- Docker Desktop (o Docker Engine + Compose plugin)
- Git

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/keilynrp/cbos-platform.git
cd cbos-platform

# 2. Copiar variables de entorno
cp .env.example .env
# Los defaults funcionan para desarrollo local, no es necesario editar

# 3. Levantar el stack completo
docker compose up --build

# 4. Aplicar migraciones (solo la primera vez)
docker compose exec backend alembic upgrade head
```

La app estará disponible en **http://localhost**.

### URLs locales

| Servicio | URL |
|----------|-----|
| Aplicación (Frontend + API via nginx) | http://localhost |
| Backend API (directo) | http://localhost:8000 |
| Swagger / API Docs | http://localhost:8000/docs |
| Health check | http://localhost:8000/health |
| PostgreSQL | localhost:5433 |
| Redis | localhost:6380 |

> Los puertos de PostgreSQL (5433) y Redis (6380) están desplazados para evitar conflictos con instancias locales. Configurables en `.env` vía `POSTGRES_PORT` y `REDIS_PORT`.

---

## Desarrollo sin Docker

Para iterar rápido sobre un solo servicio se puede levantar la infraestructura en Docker y el servicio a desarrollar de forma local.

### Backend

```bash
# Levantar solo la infraestructura
docker compose up postgres redis -d

# Configurar entorno Python
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Aplicar migraciones y arrancar
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

API disponible en `http://localhost:8000`. Swagger en `http://localhost:8000/docs`.

### Frontend

```bash
cd composable-os
npm install
npm run dev
# Dev server en http://localhost:5173 con HMR
```

Con el backend corriendo en Docker, la variable `VITE_API_URL` debe apuntar a `http://localhost/api/v1` (via nginx) o `http://localhost:8000/api/v1` (directo).

---

## Tests

El backend tiene una suite de integración con pytest-asyncio y una base de datos de test en memoria.

```bash
# Con Docker (recomendado)
docker compose exec backend pytest --tb=short -q

# Local (requiere el entorno virtual activado)
cd backend && pytest --tb=short -q
```

Cobertura actual: **335 tests** en 27 archivos — identity, CRM, sales, inventory, workflows, portal, discovery, accounting, notifications, wedge smoke, e2e cross-module (tests unitarios + contrato + integración + e2e pipeline).

```bash
# Ver cobertura detallada
docker compose exec backend pytest --tb=short -v
```

---

## Migraciones de base de datos

CBOS usa Alembic para gestionar el esquema de PostgreSQL.

```bash
# Aplicar todas las migraciones pendientes
docker compose exec backend alembic upgrade head

# Crear una nueva migración tras cambiar modelos SQLAlchemy
docker compose exec backend alembic revision --autogenerate -m "descripcion_del_cambio"

# Ver el historial de migraciones
docker compose exec backend alembic history

# Revertir la última migración
docker compose exec backend alembic downgrade -1
```

Los archivos de migración se generan en `backend/alembic/versions/`. Revisar siempre el archivo generado antes de aplicarlo en producción.

---

## Deploy en producción (Dokploy)

CBOS se despliega en un VPS vía [Dokploy](https://dokploy.com), que gestiona SSL (Let's Encrypt) y el reverse proxy (Traefik) automáticamente.

### Pasos

1. Conectar el repositorio en el panel de Dokploy
2. Seleccionar `docker-compose.prod.yml` como compose file
3. Configurar las variables de entorno (ver sección siguiente)
4. Dokploy gestiona certificados SSL y el dominio automáticamente

### Variables requeridas en producción

```env
# Base de datos
POSTGRES_DB=cbos_prod
POSTGRES_USER=cbos
POSTGRES_PASSWORD=<password-seguro>

# Redis
REDIS_PASSWORD=<password-seguro>

# Autenticación
SECRET_KEY=<string-aleatorio-minimo-32-chars>

# Dominio (nginx enruta /api/ → backend, / → frontend)
DOMAIN=app.tudominio.com

# Opcionales
ANTHROPIC_API_KEY=<api-key>    # Requerido para el módulo Discovery
FROM_EMAIL=no-reply@tudominio.com
SMTP_HOST=...                   # Requerido para notificaciones por email
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
```

Ver `.env.prod.example` para la lista completa con descripciones.

---

## Variables de entorno

| Variable | Dev default | Descripción |
|----------|------------|-------------|
| `POSTGRES_DB` | `cbos_dev` | Nombre de la base de datos |
| `POSTGRES_USER` | `cbos` | Usuario de PostgreSQL |
| `POSTGRES_PASSWORD` | `cbos_dev_pass` | Contraseña de PostgreSQL |
| `POSTGRES_PORT` | `5433` | Puerto local de PostgreSQL |
| `REDIS_PORT` | `6380` | Puerto local de Redis |
| `SECRET_KEY` | `dev-secret-key-...` | Clave para firmar JWT — cambiar en producción |
| `ENVIRONMENT` | `development` | `development` o `production` |
| `ALLOWED_ORIGINS` | `["http://localhost", ...]` | CORS — lista JSON de orígenes permitidos |
| `DOMAIN` | — | Dominio de producción (Dokploy) — nginx enruta API + frontend |
| `ANTHROPIC_API_KEY` | — | API key de Anthropic (módulo Discovery) |

---

## Documentación

```
docs/
├── FOUNDATIONAL_ARCHITECTURE.md        Arquitectura del sistema y decisiones de diseño
├── CAPABILITY_MATRIX_MVP.md            Matriz de capacidades del MVP
├── API_CONVENTIONS.md                  Convenciones de la API REST
├── EVENT_REGISTRY_V1.md               Catálogo de eventos del sistema
├── IMPLEMENTATION_ALIGNMENT.md         Alineación entre plan y estado de implementación
├── SPRINT_BACKLOG_8_WEEKS.md           Backlog de 8 semanas
├── TECHNICAL_BACKLOG_30_60_90.md       Roadmap técnico 30/60/90 días
├── adr/                                Architecture Decision Records
│   ├── 0001-adopt-modular-monolith-for-mvp.md
│   ├── 0002-freeze-mvp-stack.md
│   ├── 0003-anchor-the-mvp-on-the-commercial-operations-wedge.md
│   ├── 0004-treat-events-as-versioned-domain-contracts.md
│   └── 0005-bound-frontend-surfaces-to-owned-capabilities.md
└── capabilities/                       Especificación por módulo
    ├── crm.md
    ├── identity.md
    ├── inventory.md
    ├── sales.md
    └── workflows.md
```
