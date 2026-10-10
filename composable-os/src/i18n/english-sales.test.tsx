import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import i18next, { type i18n as I18n } from "i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildI18nOptions, resources } from "@/i18n";
import QuoteDetail from "@/pages/QuoteDetail";
import Sales from "@/pages/Sales";
import { renderPageWithI18n } from "@/test/i18n";

/**
 * `sales` en el ingles *real* (tarea 12 del plan de i18n): el panel de ventas, las
 * cotizaciones y las ordenes (`Sales`) y el detalle de una cotizacion con su dialogo
 * de compartir (`QuoteDetail`), con el catalogo `en` que se envia. Los estados salen
 * del `en` de `common`.
 */

const svc = vi.hoisted(() => ({
  getQuotes: vi.fn(), getOrders: vi.fn(), createQuote: vi.fn(), sendQuote: vi.fn(), acceptQuote: vi.fn(),
  rejectQuote: vi.fn(), confirmOrder: vi.fn(), startFulfillment: vi.fn(), fulfillOrder: vi.fn(),
  cancelOrder: vi.fn(), getQuotePdfUrl: vi.fn(),
  getQuote: vi.fn(), getQuoteHistory: vi.fn(), updateLine: vi.fn(), addLine: vi.fn(), removeLine: vi.fn(),
  updateQuote: vi.fn(),
}));
const portal = vi.hoisted(() => ({ getSessions: vi.fn(), createSession: vi.fn(), sendEmail: vi.fn() }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }));

vi.mock("@/services/sales", () => ({ salesService: svc }));
vi.mock("@/services/portal", () => ({ portalService: portal }));
vi.mock("sonner", () => ({ toast }));

async function english(): Promise<I18n> {
  const instance = i18next.createInstance();
  await instance.init(buildI18nOptions(resources, "en"));
  return instance;
}

const quote = (over: Record<string, unknown> = {}) => ({
  id: "q1", quote_number: "Q-001", title: "Sun proposal", status: "draft", total: 100, ...over,
});
const order = (over: Record<string, unknown> = {}) => ({
  id: "o1", order_number: "ORD-001", status: "draft", total: 250, quote_id: "abcdef1234567890", ...over,
});

const line = (over: Record<string, unknown> = {}) => ({
  id: "l1", quote_id: "q1", line_order: 1, description: "Shoes", quantity: 2, unit_price: 50, discount_percent: 0,
  sku: "Z-1", unit: "pair", tax_percent: 0, notes: null, amount: 100, product_id: null, created_at: "", updated_at: "", ...over,
});
const fullQuote = (over: Record<string, unknown> = {}) => ({
  id: "q1", workspace_id: "w1", quote_number: "Q-001", title: "Sun proposal", status: "draft", currency: "USD",
  subtotal: 100, discount_amount: 10, tax_rate: 0, tax_amount: 5, total: 95, valid_until: null, notes: "Customer notes",
  terms: "Conditions", sent_at: null, accepted_at: null, rejected_at: null, lines: [line()], contact_id: null,
  organization_id: null, opportunity_id: null, owner_id: null, created_at: "", updated_at: "2026-01-01", ...over,
});

const renderSales = (instance: I18n) => renderPageWithI18n(<Sales />, instance);
const renderDetail = (instance: I18n) =>
  renderPageWithI18n(<QuoteDetail />, instance, { entry: "/sales/quotes/q1", path: "/sales/quotes/:id" });
const openTab = (name: string) => fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });
/** El boton de confirmacion del dialogo, que comparte nombre con el de la fila. */
function inDialog(name: string) {
  const dialog = screen.getByRole("dialog");
  return Array.from(dialog.querySelectorAll("button")).find((b) => b.textContent === name) as HTMLElement;
}

beforeEach(() => {
  Object.values(svc).forEach((fn) => fn.mockReset());
  Object.values(portal).forEach((fn) => fn.mockReset());
  Object.values(toast).forEach((fn) => fn.mockReset());
  svc.getQuotes.mockResolvedValue([
    quote(),
    quote({ id: "q2", quote_number: "Q-002", title: "Moon proposal", status: "sent", total: 300 }),
    quote({ id: "q3", quote_number: "Q-003", title: "Sea proposal", status: "accepted", total: 50 }),
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
  svc.getQuote.mockResolvedValue(fullQuote());
  svc.getQuoteHistory.mockResolvedValue([
    // Un evento guardado por un servidor anterior, con la prosa en español: en inglés sale del catálogo.
    { id: "e1", quote_id: "q1", user_id: null, event_type: "sent", description: "Cotización enviada", event_metadata: null, created_at: "2026-03-05T10:00:00Z" },
    { id: "e2", quote_id: "q1", user_id: null, event_type: "rejected", description: "Quote rejected. Reason: Too expensive", event_metadata: { reason: "Too expensive" }, created_at: "2026-03-05T11:00:00Z" },
  ]);
  svc.updateLine.mockResolvedValue({});
  svc.addLine.mockResolvedValue({});
  svc.removeLine.mockResolvedValue(undefined);
  svc.updateQuote.mockResolvedValue({});
  portal.getSessions.mockResolvedValue([]);
  portal.createSession.mockResolvedValue({ id: "s1", portal_url: "https://x/portal/t", client_email: null, expires_at: "" });
  portal.sendEmail.mockResolvedValue({});
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});

describe("Sales in English", () => {
  it("renders the header, the tabs and the KPIs", async () => {
    renderSales(await english());

    expect(screen.getByRole("heading", { name: "Sales" })).toBeInTheDocument();
    expect(screen.getByText("Manage quotes and orders — connected to the backend in real time.")).toBeInTheDocument();
    for (const tab of ["Dashboard", "Quotes", "Orders"]) {
      expect(screen.getByRole("tab", { name: tab })).toBeInTheDocument();
    }
    for (const kpi of ["Open quotes", "Pipeline value", "Conversion rate", "Active orders"]) {
      expect(await screen.findByText(kpi)).toBeInTheDocument();
    }
    expect(screen.queryByText("Ventas")).not.toBeInTheDocument();
  });

  it("shows the conversion rate as a percentage and N/A when nothing was decided", async () => {
    svc.getQuotes.mockResolvedValue([quote({ status: "accepted" }), quote({ id: "q2", status: "rejected" }), quote({ id: "q3", status: "accepted" })]);
    const instance = await english();
    const { unmount } = renderSales(instance);
    expect(await screen.findByText("67%")).toBeInTheDocument();
    unmount();

    svc.getQuotes.mockResolvedValue([quote()]);
    renderSales(instance);
    await screen.findByText("Conversion rate");
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("names every status in the dashboard breakdowns", async () => {
    renderSales(await english());

    expect(await screen.findByText("Quotes by status")).toBeInTheDocument();
    expect(screen.getByText("Orders by status")).toBeInTheDocument();
    for (const status of ["Sent", "Accepted", "Rejected", "Expired", "Confirmed", "In fulfillment", "Fulfilled", "Cancelled"]) {
      expect(screen.getAllByText(status).length).toBeGreaterThan(0);
    }
  });

  it("lists the quotes with English columns, filters and actions", async () => {
    renderSales(await english());
    openTab("Quotes");

    expect(await screen.findByText("Sun proposal")).toBeInTheDocument();
    for (const col of ["Quote no.", "Title", "Status", "Total", "Actions"]) {
      expect(screen.getByRole("columnheader", { name: col })).toBeInTheDocument();
    }
    for (const chip of ["All", "Draft", "Sent", "Accepted", "Rejected"]) {
      expect(screen.getByRole("button", { name: chip })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
  });

  it("explains an empty quote list", async () => {
    svc.getQuotes.mockResolvedValue([]);
    renderSales(await english());
    openTab("Quotes");

    expect(await screen.findByText("No quotes")).toBeInTheDocument();
  });

  it("sends and accepts a quote and confirms each", async () => {
    renderSales(await english());
    openTab("Quotes");

    fireEvent.click(await screen.findByRole("button", { name: "Send" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Quote sent"));

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Quote accepted — order created"));
  });

  it("rejects a quote through the dialog, sending an English default reason", async () => {
    renderSales(await english());
    openTab("Quotes");
    fireEvent.click(await screen.findByRole("button", { name: "Reject" }));

    expect(await screen.findByText("Reject quote")).toBeInTheDocument();
    expect(screen.getByText("Reason (optional)")).toBeInTheDocument();
    fireEvent.click(inDialog("Reject"));

    await waitFor(() => expect(svc.rejectQuote).toHaveBeenCalledWith("q2", "No reason given"));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Quote rejected"));
  });

  it("creates a quote with an English placeholder line and confirms", async () => {
    renderSales(await english());
    openTab("Quotes");
    fireEvent.click(await screen.findByRole("button", { name: /New quote/ }));

    fireEvent.change(await screen.findByPlaceholderText("E.g. Q1 services proposal"), { target: { value: "X" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Quote created"));
    expect(svc.createQuote).toHaveBeenCalledWith(expect.objectContaining({
      lines: [expect.objectContaining({ description: "Item" })],
    }));
  });

  it("lists the orders with English columns and per-status actions", async () => {
    renderSales(await english());
    openTab("Orders");

    expect(await screen.findByText("ORD-001")).toBeInTheDocument();
    for (const col of ["Order no.", "Quote ID", "Status", "Total", "Actions"]) {
      expect(screen.getByRole("columnheader", { name: col })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start fulfillment" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fulfill" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Cancel" })).toHaveLength(2);
  });

  it.each([
    ["Confirm", "Order confirmed"],
    ["Start fulfillment", "Fulfillment started"],
    ["Fulfill", "Order fulfilled"],
  ])("confirms the action %s", async (button, message) => {
    renderSales(await english());
    openTab("Orders");
    fireEvent.click(await screen.findByRole("button", { name: button }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(message));
  });

  it("cancels an order and explains an empty order list", async () => {
    const instance = await english();
    const { unmount } = renderSales(instance);
    openTab("Orders");
    fireEvent.click((await screen.findAllByRole("button", { name: "Cancel" }))[0]);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Order cancelled"));
    unmount();

    svc.getOrders.mockResolvedValue([]);
    renderSales(instance);
    openTab("Orders");
    expect(await screen.findByText("No orders")).toBeInTheDocument();
  });

  it("surfaces a failed load as an English toast", async () => {
    svc.getQuotes.mockRejectedValue(new Error("down"));
    renderSales(await english());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Error loading quotes: down"), { timeout: 5000 });
  });
});

describe("QuoteDetail in English", () => {
  it("renders the header, the line table, the totals and the notes", async () => {
    renderDetail(await english());

    expect(await screen.findByText("Sun proposal")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Quotes/ })).toBeInTheDocument();
    for (const col of ["#", "SKU", "Description", "Unit", "Qty", "Unit price", "Disc%", "Tax%", "Line total", "Notes"]) {
      expect(screen.getByRole("columnheader", { name: col })).toBeInTheDocument();
    }
    for (const text of ["Lines", "Subtotal", "Discount", "Taxes", "Total", "General notes", "Terms and conditions", "History"]) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
    expect(screen.getByPlaceholderText("Notes visible to the customer...")).toHaveValue("Customer notes");
    expect(screen.getByPlaceholderText("Quote terms...")).toHaveValue("Conditions");
    expect(await screen.findByText("Quote sent")).toBeInTheDocument();
    expect(screen.getByText("Quote rejected. Reason: Too expensive")).toBeInTheDocument();
    expect(screen.queryByText("Cotización enviada")).not.toBeInTheDocument();
  });

  it("offers the draft actions and adds a line with an English description", async () => {
    renderDetail(await english());
    await screen.findByText("Sun proposal");

    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Add line/ }));

    await waitFor(() => expect(svc.addLine).toHaveBeenCalledWith("q1", expect.objectContaining({ description: "New line" })));
  });

  it("sends the quote and confirms", async () => {
    renderDetail(await english());
    fireEvent.click(await screen.findByRole("button", { name: "Send" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Quote sent"));
  });

  it("offers accept and reject on a sent quote and no line editing", async () => {
    svc.getQuote.mockResolvedValue(fullQuote({ status: "sent" }));
    renderDetail(await english());

    expect(await screen.findByRole("button", { name: "Accept" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
    expect(screen.getByText("Sent")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add line/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Quote accepted — order created"));
  });

  it("explains why a processed quote cannot be shared", async () => {
    svc.getQuote.mockResolvedValue(fullQuote({ status: "accepted" }));
    renderDetail(await english());

    const share = await screen.findByRole("button", { name: /Share/ });
    expect(share).toBeDisabled();
    expect(share).toHaveAttribute("title", "Quote already processed");
  });

  it("explains an empty quote differently when it is editable", async () => {
    svc.getQuote.mockResolvedValue(fullQuote({ lines: [] }));
    const instance = await english();
    const { unmount } = renderDetail(instance);
    expect(await screen.findByText("No lines. Add one to get started.")).toBeInTheDocument();
    unmount();

    svc.getQuote.mockResolvedValue(fullQuote({ lines: [], status: "accepted" }));
    renderDetail(instance);
    expect(await screen.findByText("No lines.")).toBeInTheDocument();
  });

  it("explains a missing quote and an empty history", async () => {
    svc.getQuote.mockRejectedValue(new Error("404"));
    const instance = await english();
    const { unmount } = renderDetail(instance);
    expect(await screen.findByText("Quote not found.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Back to Sales/ })).toBeInTheDocument();
    unmount();

    svc.getQuote.mockResolvedValue(fullQuote());
    svc.getQuoteHistory.mockResolvedValue([]);
    renderDetail(instance);
    expect(await screen.findByText("No events recorded.")).toBeInTheDocument();
  });

  it("opens the share dialog with the validity options as short day units", async () => {
    renderDetail(await english());
    fireEvent.click(await screen.findByRole("button", { name: /Share/ }));

    expect(await screen.findByText("Share quote")).toBeInTheDocument();
    expect(screen.getByText("Customer name")).toBeInTheDocument();
    expect(screen.getByText("Valid for")).toBeInTheDocument();
    for (const d of ["7d", "14d", "30d"]) expect(screen.getByRole("button", { name: d })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("john@company.com")).toBeInTheDocument();
  });

  it("proposes English for the customer and lets the seller switch to Spanish", async () => {
    renderDetail(await english());
    fireEvent.click(await screen.findByRole("button", { name: /Share/ }));

    const select = await screen.findByLabelText("Customer language");
    expect(select).toHaveValue("en");
    expect(within(select).getByRole("option", { name: "English" })).toBeInTheDocument();
    expect(within(select).getByRole("option", { name: "Español" })).toBeInTheDocument();
    expect(screen.getByText("The email to the customer is sent in this language.")).toBeInTheDocument();

    // «Copy link» no cierra el diálogo, así que se puede probar con los dos idiomas seguidos.
    fireEvent.click(screen.getByRole("button", { name: /Copy link/ }));
    await waitFor(() => expect(portal.createSession).toHaveBeenLastCalledWith(expect.objectContaining({ locale: "en" })));

    fireEvent.change(select, { target: { value: "es" } });
    fireEvent.click(screen.getByRole("button", { name: /Copy link/ }));
    await waitFor(() => expect(portal.createSession).toHaveBeenLastCalledWith(expect.objectContaining({ locale: "es" })));
  });

  it("copies the link and sends the email, saying to whom", async () => {
    renderDetail(await english());
    fireEvent.click(await screen.findByRole("button", { name: /Share/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Copy link/ }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Link copied"));

    fireEvent.change(screen.getByPlaceholderText("john@company.com"), { target: { value: "ana@sol.co" } });
    fireEvent.click(screen.getByRole("button", { name: /Send email/ }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Email sent to ana@sol.co"));
  });

  it("shows the active-link banner with and without a recipient", async () => {
    const future = new Date(Date.now() + 5 * 86400000).toISOString();
    portal.getSessions.mockResolvedValue([{ id: "s1", action: null, expires_at: future, client_email: "ana@sol.co", portal_url: "u" }]);
    const instance = await english();
    const { unmount } = renderDetail(instance);
    expect(await screen.findByText(/✓ Active link — sent to ana@sol\.co · expires/)).toBeInTheDocument();
    expect(screen.getByText("Resend / new link")).toBeInTheDocument();
    unmount();

    portal.getSessions.mockResolvedValue([{ id: "s1", action: null, expires_at: future, client_email: null, portal_url: "u" }]);
    renderDetail(instance);
    expect(await screen.findByText(/^✓ Active link · expires/)).toBeInTheDocument();
  });

  it("reports a failed save with the English prefix", async () => {
    svc.updateLine.mockRejectedValue(new Error("boom"));
    renderDetail(await english());
    const input = (await screen.findAllByDisplayValue("Shoes"))[0];
    fireEvent.change(input, { target: { value: "Boots" } });
    fireEvent.blur(input);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/^Could not save: /)));
  });
});
