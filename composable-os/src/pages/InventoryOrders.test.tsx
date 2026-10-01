import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import InventoryOrders from "@/pages/InventoryOrders";
import {
  FORMATTED_CURRENCY, createPseudoInstance, notFromCatalogue, renderPageWithI18n, visibleStrings,
} from "@/test/i18n";

const svc = vi.hoisted(() => ({ getItems: vi.fn() }));
vi.mock("@/services/inventory", () => ({ inventoryService: svc }));

/** Datos del usuario (productos, SKU) y los ids de demostracion de la pestana de ordenes. */
const DATA = ["Zapatos", "Botas", "Z-1", "B-1", "ORD-2023-492", "ORD-2023-491", "Sarah Jenkins"];
const PERCENT = /^\d+(\.\d+)?%$/;
const COUNT = /^\d+$/;

const item = (over: Record<string, unknown> = {}) => ({
  id: "i1", product_id: "p1", product_name: "Zapatos", sku: "Z-1", quantity_on_hand: 10, quantity_reserved: 2,
  quantity_available: 8, reorder_point: 5, reorder_quantity: 10, unit_cost: 20, location: null, status: "in_stock",
  created_at: "", updated_at: "", ...over,
});

const renderPage = (instance = i18n) => renderPageWithI18n(<InventoryOrders />, instance);
const openTab = (name: string | RegExp) => fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });

beforeEach(() => {
  svc.getItems.mockReset().mockResolvedValue([
    item(),
    item({ id: "i2", product_name: "Botas", sku: "B-1", status: "low_stock", quantity_on_hand: 2 }),
    item({ id: "i3", product_name: null, sku: null, status: "out_of_stock", quantity_on_hand: 0 }),
  ]);
});

describe("InventoryOrders, in Spanish", () => {
  it("renders the header and the KPIs, where it used to mix English and Spanish", async () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Centro de operaciones comerciales" })).toBeInTheDocument();
    expect(screen.getByText("Gestión unificada de inventario, órdenes y entregas en todos los canales.")).toBeInTheDocument();
    for (const text of ["Total de SKU", "Valor de inventario", "Salud del inventario", "Alertas de stock bajo",
      "productos en inventario", "costo en stock", "ítems en nivel óptimo", "SKU requieren reposición"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });

  it("shows the health as a percentage of items that are not low or out of stock", async () => {
    renderPage();
    expect(await screen.findByText("33%")).toBeInTheDocument();
  });

  it("names the ten tabs in Spanish", () => {
    renderPage();

    for (const tab of ["Catálogo", "Inventario", "Órdenes", "Entregas", "Precios", "Sincronización CRM",
      "RevPath", "Canales", "Asistente IA", "Analítica"]) {
      expect(screen.getByRole("tab", { name: tab })).toBeInTheDocument();
    }
  });

  it("shows the catalogue builder card", () => {
    renderPage();

    expect(screen.getByText("Constructor de catálogo de productos")).toBeInTheDocument();
    expect(screen.getByText("Agregar producto")).toBeInTheDocument();
    expect(screen.getByText("SKU, precio, costo, código de barras")).toBeInTheDocument();
  });

  it("lists the stock with translated columns and statuses", async () => {
    renderPage();
    openTab("Inventario");

    expect(await screen.findByText("Zapatos")).toBeInTheDocument();
    for (const col of ["Producto", "SKU", "En stock", "Reservado", "Disponible", "Punto de reorden", "Costo unit.", "Valor total", "Estado"]) {
      expect(screen.getByRole("columnheader", { name: col })).toBeInTheDocument();
    }
    // Antes: "low stock" / "out of stock", el codigo con el guion bajo cambiado por un espacio.
    expect(screen.getByText("stock bajo")).toBeInTheDocument();
    expect(screen.getByText("agotado")).toBeInTheDocument();
    expect(screen.getByText("en stock", { selector: "div" })).toBeInTheDocument();
  });

  it("falls back to the raw status for one the catalogue does not know", async () => {
    svc.getItems.mockResolvedValue([item({ status: "discontinued_x" })]);
    renderPage();
    openTab("Inventario");

    expect(await screen.findByText("discontinued_x")).toBeInTheDocument();
  });

  it("explains an empty inventory", async () => {
    svc.getItems.mockResolvedValue([]);
    renderPage();
    openTab("Inventario");

    expect(await screen.findByText("Sin ítems de inventario. Agrega productos desde el módulo de Ventas.")).toBeInTheDocument();
  });

  it.each([
    ["Órdenes", "Gestión unificada de órdenes"],
    ["Entregas", "Motor de entregas"],
    ["Precios", "Precios y promociones"],
    ["Sincronización CRM", "Integración con CRM"],
    ["RevPath", "Integración con RevPath"],
    ["Canales", "Comercio omnicanal"],
    ["Asistente IA", "Asistente de suministro con IA"],
    ["Analítica", "Analítica comercial"],
  ])("renders the %s panel in Spanish", (tab, title) => {
    renderPage();
    openTab(tab);

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
  });

  it("shows the revenue path steps", () => {
    renderPage();
    openTab("RevPath");

    for (const step of ["Lead", "Oportunidad", "Orden", "Ingresos", "Recompra"]) {
      expect(screen.getByText(step)).toBeInTheDocument();
    }
  });
});

describe("InventoryOrders, in a second language", () => {
  const strings = (root: HTMLElement) =>
    notFromCatalogue(visibleStrings(root), DATA, [FORMATTED_CURRENCY, PERCENT, COUNT]);

  it("has no string left outside the catalogue in the catalogue tab", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPage(english);
    await screen.findByText("33%");

    expect(strings(container)).toEqual([]);
  });

  it("has no string left outside the catalogue in the stock table", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPage(english);
    openTab("EN(Inventario)");
    await screen.findByText("Zapatos");

    expect(strings(container)).toEqual([]);
    expect(screen.getByText("EN(stock bajo)")).toBeInTheDocument();
  });

  it("has no string left outside the catalogue when the inventory is empty", async () => {
    svc.getItems.mockResolvedValue([]);
    const english = await createPseudoInstance("en");
    const { container } = renderPage(english);
    openTab("EN(Inventario)");
    await screen.findByText("EN(Sin ítems de inventario. Agrega productos desde el módulo de Ventas.)");

    expect(strings(container)).toEqual([]);
  });

  it.each(["Órdenes", "Entregas", "Precios", "Sincronización CRM", "RevPath", "Canales", "Asistente IA", "Analítica"])(
    "has no string left outside the catalogue in the %s panel",
    async (tab) => {
      const english = await createPseudoInstance("en");
      const { container } = renderPage(english);
      openTab(`EN(${tab})`);
      await screen.findByRole("tab", { name: `EN(${tab})`, selected: true });

      expect(strings(container)).toEqual([]);
    },
  );
});
