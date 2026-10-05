import { fireEvent, screen } from "@testing-library/react";
import i18next, { type i18n as I18n } from "i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildI18nOptions, resources } from "@/i18n";
import InventoryOrders from "@/pages/InventoryOrders";
import { renderPageWithI18n } from "@/test/i18n";

/**
 * `inventory` en el ingles *real* (tarea 12 del plan de i18n): el centro de operaciones
 * comerciales con sus diez pestanas, la tabla de existencias y los paneles con el
 * catalogo `en` que se envia. Los estados salen del `en` de `common`.
 */

const svc = vi.hoisted(() => ({ getItems: vi.fn() }));
vi.mock("@/services/inventory", () => ({ inventoryService: svc }));

async function english(): Promise<I18n> {
  const instance = i18next.createInstance();
  await instance.init(buildI18nOptions(resources, "en"));
  return instance;
}

const item = (over: Record<string, unknown> = {}) => ({
  id: "i1", product_id: "p1", product_name: "Shoes", sku: "Z-1", quantity_on_hand: 10, quantity_reserved: 2,
  quantity_available: 8, reorder_point: 5, reorder_quantity: 10, unit_cost: 20, location: null, status: "in_stock",
  created_at: "", updated_at: "", ...over,
});

const renderPage = (instance: I18n) => renderPageWithI18n(<InventoryOrders />, instance);
const openTab = (name: string) => fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });

beforeEach(() => {
  svc.getItems.mockReset().mockResolvedValue([
    item(),
    item({ id: "i2", product_name: "Boots", sku: "B-1", status: "low_stock", quantity_on_hand: 2 }),
    item({ id: "i3", product_name: null, sku: null, status: "out_of_stock", quantity_on_hand: 0 }),
  ]);
});

describe("InventoryOrders in English", () => {
  it("renders the header and the KPIs", async () => {
    renderPage(await english());

    expect(screen.getByRole("heading", { name: "Commerce operations center" })).toBeInTheDocument();
    expect(screen.getByText("Unified management of inventory, orders and fulfillment across every channel.")).toBeInTheDocument();
    for (const text of ["Total SKUs", "Inventory value", "Inventory health", "Low stock alerts",
      "products in inventory", "cost in stock", "items at healthy levels", "SKUs need restocking"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.queryByText("Valor de inventario")).not.toBeInTheDocument();
  });

  it("shows the health as a percentage of items that are not low or out of stock", async () => {
    renderPage(await english());
    expect(await screen.findByText("33%")).toBeInTheDocument();
  });

  it("names the ten tabs in English", async () => {
    renderPage(await english());

    for (const tab of ["Catalog", "Inventory", "Orders", "Fulfillment", "Pricing", "CRM sync",
      "RevPath", "Channels", "AI assistant", "Analytics"]) {
      expect(screen.getByRole("tab", { name: tab })).toBeInTheDocument();
    }
  });

  it("shows the catalog builder card", async () => {
    renderPage(await english());

    expect(screen.getByText("Product catalog builder")).toBeInTheDocument();
    expect(screen.getByText("Add product")).toBeInTheDocument();
    expect(screen.getByText("SKU, price, cost, barcode")).toBeInTheDocument();
  });

  it("lists the stock with English columns and statuses", async () => {
    renderPage(await english());
    openTab("Inventory");

    expect(await screen.findByText("Shoes")).toBeInTheDocument();
    for (const col of ["Product", "SKU", "On hand", "Reserved", "Available", "Reorder point", "Unit cost", "Total value", "Status"]) {
      expect(screen.getByRole("columnheader", { name: col })).toBeInTheDocument();
    }
    expect(screen.getByText("low stock")).toBeInTheDocument();
    expect(screen.getByText("out of stock")).toBeInTheDocument();
    expect(screen.getByText("in stock", { selector: "div" })).toBeInTheDocument();
  });

  it("explains an empty inventory", async () => {
    svc.getItems.mockResolvedValue([]);
    renderPage(await english());
    openTab("Inventory");

    expect(await screen.findByText("No inventory items. Add products from the Sales module.")).toBeInTheDocument();
  });

  it.each([
    ["Orders", "Unified order management"],
    ["Fulfillment", "Fulfillment engine"],
    ["Pricing", "Pricing and promotions"],
    ["CRM sync", "CRM integration"],
    ["RevPath", "RevPath integration"],
    ["Channels", "Omnichannel commerce"],
    ["AI assistant", "AI supply assistant"],
    ["Analytics", "Commerce analytics"],
  ])("renders the %s panel in English", async (tab, title) => {
    renderPage(await english());
    openTab(tab);

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
  });

  it("shows the demo orders with their channel and status", async () => {
    renderPage(await english());
    openTab("Orders");

    expect(screen.getByText("via Online store • Sarah Jenkins")).toBeInTheDocument();
    expect(screen.getByText("via POS terminal • Walk-in customer")).toBeInTheDocument();
    expect(screen.getByText("Processing")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("shows the revenue path steps", async () => {
    renderPage(await english());
    openTab("RevPath");

    for (const step of ["Lead", "Opportunity", "Order", "Revenue", "Repeat purchase"]) {
      expect(screen.getByText(step)).toBeInTheDocument();
    }
  });

  it("shows the AI insight with its quotation marks", async () => {
    renderPage(await english());
    openTab("AI assistant");

    expect(screen.getByText(/high demand is expected for "Enterprise bundles" next week/)).toBeInTheDocument();
  });
});
