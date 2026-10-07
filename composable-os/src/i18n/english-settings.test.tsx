import { fireEvent, screen, waitFor } from "@testing-library/react";
import i18next, { type i18n as I18n } from "i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildI18nOptions, resources } from "@/i18n";
import Settings from "@/pages/Settings";
import { renderPageWithI18n } from "@/test/i18n";

/**
 * `settings` en el ingles *real* (tarea 12 del plan de i18n): las cinco pestanas de
 * Ajustes con el catalogo `en` que se envia, no el pseudo-localizado de
 * `Settings.test.tsx`.
 */

const svc = vi.hoisted(() => ({ getHealth: vi.fn() }));
const http = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));

vi.mock("@/services/health", () => ({ healthService: svc }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: http,
}));

async function english(): Promise<I18n> {
  const instance = i18next.createInstance();
  await instance.init(buildI18nOptions(resources, "en"));
  return instance;
}

const health = (over: Record<string, unknown> = {}) => ({
  status: "healthy",
  version: "1.2.3",
  checks: [
    { name: "api", status: "healthy", latency_ms: 12 },
    { name: "postgres", status: "degraded", latency_ms: 340 },
  ],
  ...over,
});

const prefs = (over: Record<string, unknown> = {}) => ({
  email_enabled: true,
  email_events: { QuoteAccepted: true, SalesOrderCreated: true, WorkflowFailed: true, InventoryLowThresholdDetected: false, InvoiceOverdue: false },
  ...over,
});

beforeEach(() => {
  svc.getHealth.mockReset().mockResolvedValue(health());
  http.get.mockReset().mockResolvedValue(prefs());
  http.put.mockReset().mockImplementation(async (_url: string, patch: { email_enabled?: boolean; email_events?: Record<string, boolean> }) => {
    const current = prefs();
    return { ...current, ...patch, email_events: { ...current.email_events, ...(patch.email_events ?? {}) } };
  });
});

/** Radix activa una pestana con `mousedown`, no con `click`. */
const openTab = (name: string | RegExp) => fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });

describe("Settings in English", () => {
  it("renders the header and the five tabs", async () => {
    renderPageWithI18n(<Settings />, await english());

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByText("Platform configuration, architecture and system status.")).toBeInTheDocument();
    for (const tab of ["Architecture", "System health", "Notifications", "General", "Team"]) {
      expect(screen.getByRole("tab", { name: tab })).toBeInTheDocument();
    }
  });

  it("shows the diagram and the three layer cards in English", async () => {
    renderPageWithI18n(<Settings />, await english());

    expect(screen.getByText("Platform architecture")).toBeInTheDocument();
    expect(screen.getByText(/Hover over the components/)).toBeInTheDocument();
    for (const text of ["Client apps", "Graph database", "Vector database", "AI agents", "API LAYER", "MICROSERVICES", "DATA LAYER", "HTTPS"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.getAllByText("Microservice")).toHaveLength(6);
    expect(screen.getByText("Data layer")).toBeInTheDocument();
    expect(screen.getByText(/Asynchronous pub\/sub messaging/)).toBeInTheDocument();
    expect(screen.getByText(/Handles authentication, rate limiting/)).toBeInTheDocument();
    expect(screen.queryByText(/Microservicio|CAPA DE/)).not.toBeInTheDocument();
  });

  describe("system health", () => {
    it("shows each service with an English status and the latency", async () => {
      renderPageWithI18n(<Settings />, await english());
      openTab("System health");

      expect(await screen.findByText("healthy", { selector: "div" })).toBeInTheDocument();
      expect(screen.getByText("degraded")).toBeInTheDocument();
      expect(screen.getByText("12ms")).toBeInTheDocument();
      expect(screen.getByText("340ms")).toBeInTheDocument();
      expect(screen.getAllByText("Latency")).toHaveLength(2);
    });

    it("shows the overall status, the version and how fresh the data is", async () => {
      renderPageWithI18n(<Settings />, await english());
      openTab("System health");

      expect(await screen.findByText(/Overall status:/)).toBeInTheDocument();
      expect(screen.getByText(/v1\.2\.3/)).toBeInTheDocument();
      expect(await screen.findByText(/^Updated (now|\d+ ?s(ec\.)? ago)$/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    });

    it("explains when the backend cannot be reached", async () => {
      svc.getHealth.mockRejectedValue(new Error("down"));
      renderPageWithI18n(<Settings />, await english());
      openTab("System health");

      expect(await screen.findByText("Could not connect to the system. Check that the backend is running.", undefined, { timeout: 5000 })).toBeInTheDocument();
    });
  });

  describe("notifications", () => {
    it("lists the event types in English with named switches and a summary", async () => {
      renderPageWithI18n(<Settings />, await english());
      openTab("Notifications");

      expect(await screen.findByText("Quotes accepted")).toBeInTheDocument();
      expect(screen.getByText("Event types")).toBeInTheDocument();
      expect(screen.getByText("When a customer accepts a quote")).toBeInTheDocument();
      expect(screen.getByRole("switch", { name: "Quotes accepted" })).toBeChecked();
      expect(screen.getByRole("switch", { name: "Low stock" })).not.toBeChecked();
      expect(screen.getByText("3 of 5 event types active")).toBeInTheDocument();
    });

    it("saves a per-event toggle and updates the summary", async () => {
      renderPageWithI18n(<Settings />, await english());
      openTab("Notifications");

      fireEvent.click(await screen.findByRole("switch", { name: "Overdue invoices" }));

      await waitFor(() => expect(http.put).toHaveBeenCalledWith("/notifications/preferences", { email_events: { InvoiceOverdue: true } }));
      expect(await screen.findByText("4 of 5 event types active")).toBeInTheDocument();
    });

    it("turns everything off from the master switch", async () => {
      renderPageWithI18n(<Settings />, await english());
      openTab("Notifications");

      fireEvent.click(await screen.findByRole("switch", { name: "Email notifications" }));

      await waitFor(() => expect(http.put).toHaveBeenCalledWith("/notifications/preferences", { email_enabled: false }));
      expect(await screen.findByText("All email notifications are turned off")).toBeInTheDocument();
      expect(screen.getByRole("switch", { name: "Quotes accepted" })).toBeDisabled();
    });

    it("explains the in-app notifications", async () => {
      renderPageWithI18n(<Settings />, await english());
      openTab("Notifications");

      expect(await screen.findByText("Real-time notifications")).toBeInTheDocument();
      expect(screen.getByText(/delivered over WebSocket/)).toBeInTheDocument();
    });
  });

  describe("general and team", () => {
    it("shows the workspace form and the preferences", async () => {
      renderPageWithI18n(<Settings />, await english());
      openTab("General");

      expect(await screen.findByText("Workspace settings")).toBeInTheDocument();
      expect(screen.getByLabelText("Workspace name")).toHaveValue("Composable OS");
      expect(screen.getByLabelText("Workspace URL")).toBeDisabled();
      expect(screen.getByRole("switch", { name: "Enable AI recommendations" })).toBeChecked();
      expect(screen.getByRole("switch", { name: "Automatic knowledge graph linking" })).toBeChecked();
      expect(screen.getByText("Preferences")).toBeInTheDocument();
    });

    it("lists the team with English roles", async () => {
      renderPageWithI18n(<Settings />, await english());
      openTab("Team");

      expect(await screen.findByText("Team members")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Invite/ })).toBeInTheDocument();
      expect(screen.getAllByText("Admin")).toHaveLength(2);
      expect(screen.getAllByText("Member")).toHaveLength(4);
    });
  });
});
