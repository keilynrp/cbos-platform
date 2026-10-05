import { fireEvent, screen } from "@testing-library/react";
import i18next, { type i18n as I18n } from "i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import globalI18n, { buildI18nOptions, resources } from "@/i18n";
import CustomerPortal from "@/pages/CustomerPortal";
import { renderPageWithI18n } from "@/test/i18n";

/**
 * `customerPortal` en el ingles *real* (tarea 12 del plan de i18n): el flujo completo
 * del cliente (propuesta, aceptar, rechazar, enlaces caducados) con el catalogo `en`
 * que se envia. Es la unica pantalla que ve alguien ajeno a la empresa.
 */

const DAY = 24 * 60 * 60 * 1000;

const quote = (over: Record<string, unknown> = {}) => ({
  quote_number: "Q-0007", title: "Shoe proposal", status: "sent", valid_until: null, currency: "USD",
  subtotal: 200, discount_amount: 20, tax_rate: 0.16, tax_amount: 28.8, total: 208.8,
  notes: "Thanks", terms: "30 days",
  lines: [
    { description: "Shoes", quantity: 2, unit_price: 80, discount_percent: 0, amount: 160 },
    { description: "Sole", quantity: 1, unit_price: 40, discount_percent: 0, amount: 40 },
  ],
  workspace_name: "Sol Workshop", org_name: null, contact_name: null, can_accept: true,
  session_expires_at: new Date(Date.now() + 2.5 * DAY).toISOString(), already_acted: false, ...over,
});

type Reply = { status: number; body: unknown };
const respond = ({ status, body }: Reply) =>
  Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body });

function stubApi(replies: { get?: Reply; accept?: Reply; reject?: Reply } = {}) {
  const fetchMock = vi.fn((url: string, _init?: RequestInit) => {
    if (url.endsWith("/accept")) return respond(replies.accept ?? { status: 200, body: { success: true, action: "accepted", message: "ok", order_number: "ORD-123" } });
    if (url.endsWith("/reject")) return respond(replies.reject ?? { status: 200, body: { success: true, action: "rejected", message: "ok", order_number: null } });
    return respond(replies.get ?? { status: 200, body: quote() });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function english(): Promise<I18n> {
  const instance = i18next.createInstance();
  await instance.init(buildI18nOptions(resources, "en"));
  return instance;
}

const ROUTE = { entry: "/portal/tok123", path: "/portal/:token" };
const render = (instance: I18n) => renderPageWithI18n(<CustomerPortal />, instance, ROUTE);

beforeEach(() => {
  stubApi();
});
afterEach(async () => {
  vi.unstubAllGlobals();
  await globalI18n.changeLanguage("es");
});

describe("CustomerPortal in English", () => {
  it("shows the proposal: header, countdown, line items and totals", async () => {
    render(await english());

    expect(await screen.findByText("Shoe proposal")).toBeInTheDocument();
    expect(screen.getByText("Sent you a proposal")).toBeInTheDocument();
    expect(screen.getByText("⏰ Expires")).toBeInTheDocument();
    expect(screen.getByText("3d")).toBeInTheDocument();
    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByText("$160.00")).toBeInTheDocument();
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.getByText("Discount")).toBeInTheDocument();
    expect(screen.getByText("Tax (16%)")).toBeInTheDocument();
    expect(screen.getByText("$208.80")).toBeInTheDocument();
    expect(screen.getByText("Terms and conditions")).toBeInTheDocument();
    expect(screen.queryByText("Detalle")).not.toBeInTheDocument();
  });

  it("offers to accept or decline and names who to ask", async () => {
    render(await english());

    expect(await screen.findByRole("button", { name: "✓ Accept and sign proposal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "✗ Decline proposal" })).toBeInTheDocument();
    expect(screen.getByText("Questions? Contact Sol Workshop")).toBeInTheDocument();
  });

  it("says so when the proposal has no line items", async () => {
    stubApi({ get: { status: 200, body: quote({ lines: [], discount_amount: 0, tax_rate: 0 }) } });
    render(await english());

    expect(await screen.findByText("No line items")).toBeInTheDocument();
  });

  it("accepts: confirms, sends the data and shows the order number", async () => {
    const fetchMock = stubApi();
    render(await english());

    fireEvent.click(await screen.findByRole("button", { name: "✓ Accept and sign proposal" }));
    expect(screen.getByText("Confirm acceptance", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("Your name")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Your full name"), { target: { value: "Ana Lopez" } });
    fireEvent.change(screen.getByPlaceholderText("Additional instructions..."), { target: { value: "Deliver on Monday" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm acceptance" }));

    expect(await screen.findByText("Proposal accepted!")).toBeInTheDocument();
    expect(screen.getByText("ORD-123", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("We have received your confirmation.")).toBeInTheDocument();
    expect(screen.getByText(/Sol Workshop will get in touch/)).toBeInTheDocument();
    const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/accept"));
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ client_name: "Ana Lopez", client_notes: "Deliver on Monday" });
  });

  it("declines with a reason and confirms it", async () => {
    render(await english());

    fireEvent.click(await screen.findByRole("button", { name: "✗ Decline proposal" }));
    expect(screen.getByText("Confirm decline", { selector: "p" })).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Reason for declining..."), { target: { value: "Too expensive" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm decline" }));

    expect(await screen.findByText("Proposal declined")).toBeInTheDocument();
    expect(screen.getByText("If you change your mind, contact Sol Workshop.")).toBeInTheDocument();
  });

  it("shows the backend error in English when accepting fails", async () => {
    stubApi({
      accept: {
        status: 409,
        body: { error: { code: "PORTAL_QUOTE_ACCEPT_INVALID_STATUS", message: "Cannot accept.", detail: { status: "accepted" } } },
      },
    });
    // `translateApiError` lee la instancia global: se le da el mismo idioma.
    await globalI18n.changeLanguage("en");
    render(await english());

    fireEvent.click(await screen.findByRole("button", { name: "✓ Accept and sign proposal" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm acceptance" }));

    expect(await screen.findByText("Cannot accept a quote with status 'accepted'.")).toBeInTheDocument();
  });

  it("explains an expired link and an invalid one", async () => {
    stubApi({ get: { status: 410, body: { error: { code: "PORTAL_LINK_EXPIRED", message: "Link expired." } } } });
    const instance = await english();
    const expired = render(instance);
    expect(await screen.findByText("This link has expired")).toBeInTheDocument();
    expect(screen.getByText("Contact the company to request a new one.")).toBeInTheDocument();
    expired.unmount();

    stubApi({ get: { status: 404, body: { error: { code: "PORTAL_SESSION_NOT_FOUND", message: "Not found." } } } });
    render(instance);
    expect(await screen.findByText("Invalid link")).toBeInTheDocument();
    expect(screen.getByText("Check that you copied the full URL.")).toBeInTheDocument();
  });

  it("goes straight to the confirmation of a proposal that was already acted on", async () => {
    stubApi({ get: { status: 200, body: quote({ already_acted: true, status: "accepted" }) } });
    const instance = await english();
    const accepted = render(instance);
    expect(await screen.findByText("Proposal accepted!")).toBeInTheDocument();
    expect(screen.getByText("Check your confirmation email")).toBeInTheDocument();
    expect(screen.getByText("Keep this number for any questions")).toBeInTheDocument();
    accepted.unmount();

    stubApi({ get: { status: 200, body: quote({ already_acted: true, status: "rejected" }) } });
    render(instance);
    expect(await screen.findByText("Proposal declined")).toBeInTheDocument();
    expect(screen.getAllByText("This link is no longer available for further actions").length).toBeGreaterThan(0);
  });

  it("shows a loading message while the proposal is fetched", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    render(await english());

    expect(screen.getByText("Loading proposal…")).toBeInTheDocument();
  });
});
