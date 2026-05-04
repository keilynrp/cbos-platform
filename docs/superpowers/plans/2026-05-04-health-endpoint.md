# Health Endpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded service health panel in Settings with a real `GET /health` endpoint that reports live status and latency for the API and PostgreSQL.

**Architecture:** A new `backend/app/health.py` module exposes a public `GET /health` endpoint (no JWT) that runs a `SELECT 1` probe against PostgreSQL and returns structured JSON. The existing inline handler in `main.py` is removed and replaced with this router. The frontend gets a new `health.ts` service using raw `fetch` (not the JWT-injecting `api` wrapper), and Settings.tsx is updated to poll it every 30 seconds.

**Tech Stack:** FastAPI, SQLAlchemy async, Pydantic v2, React, @tanstack/react-query, TypeScript

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `backend/app/health.py` | Create | Pydantic schemas, PostgreSQL probe, router |
| `backend/app/main.py` | Modify (lines 83–90) | Remove inline handler; import + mount health router |
| `backend/tests/test_health.py` | Create | Integration tests for `/health` |
| `composable-os/src/services/health.ts` | Create | `fetch`-based client with 5s AbortController timeout |
| `composable-os/src/pages/Settings.tsx` | Modify | Remove `services[]`; add `useQuery`; rewrite health tab |

---

## Task 1: Backend — `health.py` with PostgreSQL probe

**Files:**
- Create: `backend/app/health.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_health.py`:

```python
"""
Integration tests for GET /health endpoint.
Covers: shape, status values, no auth required.
"""
import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_health_returns_200_without_auth(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200


async def test_health_shape(client: AsyncClient):
    resp = await client.get("/health")
    data = resp.json()
    assert "status" in data
    assert "version" in data
    assert "checks" in data
    assert isinstance(data["checks"], list)


async def test_health_check_names(client: AsyncClient):
    resp = await client.get("/health")
    names = {c["name"] for c in resp.json()["checks"]}
    assert "api" in names
    assert "postgres" in names


async def test_health_postgres_check_has_latency(client: AsyncClient):
    resp = await client.get("/health")
    postgres = next(c for c in resp.json()["checks"] if c["name"] == "postgres")
    assert "latency_ms" in postgres
    assert isinstance(postgres["latency_ms"], (int, float))
    assert postgres["latency_ms"] >= 0


async def test_health_overall_status_is_valid(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.json()["status"] in {"healthy", "degraded", "unhealthy"}


async def test_health_api_check_is_always_healthy(client: AsyncClient):
    resp = await client.get("/health")
    api_check = next(c for c in resp.json()["checks"] if c["name"] == "api")
    assert api_check["status"] == "healthy"
    assert api_check["latency_ms"] == 0
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose exec backend pytest tests/test_health.py -v --tb=short
```

Expected: FAIL — `ImportError` or 404 (route does not exist yet).

- [ ] **Step 3: Create `backend/app/health.py`**

> **Note on test DB:** `_check_postgres()` calls `AsyncSessionLocal` directly (not via FastAPI's `get_db` dependency injection), so the conftest override does not apply. Inside Docker Compose, the dev DB (`cbos`) is always reachable alongside `cbos_test`, so the health tests will pass cleanly — they verify shape and latency, not data. This is intentional: the health check probes real infrastructure, not test fixtures.

```python
"""
Public health endpoint — no authentication required.
Always returns HTTP 200; health state is in the JSON body.
"""
import time
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import text

from app.core.database import AsyncSessionLocal
from app.core.config import settings

router = APIRouter(tags=["System"])

POSTGRES_DEGRADED_THRESHOLD_MS = 200

StatusValue = Literal["healthy", "degraded", "unhealthy"]


class CheckResult(BaseModel):
    name: str
    status: StatusValue
    latency_ms: float


class HealthResponse(BaseModel):
    status: StatusValue
    version: str
    checks: list[CheckResult]


def _worst(statuses: list[StatusValue]) -> StatusValue:
    if "unhealthy" in statuses:
        return "unhealthy"
    if "degraded" in statuses:
        return "degraded"
    return "healthy"


async def _check_postgres() -> CheckResult:
    try:
        start = time.perf_counter()
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        latency_ms = (time.perf_counter() - start) * 1000
        status: StatusValue = (
            "degraded" if latency_ms > POSTGRES_DEGRADED_THRESHOLD_MS else "healthy"
        )
        return CheckResult(name="postgres", status=status, latency_ms=round(latency_ms, 2))
    except Exception:
        return CheckResult(name="postgres", status="unhealthy", latency_ms=0)


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    api_check = CheckResult(name="api", status="healthy", latency_ms=0)
    postgres_check = await _check_postgres()

    checks = [api_check, postgres_check]
    overall = _worst([c.status for c in checks])

    return HealthResponse(
        status=overall,
        version=settings.app_version,
        checks=checks,
    )
```

- [ ] **Step 4: Register router in `backend/app/main.py`**

Add import at top (after existing imports):

```python
from app.health import router as health_router
```

Remove the inline handler (lines 83–90):

```python
# ── Health check ───────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health():
    return {
        "status": "ok",
        "version": settings.app_version,
        "environment": settings.environment,
    }
```

Add router registration (after the last `app.include_router` call, before the `@app.get("/")` root handler):

```python
app.include_router(health_router)  # public, no prefix
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
docker compose exec backend pytest tests/test_health.py -v --tb=short
```

Expected: all 6 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/health.py backend/app/main.py backend/tests/test_health.py
git commit -m "feat(health): real GET /health endpoint with PostgreSQL probe"
```

---

## Task 2: Frontend — `health.ts` service

**Files:**
- Create: `composable-os/src/services/health.ts`

- [ ] **Step 1: Create `composable-os/src/services/health.ts`**

```typescript
// composable-os/src/services/health.ts
// Uses raw fetch — NOT the api wrapper — because /health has no JWT requirement.

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export interface HealthCheck {
  name: string;
  status: HealthStatus;
  latency_ms: number;
}

export interface HealthResponse {
  status: HealthStatus;
  version: string;
  checks: HealthCheck[];
}

// Strip /api/v1 suffix so we reach the root-level /health route.
const API_ORIGIN = (
  (import.meta.env.VITE_API_URL as string) ?? "http://localhost:8100/api/v1"
).replace(/\/api\/v1$/, "");

export const healthService = {
  getHealth: async (): Promise<HealthResponse> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
      const res = await fetch(`${API_ORIGIN}/health`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
      return res.json();
    } finally {
      clearTimeout(timeout);
    }
  },
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd composable-os && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add composable-os/src/services/health.ts
git commit -m "feat(health): add frontend health service with AbortController timeout"
```

---

## Task 3: Frontend — wire Settings.tsx health tab

**Files:**
- Modify: `composable-os/src/pages/Settings.tsx`

**Context:** The health tab lives at lines 347–378. The hardcoded `services[]` array is at lines 213–220. The `statusBadge` map is at lines 222–226.

- [ ] **Step 1: Add imports**

**a)** Add two new import lines after line 1 (the react import):

```typescript
import { useQuery } from "@tanstack/react-query";
import { healthService, type HealthCheck, type HealthStatus } from "@/services/health";
import { Skeleton } from "@/components/ui/skeleton";
```

**b)** Add `RefreshCw` to the **existing** lucide-react named import block (lines 12–34). Do NOT create a second `import ... from "lucide-react"` statement — that would be a duplicate and will trigger ESLint errors. Find the existing block and add `RefreshCw` to it:

```typescript
// Find this existing block and add RefreshCw:
import {
  Settings2,
  Server,
  Database,
  Globe,
  Shield,
  Users,
  Bell,
  Mail,
  Palette,
  Cpu,
  Network,
  Radio,
  HardDrive,
  Activity,
  CheckCircle2,
  AlertCircle,
  Zap,
  ArrowRight,
  Box,
  Layers,
  Loader2,
  RefreshCw,   // ← add this line
} from "lucide-react";
```

- [ ] **Step 2: Remove `services[]` array and update `statusBadge` map**

Remove lines 213–220 (the hardcoded `services[]` array entirely).

Replace the `statusBadge` map (lines 222–226) with one aligned to the backend's actual status values. Note: the old `warning` key is intentionally removed — the backend does not emit `warning`, only `healthy`, `degraded`, and `unhealthy`.

```typescript
const statusBadge: Record<HealthStatus | string, string> = {
  healthy:   "bg-[hsl(var(--cbs-green))]/15 text-[hsl(var(--cbs-green))] border-[hsl(var(--cbs-green))]/20",
  degraded:  "bg-[hsl(var(--cbs-amber))]/15 text-[hsl(var(--cbs-amber))] border-[hsl(var(--cbs-amber))]/20",
  unhealthy: "bg-destructive/15 text-destructive border-destructive/20",
};
```

- [ ] **Step 3: Add icon map and `ServiceCard` component**

Add this block just after the `statusBadge` map (before `// --- Email Notification Preferences ---`):

```typescript
// Maps backend check name → display label + icon
const SERVICE_META: Record<string, { label: string; icon: typeof Shield }> = {
  api:      { label: "API Gateway", icon: Shield },
  postgres: { label: "PostgreSQL",  icon: Database },
};

function ServiceCard({ check }: { check: HealthCheck }) {
  const meta = SERVICE_META[check.name] ?? { label: check.name, icon: HardDrive };
  const Icon = meta.icon;
  return (
    <Card className="border border-border/60">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">{meta.label}</span>
          </div>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusBadge[check.status] ?? ""}`}>
            {check.status}
          </Badge>
        </div>
        <div className="rounded-md bg-muted/50 p-2 text-center">
          <p className="text-sm font-semibold">{check.latency_ms}ms</p>
          <p className="text-[10px] text-muted-foreground">Latency</p>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Replace the System Health tab content**

Replace the System Health tab section (lines 347–378):

```typescript
{/* OLD — remove this */}
<TabsContent value="health" className="mt-4 space-y-4">
  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
    {services.map(svc => {
      ...
    })}
  </div>
</TabsContent>
```

with:

```typescript
{/* System Health Tab */}
<TabsContent value="health" className="mt-4 space-y-4">
  <SystemHealthPanel />
</TabsContent>
```

And add the `SystemHealthPanel` component just before `// --- Main ---`:

```typescript
function SystemHealthPanel() {
  const { data, isLoading, error, dataUpdatedAt, refetch, isFetching } = useQuery({
    queryKey: ["system-health"],
    queryFn: healthService.getHealth,
    refetchInterval: 30_000,
    retry: 1,
  });

  const secondsAgo = dataUpdatedAt
    ? Math.floor((Date.now() - dataUpdatedAt) / 1000)
    : null;

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {secondsAgo !== null
            ? `Actualizado hace ${secondsAgo}s`
            : "Cargando estado del sistema..."}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Error state */}
      {error && !isLoading && (
        <div className="flex items-center gap-2 py-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          No se pudo conectar con el sistema. Verifica que el backend esté activo.
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      )}

      {/* Service cards */}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-4">
            {data.checks.map((check) => (
              <ServiceCard key={check.name} check={check} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Estado general:{" "}
            <span className={
              data.status === "healthy" ? "text-[hsl(var(--cbs-green))]" :
              data.status === "degraded" ? "text-[hsl(var(--cbs-amber))]" :
              "text-destructive"
            }>
              {data.status}
            </span>
            {" · "}v{data.version}
          </p>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd composable-os && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add composable-os/src/pages/Settings.tsx
git commit -m "feat(settings): wire system health tab to real GET /health endpoint"
```

---

## Task 4: Verify end-to-end

- [ ] **Step 1: Run full backend test suite**

```bash
docker compose exec backend pytest tests/ -v --tb=short -q
```

Expected: all tests pass, no regressions.

- [ ] **Step 2: Check CORS in production**

Verify `allowed_origins` in the production environment includes `https://cbos.inbounduxd.com`. Check `.env` or Dokploy environment variables. If missing, add it before deploying.

- [ ] **Step 3: Update any external health monitors**

If Dokploy or UptimeRobot checks for `status == "ok"`, update to check for `status == "healthy"`. The endpoint URL (`/health`) stays the same.

- [ ] **Step 4: Final commit if any config changes made**

```bash
git add .env.prod.example  # if updated
git commit -m "chore: update health check status value in docs/config"
```
