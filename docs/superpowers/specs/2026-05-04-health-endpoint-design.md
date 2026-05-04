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

### Migration Note: Remove Existing Inline Handler

`backend/app/main.py` already contains an inline `/health` handler (the `async def health()` function returning `{"status": "ok", ...}`). **This handler must be removed** before registering the new router. Failing to do so will cause FastAPI to silently use whichever handler was registered first.

### Breaking Change Acknowledgement

The existing response shape returns `status: "ok"`. The new shape uses `status: "healthy" | "degraded" | "unhealthy"`. Any external tool (Dokploy, UptimeRobot, Docker HEALTHCHECK) that checks for `status == "ok"` will need to be updated to check for `status == "healthy"` instead.

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

The 200ms threshold is a hardcoded constant in `health.py`. Move to `settings` if it needs to be environment-configurable in the future.

### API Check

- Always `healthy` with `latency_ms: 0` (self-reported — if the endpoint responds, the API is up)
- Known limitation: a slow event loop (e.g. 2s response time) would not be detected by this check. Acceptable for v1.

### Implementation Location

```
backend/app/health.py       — Pydantic schemas + check logic
backend/app/main.py         — Remove inline handler; register new router at root
```

---

## Frontend Design

### URL Construction

`VITE_API_URL` in this project includes the `/api/v1` suffix (e.g. `http://localhost:8100/api/v1` or `https://cbos.inbounduxd.com/api/v1`). The health endpoint lives at the root, so the health service must strip the `/api/v1` suffix:

```ts
const API_ORIGIN = (import.meta.env.VITE_API_URL as string ?? "http://localhost:8100/api/v1")
  .replace(/\/api\/v1$/, "");
```

### New Service

```
composable-os/src/services/health.ts
```

Uses `fetch` directly (not the `api` wrapper that injects JWT headers) since the endpoint is public. Includes a 5-second timeout via `AbortController` to prevent indefinite hangs when the backend is slow:

```ts
export const healthService = {
  getHealth: async (): Promise<HealthResponse> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
      const res = await fetch(`${API_ORIGIN}/health`, { signal: controller.signal });
      if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
      return res.json();
    } finally {
      clearTimeout(timeout);
    }
  }
}
```

### Settings.tsx Changes

- Remove hardcoded `services[]` array
- Add `useQuery` for `healthService.getHealth` with `refetchInterval: 30_000`
- Map `checks[]` from response to the existing UI card structure:
  - `"api"` → display name "API Gateway", icon Shield
  - `"postgres"` → display name "PostgreSQL", icon Database
- Show real `latency_ms` formatted as `"Xms"`
- **Uptime cell**: the backend returns no uptime percentage (out of scope). Hide the uptime stat entirely — do not show "N/A" or an empty cell, as this looks like a bug. Show only Status and Latency.
- Add a small "Actualizado hace X s" timestamp below the panel using the query's `dataUpdatedAt`
- Loading skeleton while first fetch is in flight
- Error state (with `AlertCircle`) if the fetch fails or times out

### Status → Badge Color Mapping

| Status | Color |
|--------|-------|
| `healthy` | green (existing `cbs-green` token) |
| `degraded` | amber (existing `cbs-amber` token) |
| `unhealthy` | red (destructive) |

The SVG architecture diagram and all other Settings content remain unchanged.

### CORS Note

CORS is handled by the existing `CORSMiddleware` in `main.py`. Verify that `allowed_origins` in the production environment includes `https://cbos.inbounduxd.com`. If it does not, the browser `fetch` will fail with a CORS error. This is not a code change — it is an environment configuration check at deploy time.

---

## Files Changed

| File | Change |
|------|--------|
| `backend/app/health.py` | New — Pydantic schemas + health check logic |
| `backend/app/main.py` | Remove inline `/health` handler; register new router |
| `composable-os/src/services/health.ts` | New — fetch wrapper with timeout |
| `composable-os/src/pages/Settings.tsx` | Replace `services[]` with real query; hide uptime cell |
