# CBOS — Composable Business Operating System

Un sistema operativo empresarial modular, event-driven y AI-native.

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind + shadcn/ui |
| Backend | FastAPI + Python 3.12 + SQLAlchemy (async) |
| Base de datos | PostgreSQL 16 |
| Event bus | Redis Streams |
| Deploy | Docker + Dokploy |

## Estructura del monorepo

```
cbos-platform/
├── composable-os/    Frontend React/Vite
├── backend/          FastAPI modular monolith
├── docs/             Documentación estratégica y arquitectónica
├── docker-compose.yml          Desarrollo local
└── docker-compose.prod.yml     Producción (Dokploy)
```

## Inicio rápido — Desarrollo local

### 1. Clonar y configurar variables de entorno

```bash
cp .env.example .env
cp composable-os/.env.example composable-os/.env
```

### 2. Levantar el stack completo

```bash
docker compose up --build
```

Servicios disponibles:

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:8080 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| Health check | http://localhost:8000/health |

### 3. Correr migraciones (primera vez)

```bash
docker compose exec backend alembic upgrade head
```

### 4. Desarrollo backend sin Docker

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### 5. Desarrollo frontend sin Docker

```bash
cd composable-os
cp .env.example .env
npm install
npm run dev
```

## Generar una migración nueva

```bash
# Con Docker
docker compose exec backend alembic revision --autogenerate -m "descripcion"

# Local
cd backend && alembic revision --autogenerate -m "descripcion"
```

## Deploy en Dokploy (VPS)

1. Conectar el repositorio en Dokploy
2. Seleccionar `docker-compose.prod.yml`
3. Configurar las variables de entorno del `.env.example` en el panel de Dokploy
4. Dokploy gestiona SSL (Let's Encrypt) y el reverse proxy (Traefik) automáticamente

Variables de entorno requeridas en Dokploy:

```
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
SECRET_KEY
API_DOMAIN
FRONTEND_DOMAIN
```

## Documentación

Ver `docs/CBOS_Construction_Plan.md` para el plan maestro de construcción con todas las fases.
