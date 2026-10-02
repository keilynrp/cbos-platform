import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import Sales from "@/pages/Sales";
import {
  FORMATTED_CURRENCY, createPseudoInstance, notFromCatalogue, renderPageWithI18n, visibleStrings,
} from "@/test/i18n";

const svc = vi.hoisted(() => ({
  getQuotes: vi.fn(), getOrders: vi.fn(), createQuote: vi.fn(), sendQuote: vi.fn(), acceptQuote: vi.fn(),
  rejectQuote: vi.fn(), confirmOrder: vi.fn(), startFulfillment: vi.fn(), fulfillOrder: vi.fn(),
  cancelOrder: vi.fn(), getQuotePdfUrl: vi.fn(),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }));

vi.mock("@/services/sales", () => ({ salesService: svc }));
vi.mock("sonner", () => ({ toast }));

/** Datos del usuario (numeros y titulos): no son texto de la interfaz. */
const DATA = ["Q-001", "Q-002", "Q-003", "Propuesta Sol", "Propuesta Luna", "Propuesta Mar", "ORD-001", "ORD-002", "ORD-003", "abcdef12…"];
const PERCENT = /^\d+(\.\d+)?%$/;
const COUNT = /^\d+$/;

const quote = (over: Record<string, unknown> = {}) => ({
  id: "q1", quote_number: "Q-001", title: "Propuesta Sol", status: "draft", total: 100, ...over,
});
const order = (over: Record<string, unknown> = {}) => ({
  id: "o1", order_number: "ORD-001", status: "draft", total: 250, quote_id: "abcdef1234567890", ...over,
});

const renderPage = (instance = i18n) => renderPageWithI18n(<Sales />, instance);
const openTab = (name: string | RegExp) => fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });

beforeEach(() => {
  Object.values(svc).forEach((fn) => fn.mockReset());
  Object.values(toast).forEach((fn) => fn.mockReset());
  svc.getQuotes.mockResolvedValue([
    quote(),
    quote({ id: "q2", quote_number: "Q-002", title: "Propuesta Luna", status: "sent", total: 300 }),
    quote({ id: "q3", quote_number: "Q-003", title: "Propuesta Mar", status: "accepted", total: 50 }),
  ]);
  svc.getOrders.mockResolvedValue([
    order(),
    order({ id: "o2", order_number: "ORD-002", status: "confirmed" }),
    order({ id: "o3", order_number: "ORD-003", status: "in_fulfillment" }),
  ]);
  svc.sendQuote.mockResolvedValue({});
  svc.acceptQuote.mockResolvedValue({});
  svc.rejectQuote.mockResolvedValue({});
  svc.createQuote.mockResolvedValue({});
  svc.confirmOrder.mockResolvedValue({});
  svc.startFulfillment.mockResolvedValue({});
  svc.fulfillOrder.mockResolvedValue({});
  svc.cancelOrder.mockResolvedValue({});
  svc.getQuotePdfUrl.mockReturnValue("/pdf");
});

describe("Sales, in Spanish", () => {
  it("renders the header, the tabs and the KPIs, where it used to say 'Sales' and 'Open Quotes'", async () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Ventas" })).toBeInTheDocument();
    expect(screen.getByText("Gestiona cotizaciones y órdenes — conectado al backend en tiempo real.")).toBeInTheDocument();
    for (const tab of ["Panel", "Cotizaciones", "Órdenes"]) {
      expect(screen.getByRole("tab", { name: tab })).toBeInTheDocument();
    }
    for (const kpi of ["Cotizaciones abiertas", "Valor del pipeline", "Tasa de conversión", "Órdenes activas"]) {
      expect(await screen.findByText(kpi)).toBeInTheDocument();
    }
  });

  it("shows the conversion rate as a percentage and says N/D when nothing was decided", async () => {
    svc.getQuotes.mockResolvedValue([quote({ status: "accepted" }), quote({ id: "q2", status: "rejected" }), quote({ id: "q3", status: "accepted" })]);
    renderPage();
    expect(await screen.findByText("67%")).toBeInTheDocument();
  });

  it("falls back to N/D with no accepted or rejected quotes", async () => {
    svc.getQuotes.mockResolvedValue([quote()]);
    renderPage();
    await screen.findByText("Tasa de conversión");
    expect(screen.getByText("N/D")).toBeInTheDocument();
  });

  it("names every status in the dashboard breakdowns", async () => {
    renderPage();

    expect(await screen.findByText("Cotizaciones por estado")).toBeInTheDocument();
    expect(screen.getByText("Órdenes por estado")).toBeInTheDocument();
    for (const status of ["Enviada", "Aceptada", "Rechazada", "Vencida", "Confirmada", "En preparación", "Completada", "Cancelada"]) {
      expect(screen.getAllByText(status).length).toBeGreaterThan(0);
    }
  });

  it("lists the quotes with translated columns, filters and statuses", async () => {
    renderPage();
    openTab("Cotizaciones");

    expect(await screen.findByText("Propuesta Sol")).toBeInTheDocument();
    for (const col of ["N.º de cotización", "Título", "Estado", "Total", "Acciones"]) {
      expect(screen.getByRole("columnheader", { name: col })).toBeInTheDocument();
    }
    for (const chip of ["Todas", "Borrador", "Enviada", "Aceptada", "Rechazada"]) {
      expect(screen.getByRole("button", { name: chip })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Enviar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aceptar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rechazar" })).toBeInTheDocument();
  });

  it("explains an empty quote list", async () => {
    svc.getQuotes.mockResolvedValue([]);
    renderPage();
    openTab("Cotizaciones");

    expect(await screen.findByText("Sin cotizaciones")).toBeInTheDocument();
  });

  it("sends a quote and confirms", async () => {
    renderPage();
    openTab("Cotizaciones");
    fireEvent.click(await screen.findByRole("button", { name: "Enviar" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Cotización enviada"));
  });

  it("accepts a quote and confirms that an order was created", async () => {
    renderPage();
    openTab("Cotizaciones");
    fireEvent.click(await screen.findByRole("button", { name: "Aceptar" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Cotización aceptada — orden creada"));
  });

  it("rejects a quote through the dialog, sending a Spanish default reason", async () => {
    renderPage();
    openTab("Cotizaciones");
    fireEvent.click(await screen.findByRole("button", { name: "Rechazar" }));

    expect(await screen.findByText("Rechazar Cotización")).toBeInTheDocument();
    expect(screen.getByText("Razón (opcional)")).toBeInTheDocument();
    fireEvent.click(within_dialog("Rechazar"));

    await waitFor(() => expect(svc.rejectQuote).toHaveBeenCalledWith("q2", "Sin razón indicada"));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Cotización rechazada"));
  });

  it("creates a quote with a Spanish placeholder line and confirms", async () => {
    renderPage();
    openTab("Cotizaciones");
    fireEvent.click(await screen.findByRole("button", { name: /Nueva Cotización/ }));

    fireEvent.change(await screen.findByPlaceholderText("Ej. Propuesta de servicios Q1"), { target: { value: "X" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Cotización creada"));
    expect(svc.createQuote).toHaveBeenCalledWith(expect.objectContaining({
      lines: [expect.objectContaining({ description: "Artículo" })],
    }));
  });

  it("lists the orders with translated filters, columns and per-status actions", async () => {
    renderPage();
    openTab("Órdenes");

    expect(await screen.findByText("ORD-001")).toBeInTheDocument();
    for (const col of ["N.º de orden", "ID de cotización", "Estado", "Total", "Acciones"]) {
      expect(screen.getByRole("columnheader", { name: col })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Iniciar preparación" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Completar" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Cancelar" })).toHaveLength(2);
  });

  it.each([
    ["Confirmar", "Orden confirmada"],
    ["Iniciar preparación", "Preparación iniciada"],
    ["Completar", "Orden completada"],
  ])("confirms the action %s", async (button, message) => {
    renderPage();
    openTab("Órdenes");
    fireEvent.click(await screen.findByRole("button", { name: button }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(message));
  });

  it("cancels an order and confirms", async () => {
    renderPage();
    openTab("Órdenes");
    fireEvent.click((await screen.findAllByRole("button", { name: "Cancelar" }))[0]);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Orden cancelada"));
  });

  it("explains an empty order list", async () => {
    svc.getOrders.mockResolvedValue([]);
    renderPage();
    openTab("Órdenes");

    expect(await screen.findByText("Sin órdenes")).toBeInTheDocument();
  });

  it("surfaces a failed load as a translated toast", async () => {
    svc.getQuotes.mockRejectedValue(new Error("down"));
    renderPage();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Error cargando cotizaciones: down"), { timeout: 5000 });
  });
});

/** El boton de confirmacion del dialogo, que comparte nombre con el de la fila. */
function within_dialog(name: string) {
  const dialog = screen.getByRole("dialog");
  return Array.from(dialog.querySelectorAll("button")).find((b) => b.textContent === name) as HTMLElement;
}

describe("Sales, in a second language", () => {
  const strings = (root: HTMLElement) =>
    notFromCatalogue(visibleStrings(root), DATA, [FORMATTED_CURRENCY, PERCENT, COUNT]);

  it("has no string left outside the catalogue on the dashboard", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPage(english);
    await screen.findByText("EN(Cotizaciones por estado)");

    expect(strings(container)).toEqual([]);
  });

  it("has no string left outside the catalogue in the quotes tab", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPage(english);
    openTab("EN(Cotizaciones)");
    await screen.findByText("Propuesta Sol");

    expect(strings(container)).toEqual([]);
  });

  it("has no string left outside the catalogue in the orders tab", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPage(english);
    openTab("EN(Órdenes)");
    await screen.findByText("ORD-001");

    expect(strings(container)).toEqual([]);
  });

  it("has no string left outside the catalogue in the reject and new-quote dialogs", async () => {
    const english = await createPseudoInstance("en");
    renderPage(english);
    openTab("EN(Cotizaciones)");

    fireEvent.click(await screen.findByRole("button", { name: "EN(Rechazar)" }));
    expect(strings(await screen.findByRole("dialog"))).toEqual([]);
    fireEvent.click(within_dialog("EN(Cancelar)"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /EN\(Nueva Cotización\)/ }));
    expect(strings(await screen.findByRole("dialog"))).toEqual([]);
  });
});
