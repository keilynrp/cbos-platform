import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import Index from "@/pages/Index";
import {
  FORMATTED_CURRENCY, FORMATTED_RELATIVE, createPseudoInstance, notFromCatalogue, renderPageWithI18n, visibleStrings,
} from "@/test/i18n";

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

/** Datos del backend: no pertenecen al catalogo y no se traducen. */
const DATA = ["Ana", "Teclado mecanico", "SKU-9", "Llamar al cliente", "Enviar propuesta", "desconocido_x"];

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

const summary = (over: { workflows?: number } = {}) => ({
  revenue: { total_invoiced: 12_500 },
  pipeline: { open_opportunities: 4, pipeline_value: 1_200_000 },
  operations: { active_workflow_runs: over.workflows ?? 3, orders_pending: 2, low_stock_items: 2 },
});

beforeEach(() => {
  Object.values(svc).forEach((fn) => fn.mockReset());
  auth.user = { full_name: "Ana Lopez" };
  svc.getSummary.mockResolvedValue(summary());
  svc.getRevenue.mockResolvedValue({ series: [{ month: "2026-04", invoiced: 8000 }, { month: "2026-05", invoiced: 12500 }] });
  svc.getPipeline.mockResolvedValue({ stages: [{ stage: "new", count: 3 }, { stage: "won", count: 1 }] });
  svc.getItems.mockResolvedValue([
    { id: "i1", product_name: "Teclado mecanico", sku: "SKU-1", quantity_available: 1, status: "low_stock" },
    { id: "i2", product_name: null, sku: "SKU-9", quantity_available: 0, status: "out_of_stock" },
    { id: "i3", product_name: "Ok", sku: "SKU-3", quantity_available: 50, status: "in_stock" },
  ]);
  svc.getActivities.mockResolvedValue([
    { id: "a1", title: "Llamar al cliente", activity_type: "call", created_at: minutesAgo(5) },
    { id: "a2", title: "Enviar propuesta", activity_type: "desconocido_x", created_at: minutesAgo(180) },
  ]);
});

describe("Index, in Spanish", () => {
  it("greets the user by first name, or falls back to the title", async () => {
    renderPageWithI18n(<Index />, i18n);
    expect(await screen.findByRole("heading", { name: "Hola, Ana" })).toBeInTheDocument();
    expect(screen.getByText("Resumen del negocio en tiempo real.")).toBeInTheDocument();
  });

  it("falls back to the title without a name", async () => {
    auth.user = null;
    renderPageWithI18n(<Index />, i18n);

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("shows the KPI cards with compact amounts", async () => {
    renderPageWithI18n(<Index />, i18n);

    expect(await screen.findByText("Total facturado")).toBeInTheDocument();
    expect(screen.getByText(/^USD\s12\.5\sk$/)).toBeInTheDocument();
    expect(screen.getByText("Deals abiertos")).toBeInTheDocument();
    expect(screen.getByText(/^valor: USD\s1\.2\sM$/)).toBeInTheDocument();
    expect(screen.getByText("Órdenes pendientes")).toBeInTheDocument();
    expect(screen.getByText("Alertas de stock")).toBeInTheDocument();
    expect(screen.getByText("ítems bajo mínimo")).toBeInTheDocument();
  });

  it("agrees the workflow count with its number", async () => {
    renderPageWithI18n(<Index />, i18n);
    expect(await screen.findByText("3 workflows activos")).toBeInTheDocument();
  });

  it("uses the singular for one workflow", async () => {
    svc.getSummary.mockResolvedValue(summary({ workflows: 1 }));
    renderPageWithI18n(<Index />, i18n);

    expect(await screen.findByText("1 workflow activo")).toBeInTheDocument();
  });

  it("titles the revenue chart with the number of months it asks for", async () => {
    renderPageWithI18n(<Index />, i18n);

    expect(await screen.findByText("Facturación — últimos 8 meses")).toBeInTheDocument();
    expect(svc.getRevenue).toHaveBeenCalledWith(8);
  });

  it("lists the stock alerts with plurals and translated statuses", async () => {
    renderPageWithI18n(<Index />, i18n);

    expect(await screen.findByText("Alertas de inventario")).toBeInTheDocument();
    expect(await screen.findByText("1 disponible")).toBeInTheDocument();
    expect(screen.getByText("0 disponibles")).toBeInTheDocument();
    expect(screen.getByText("stock bajo")).toBeInTheDocument();
    expect(screen.getByText("agotado")).toBeInTheDocument();
    expect(screen.queryByText("Ok")).not.toBeInTheDocument();
  });

  it("says so when the inventory is fine", async () => {
    svc.getItems.mockResolvedValue([{ id: "i3", product_name: "Ok", sku: "S", quantity_available: 50, status: "in_stock" }]);
    renderPageWithI18n(<Index />, i18n);

    expect(await screen.findByText("Todo el inventario en niveles óptimos.")).toBeInTheDocument();
  });

  it("shows the empty pipeline with a link to create one", async () => {
    svc.getPipeline.mockResolvedValue({ stages: [] });
    renderPageWithI18n(<Index />, i18n);

    expect(await screen.findByText(/Sin oportunidades aún\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Crear una" })).toHaveAttribute("href", "/crm");
  });

  it("shows recent activity with the type translated and the time relative", async () => {
    renderPageWithI18n(<Index />, i18n);

    expect(await screen.findByText("Llamar al cliente")).toBeInTheDocument();
    // Antes: "call · 5m ago" (en ingles, en una interfaz en espanol).
    expect(screen.getByText(/llamada · hace 5 min/)).toBeInTheDocument();
    expect(screen.getByText(/hace 3 h/)).toBeInTheDocument();
  });

  it("falls back to the raw value for an activity type the catalogue does not know", async () => {
    renderPageWithI18n(<Index />, i18n);

    expect(await screen.findByText(/desconocido_x · hace 3 h/)).toBeInTheDocument();
  });

  it("shows the empty activity message", async () => {
    svc.getActivities.mockResolvedValue([]);
    renderPageWithI18n(<Index />, i18n);

    expect(await screen.findByText("Sin actividad registrada aún.")).toBeInTheDocument();
  });

  it("shows the AI insight cards, now in Spanish", async () => {
    renderPageWithI18n(<Index />, i18n);

    expect(await screen.findByText("Insights de IA")).toBeInTheDocument();
    expect(screen.getByText("Asistente de ventas")).toBeInTheDocument();
    expect(screen.getByText("Agente de inventario")).toBeInTheDocument();
    expect(screen.getByText("Motor de workflows")).toBeInTheDocument();
  });
});

describe("Index, in a second language", () => {
  it("has no string left outside the catalogue", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPageWithI18n(<Index />, english);
    await screen.findByText("EN(Total facturado)");
    await screen.findByText("Llamar al cliente");

    // Las iniciales del avatar (`LL`, `EN`) salen del titulo de cada actividad: son datos.
    const INITIALS = /^[A-Z]{2}$/;

    expect(
      notFromCatalogue(visibleStrings(container), DATA, [FORMATTED_CURRENCY, FORMATTED_RELATIVE, INITIALS]),
    ).toEqual([]);
  });

  it("translates the statuses and the activity types", async () => {
    const english = await createPseudoInstance("en");
    renderPageWithI18n(<Index />, english);

    expect(await screen.findByText("EN(stock bajo)")).toBeInTheDocument();
    expect(screen.getByText("EN(agotado)")).toBeInTheDocument();
    expect(screen.getByText("EN(llamada)", { exact: false })).toBeInTheDocument();
  });

  it("formats amounts and times with the second language's conventions", async () => {
    const english = await createPseudoInstance("en");
    renderPageWithI18n(<Index />, english);

    // `$12.5K` y `5m ago` los pone Intl segun el locale, no el catalogo.
    expect(await screen.findByText("$12.5K")).toBeInTheDocument();
    expect(screen.getByText("5m ago", { exact: false })).toBeInTheDocument();
  });
});
