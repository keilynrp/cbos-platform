# Design: Real Health Endpoint — GET /health

**Date:** 2026-05-04
**Status:** Approved
**Scope:** Backend endpoint + frontend Settings panel

---

## Problem

The Settings page "Service Health" panel displays hardcoded uptime percentages and latency values (e.g. `"99.98%"`, `"12ms"`). This is mock data — it does not reflect the actual state of the system.

---

## Goal

Replace the static `services[]` array in Settings.tsx with a real `GET /health` endpoint that reports live status and latency for services actually running in production.

---

## Scope

**In scope:**
- `GET /health` backend endpoint (FastAPI)
- Frontend health service + Settings panel update

**Out of scope:**
- Services not yet deployed (Graph DB, Vector DB, AI Agents, Event Bus)
- Historical uptime tracking / percentages
- WebSocket real-time updates
- Authentication on the health endpoint

---

## Approach: Public HTTP Health Endpoint (Option A)

Standard industry pattern. No JWT required. Compatible with Dokploy, UptimeRobot, Docker HEALTHCHECK, and Kubernetes probes.

The endpoint always returns HTTP 200. Health state is communicated in the JSON body so that proxies and load balancers don't treat a degraded system as a network failure.

---

## Backend Design

### Endpoint

```
GET /health
```

- Mounted at root (outside `/api/v1` prefix)
- No authentication required
- Always returns HTTP 200

### Response Schema

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "checks": [
    {
      "name": "api",
      "status": "healthy",
      "latency_ms": 0
    },
    {
      "name": "postgres",
      "status": "healthy",
      "latency_ms": 3
    }
  ]
}
```

### Status Values

| Value | Meaning |
|-------|---------|
| `healthy` | Service is operating normally |
| `degraded` | Service is reachable but slow (PostgreSQL latency > 200ms) |
| `unhealthy` | Service is unreachable or erroring |

The root `status` field reflects the worst status among all checks.

### PostgreSQL Check

- Executes `SELECT 1` against the database
- Measures wall-clock latency in milliseconds
- If query fails → `unhealthy`
- If latency > 200ms → `degraded`
- Otherwise → `healthy`

### API Check

- Always `healthy` with `latency_ms: 0` (self-reported; if the endpoint responds, the API is up)

### Implementation Location

```
backend/app/health.py       — check logic + Pydantic schemas
backend/app/main.py         — register router at root (app.include_router)
```

---

## Frontend Design

### New Service

```
composable-os/src/services/health.ts
```

Uses `fetch` directly (not the `api` wrapper that injects JWT headers) since the endpoint is public.

```ts
export const healthService = {
  getHealth: (): Promise<HealthResponse> =>
    fetch(`${import.meta.env.VITE_API_URL}/health`).then(r => r.json())
}
```

### Settings.tsx Changes

- Remove hardcoded `services[]` array
- Add `useQuery` for `healthService.getHealth` with `refetchInterval: 30_000`
- Map `checks[]` from response to the existing UI card structure:
  - `"api"` → display name "API Gateway", icon Shield
  - `"postgres"` → display name "PostgreSQL", icon Database
- Show real `latency_ms` formatted as `"Xms"`
- Add a small "Updated X seconds ago" timestamp below the panel
- Loading skeleton while first fetch is in flight
- Error state if fetch fails entirely

### Status → Badge Color Mapping

| Status | Color |
|--------|-------|
| `healthy` | green (existing `cbs-green` token) |
| `degraded` | amber (existing `cbs-amber` token) |
| `unhealthy` | red (destructive) |

The SVG architecture diagram and all other Settings content remain unchanged.

---

## Files Changed

| File | Change |
|------|--------|
| `backend/app/health.py` | New — health check logic + schemas |
| `backend/app/main.py` | Register health router at app root |
| `composable-os/src/services/health.ts` | New — fetch wrapper |
| `composable-os/src/pages/Settings.tsx` | Replace `services[]` with real query |
