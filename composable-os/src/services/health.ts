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
