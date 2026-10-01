import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import QuoteDetail from "@/pages/QuoteDetail";
import {
  FORMATTED_CURRENCY, createPseudoInstance, notFromCatalogue, renderPageWithI18n, visibleStrings,
} from "@/test/i18n";

const svc = vi.hoisted(() => ({
  getQuote: vi.fn(), getQuoteHistory: vi.fn(), updateLine: vi.fn(), addLine: vi.fn(), removeLine: vi.fn(),
  updateQuote: vi.fn(), sendQuote: vi.fn(), acceptQuote: vi.fn(), rejectQuote: vi.fn(), getQuotePdfUrl: vi.fn(),
}));
const portal = vi.hoisted(() => ({ getSessions: vi.fn(), createSession: vi.fn(), sendEmail: vi.fn() }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }));

vi.mock("@/services/sales", () => ({ salesService: svc }));
vi.mock("@/services/portal", () => ({ portalService: portal }));
vi.mock("sonner", () => ({ toast }));

/** Datos del usuario (numeros, lineas, notas, eventos): no son texto de la interfaz. */
const DATA = ["Q-001", "Propuesta Sol", "Zapatos", "Notas del cliente", "Condiciones", "Cotización enviada por correo", "ana@sol.co", "Z-1", "par"];
const FORMATTED_DATE = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
const FORMATTED_DATETIME = /\d{1,2}:\d{2}/;
const PERCENT = /^-?[\d.]+$/;

const line = (over: Record<string, unknown> = {}) => ({
  id: "l1", quote_id: "q1", line_order: 1, description: "Zapatos", quantity: 2, unit_price: 50, discount_percent: 0,
  sku: "Z-1", unit: "par", tax_percent: 0, notes: null, amount: 100, product_id: null, created_at: "", updated_at: "", ...over,
});
const quote = (over: Record<string, unknown> = {}) => ({
  id: "q1", workspace_id: "w1", quote_number: "Q-001", title: "Propuesta Sol", status: "draft", currency: "USD",
  subtotal: 100, discount_amount: 10, tax_rate: 0, tax_amount: 5, total: 95, valid_until: null, notes: "Notas del cliente",
  terms: "Condiciones", sent_at: null, accepted_at: null, rejected_at: null, lines: [line()], contact_id: null,
  organization_id: null, opportunity_id: null, owner_id: null, created_at: "", updated_at: "2026-01-01", ...over,
});

const render = (instance = i18n) =>
  renderPageWithI18n(<QuoteDetail />, instance, { entry: "/sales/quotes/q1", path: "/sales/quotes/:id" });

beforeEach(() => {
  Object.values(svc).forEach((fn) => fn.mockReset());
  Object.values(portal).forEach((fn) => fn.mockReset());
  Object.values(toast).forEach((fn) => fn.mockReset());
  svc.getQuote.mockResolvedValue(quote());
  svc.getQuoteHistory.mockResolvedValue([
    { id: "e1", quote_id: "q1", user_id: null, event_type: "sent", description: "Cotización enviada por correo", metadata: null, created_at: "2026-03-05T10:00:00Z" },
  ]);
  svc.updateLine.mockResolvedValue({});
  svc.addLine.mockResolvedValue({});
  svc.removeLine.mockResolvedValue(undefined);
  svc.updateQuote.mockResolvedValue({});
  svc.sendQuote.mockResolvedValue({});
  svc.acceptQuote.mockResolvedValue({});
  svc.rejectQuote.mockResolvedValue({});
  svc.getQuotePdfUrl.mockReturnValue("/pdf");
  portal.getSessions.mockResolvedValue([]);
  portal.createSession.mockResolvedValue({ id: "s1", portal_url: "https://x/portal/t", client_email: null, expires_at: "" });
  portal.sendEmail.mockResolvedValue({});
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});

describe("QuoteDetail, in Spanish", () => {
  it("renders the header, the line table, the totals and the notes", async () => {
    render();

    expect(await screen.findByText("Propuesta Sol")).toBeInTheDocument();
    expect(screen.getByText("Borrador")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cotizaciones/ })).toBeInTheDocument();
    for (const col of ["#", "SKU", "Descripción", "Unidad", "Cant.", "P. Unit", "Desc%", "IVA%", "Total línea", "Notas"]) {
      expect(screen.getByRole("columnheader", { name: col })).toBeInTheDocument();
    }
    for (const text of ["Líneas", "Subtotal", "Descuento", "Impuestos", "Total", "Notas generales", "Términos y condiciones", "Historial"]) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
    expect(screen.getByPlaceholderText("Notas visibles al cliente...")).toHaveValue("Notas del cliente");
    expect(screen.getByPlaceholderText("Términos de la cotización...")).toHaveValue("Condiciones");
    expect(await screen.findByText("Cotización enviada por correo")).toBeInTheDocument();
  });

  it("offers the draft actions and adds a line with a Spanish description", async () => {
    render();
    await screen.findByText("Propuesta Sol");

    expect(screen.getByRole("button", { name: "Enviar" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Agregar línea/ }));

    await waitFor(() => expect(svc.addLine).toHaveBeenCalledWith("q1", expect.objectContaining({ description: "Nueva línea" })));
  });

  it("sends the quote and confirms", async () => {
    render();
    fireEvent.click(await screen.findByRole("button", { name: "Enviar" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Cotización enviada"));
  });

  it("offers accept and reject on a sent quote and no line editing", async () => {
    svc.getQuote.mockResolvedValue(quote({ status: "sent" }));
    render();

    expect(await screen.findByRole("button", { name: "Aceptar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rechazar" })).toBeInTheDocument();
    expect(screen.getByText("Enviada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Agregar línea/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Aceptar" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Cotización aceptada — orden creada"));
  });

  it("rejects a sent quote and confirms", async () => {
    svc.getQuote.mockResolvedValue(quote({ status: "sent" }));
    render();
    fireEvent.click(await screen.findByRole("button", { name: "Rechazar" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Cotización rechazada"));
  });

  it("explains why a processed quote cannot be shared", async () => {
    svc.getQuote.mockResolvedValue(quote({ status: "accepted" }));
    render();

    const share = await screen.findByRole("button", { name: /Compartir/ });
    expect(share).toBeDisabled();
    expect(share).toHaveAttribute("title", "Cotización ya procesada");
  });

  it("explains an empty quote differently when it is editable", async () => {
    svc.getQuote.mockResolvedValue(quote({ lines: [] }));
    render();
    expect(await screen.findByText("Sin líneas. Agrega una para comenzar.")).toBeInTheDocument();
  });

  it("explains an empty processed quote without inviting to add", async () => {
    svc.getQuote.mockResolvedValue(quote({ lines: [], status: "accepted" }));
    render();
    expect(await screen.findByText("Sin líneas.")).toBeInTheDocument();
  });

  it("explains a missing quote and offers the way back", async () => {
    svc.getQuote.mockRejectedValue(new Error("404"));
    render();

    expect(await screen.findByText("Cotización no encontrada.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Volver a Ventas/ })).toBeInTheDocument();
  });

  it("explains an empty history", async () => {
    svc.getQuoteHistory.mockResolvedValue([]);
    render();
    expect(await screen.findByText("Sin eventos registrados.")).toBeInTheDocument();
  });

  it("opens the share dialog with the validity options as short day units", async () => {
    render();
    fireEvent.click(await screen.findByRole("button", { name: /Compartir/ }));

    expect(await screen.findByText("Compartir cotización")).toBeInTheDocument();
    expect(screen.getByText("Nombre del cliente")).toBeInTheDocument();
    expect(screen.getByText("Válida por")).toBeInTheDocument();
    for (const d of ["7d", "14d", "30d"]) expect(screen.getByRole("button", { name: d })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("juan@empresa.com")).toBeInTheDocument();
  });

  it("copies the link and confirms", async () => {
    render();
    fireEvent.click(await screen.findByRole("button", { name: /Compartir/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Copiar link/ }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Link copiado"));
  });

  it("sends the email and says to whom", async () => {
    render();
    fireEvent.click(await screen.findByRole("button", { name: /Compartir/ }));
    fireEvent.change(await screen.findByPlaceholderText("juan@empresa.com"), { target: { value: "ana@sol.co" } });
    fireEvent.click(screen.getByRole("button", { name: /Enviar email/ }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Email enviado a ana@sol.co"));
  });

  it("shows the active-link banner with the recipient", async () => {
    const future = new Date(Date.now() + 5 * 86400000).toISOString();
    portal.getSessions.mockResolvedValue([{ id: "s1", action: null, expires_at: future, client_email: "ana@sol.co", portal_url: "u" }]);
    render();

    expect(await screen.findByText(/✓ Link activo — enviado a ana@sol\.co · expira/)).toBeInTheDocument();
    expect(screen.getByText("Reenviar / nuevo link")).toBeInTheDocument();
  });

  it("shows the active-link banner without a recipient", async () => {
    const future = new Date(Date.now() + 5 * 86400000).toISOString();
    portal.getSessions.mockResolvedValue([{ id: "s1", action: null, expires_at: future, client_email: null, portal_url: "u" }]);
    render();

    expect(await screen.findByText(/^✓ Link activo · expira/)).toBeInTheDocument();
  });

  it("reports a failed save with the translated prefix", async () => {
    svc.updateLine.mockRejectedValue(new Error("boom"));
    render();
    const input = (await screen.findAllByDisplayValue("Zapatos"))[0];
    fireEvent.change(input, { target: { value: "Botas" } });
    fireEvent.blur(input);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/^Error al guardar: /)));
  });
});

describe("QuoteDetail, in a second language", () => {
  const strings = (root: HTMLElement) =>
    notFromCatalogue(visibleStrings(root), DATA, [FORMATTED_CURRENCY, FORMATTED_DATE, FORMATTED_DATETIME, PERCENT]);

  it("has no string left outside the catalogue on a draft", async () => {
    const english = await createPseudoInstance("en");
    const { container } = render(english);
    await screen.findByText("EN(Líneas)");

    expect(strings(container)).toEqual([]);
  });

  it("has no string left outside the catalogue on a sent quote with an active link", async () => {
    const future = new Date(Date.now() + 5 * 86400000).toISOString();
    portal.getSessions.mockResolvedValue([{ id: "s1", action: null, expires_at: future, client_email: "ana@sol.co", portal_url: "u" }]);
    svc.getQuote.mockResolvedValue(quote({ status: "sent" }));
    const english = await createPseudoInstance("en");
    const { container } = render(english);
    await screen.findByText("EN(Reenviar / nuevo link)");

    expect(strings(container)).toEqual([]);
    expect(screen.getByText("EN(Enviada)")).toBeInTheDocument();
  });

  it("has no string left outside the catalogue with no lines and no history", async () => {
    svc.getQuote.mockResolvedValue(quote({ lines: [] }));
    svc.getQuoteHistory.mockResolvedValue([]);
    const english = await createPseudoInstance("en");
    const { container } = render(english);
    await screen.findByText("EN(Sin líneas. Agrega una para comenzar.)");

    expect(strings(container)).toEqual([]);
  });

  it("has no string left outside the catalogue when the quote is missing", async () => {
    svc.getQuote.mockRejectedValue(new Error("404"));
    const english = await createPseudoInstance("en");
    const { container } = render(english);
    await screen.findByText("EN(Cotización no encontrada.)");

    expect(strings(container)).toEqual([]);
  });

  it("has no string left outside the catalogue in the share dialog", async () => {
    const english = await createPseudoInstance("en");
    render(english);
    fireEvent.click(await screen.findByRole("button", { name: /EN\(Compartir\)/ }));
    const dialog = await screen.findByRole("dialog");

    expect(strings(dialog)).toEqual([]);
    expect(screen.getByRole("button", { name: "7d" })).toBeInTheDocument();
  });
});
