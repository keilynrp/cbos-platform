import { screen } from "@testing-library/react";
import i18next, { type i18n as I18n } from "i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildI18nOptions, resources } from "@/i18n";
import Index from "@/pages/Index";
import { renderPageWithI18n } from "@/test/i18n";

/**
 * `dashboard` en el ingles *real* (tarea 12 del plan de i18n): el catalogo `en` que se
 * envia, con sus plurales, su titulo con el numero de meses y las etiquetas de estado
 * que vienen de `common`. `Index.test.tsx` prueba que nada esta cableado; esto, que lo
 * que se pinta es ingles.
 */

const svc = vi.hoisted(() => ({
  getSummary: vi.fn(),
  getRevenue: vi.fn(),
  getPipeline: vi.fn(),
  getItems: vi.fn(),
  getActivities: vi.fn(),
}));
const auth = vi.hoisted(() => ({ user: { full_name: "Ana Lopez" } as { full_name: string } | null }));

vi.mock("@/services/analytics", () => ({
  analyticsService: { getSummary: svc.getSummary, getRevenue: svc.getRevenue, getPipeline: svc.getPipeline },
}));
vi.mock("@/services/inventory", () => ({ inventoryService: { getItems: svc.getItems } }));
vi.mock("@/services/crm", () => ({ crmService: { getActivities: svc.getActivities } }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: auth.user }) }));

async function english(): Promise<I18n> {
  const instance = i18next.createInstance();
  await instance.init(buildI18nOptions(resources, "en"));
  return instance;
}

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

const summary = (workflows = 3) => ({
  revenue: { total_invoiced: 12_500 },
  pipeline: { open_opportunities: 4, pipeline_value: 1_200_000 },
  operations: { active_workflow_runs: workflows, orders_pending: 2, low_stock_items: 2 },
});

beforeEach(() => {
  Object.values(svc).forEach((fn) => fn.mockReset());
  auth.user = { full_name: "Ana Lopez" };
  svc.getSummary.mockResolvedValue(summary());
  svc.getRevenue.mockResolvedValue({ series: [{ month: "2026-04", invoiced: 8000 }] });
  svc.getPipeline.mockResolvedValue({ stages: [{ stage: "new", count: 3 }] });
  svc.getItems.mockResolvedValue([
    { id: "i1", product_name: "Keyboard", sku: "SKU-1", quantity_available: 1, status: "low_stock" },
    { id: "i2", product_name: null, sku: "SKU-9", quantity_available: 0, status: "out_of_stock" },
  ]);
  svc.getActivities.mockResolvedValue([
    { id: "a1", title: "Call the client", activity_type: "call", created_at: minutesAgo(5) },
  ]);
});

describe("Index in English", () => {
  it("greets the user and describes the page", async () => {
    renderPageWithI18n(<Index />, await english());

    expect(await screen.findByRole("heading", { name: "Hello, Ana" })).toBeInTheDocument();
    expect(screen.getByText("Your business at a glance, in real time.")).toBeInTheDocument();
    expect(screen.queryByText("Resumen del negocio en tiempo real.")).not.toBeInTheDocument();
  });

  it("shows the KPI cards with English labels and compact amounts", async () => {
    renderPageWithI18n(<Index />, await english());

    expect(await screen.findByText("Total invoiced")).toBeInTheDocument();
    expect(screen.getByText("$12.5K")).toBeInTheDocument();
    expect(screen.getByText("Open deals")).toBeInTheDocument();
    expect(screen.getByText("value: $1.2M")).toBeInTheDocument();
    expect(screen.getByText("Pending orders")).toBeInTheDocument();
    expect(screen.getByText("Stock alerts")).toBeInTheDocument();
    expect(screen.getByText("items below minimum")).toBeInTheDocument();
  });

  it("agrees the workflow count with its number", async () => {
    renderPageWithI18n(<Index />, await english());
    expect(await screen.findByText("3 active workflows")).toBeInTheDocument();
  });

  it("uses the singular for one workflow", async () => {
    svc.getSummary.mockResolvedValue(summary(1));
    renderPageWithI18n(<Index />, await english());

    expect(await screen.findByText("1 active workflow")).toBeInTheDocument();
  });

  it("titles the revenue chart with the number of months", async () => {
    renderPageWithI18n(<Index />, await english());

    expect(await screen.findByText("Revenue — last 8 months")).toBeInTheDocument();
  });

  it("lists the stock alerts with English statuses and availability", async () => {
    renderPageWithI18n(<Index />, await english());

    expect(await screen.findByText("Inventory alerts")).toBeInTheDocument();
    expect(await screen.findByText("1 available")).toBeInTheDocument();
    expect(screen.getByText("0 available")).toBeInTheDocument();
    expect(screen.getByText("low stock")).toBeInTheDocument();
    expect(screen.getByText("out of stock")).toBeInTheDocument();
  });

  it("shows the empty states in English", async () => {
    svc.getPipeline.mockResolvedValue({ stages: [] });
    svc.getItems.mockResolvedValue([]);
    svc.getActivities.mockResolvedValue([]);
    renderPageWithI18n(<Index />, await english());

    expect(await screen.findByText(/No opportunities yet\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create one" })).toHaveAttribute("href", "/crm");
    expect(screen.getByText("All inventory is at healthy levels.")).toBeInTheDocument();
    expect(screen.getByText("No activity recorded yet.")).toBeInTheDocument();
  });

  it("shows recent activity with the type and the time in English", async () => {
    renderPageWithI18n(<Index />, await english());

    expect(await screen.findByText("Call the client")).toBeInTheDocument();
    expect(screen.getByText(/call · 5m ago/)).toBeInTheDocument();
  });

  it("shows the AI insight cards in English", async () => {
    renderPageWithI18n(<Index />, await english());

    expect(await screen.findByText("AI insights")).toBeInTheDocument();
    expect(screen.getByText("Sales assistant")).toBeInTheDocument();
    expect(screen.getByText("Inventory agent")).toBeInTheDocument();
    expect(screen.getByText("Workflow engine")).toBeInTheDocument();
  });
});
