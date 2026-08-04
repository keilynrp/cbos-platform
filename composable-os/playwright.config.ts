import { defineConfig } from "@playwright/test";

/**
 * End-to-end tests against a running stack.
 *
 * These do NOT start the app: they expect `docker compose up -d` to be serving
 * it already, because the flows under test cross into the backend and the
 * database. Vitest owns the unit side (`vitest.config.ts` only collects
 * `src/**`), so the two suites never pick up each other's files.
 *
 *   docker compose up -d
 *   npm run test:e2e
 *
 * Point E2E_BASE_URL elsewhere to run against another environment.
 */
export default defineConfig({
  testDir: "./e2e",
  // The suite shares one workspace and one company profile, so parallel
  // workers would overwrite each other's fixtures mid-assertion.
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? "list" : "line",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
