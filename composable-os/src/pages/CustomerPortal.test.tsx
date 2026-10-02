import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import CustomerPortal from "@/pages/CustomerPortal";
import {
  FORMATTED_CURRENCY, createPseudoInstance, notFromCatalogue, renderPageWithI18n, visibleStrings,
} from "@/test/i18n";

/** Datos de la propuesta (los pone el vendedor): no pertenecen al catalogo de la app. */
const DATA = ["Taller Sol", "Propuesta de zapatos", "Q-0007", "Zapatos", "Suela", "Gracias", "30 dias", "ORD-123"];
const INITIALS = /^[A-Z?]{1,2}$/;

const DAY = 24 * 60 * 60 * 1000;

const quote = (over: Record<string, unknown> = {}) => ({
  quote_number: "Q-0007", title: "Propuesta de zapatos", status: "sent", valid_until: null, currency: "USD",
  subtotal: 200, discount_amount: 20, tax_rate: 0.16, tax_amount: 28.8, total: 208.8,
  notes: "Gracias", terms: "30 dias",
  lines: [
    { description: "Zapatos", quantity: 2, unit_price: 80, discount_percent: 0, amount: 160 },
    { description: "Suela", quantity: 1, unit_price: 40, discount_percent: 0, amount: 40 },
  ],
  workspace_name: "Taller Sol", org_name: null, contact_name: null, can_accept: true,
  // 2,5 dias: `daysUntil` redondea hacia arriba, asi que son "3d".
  session_expires_at: new Date(Date.now() + 2.5 * DAY).toISOString(), already_acted: false, ...over,
});

type Reply = { status: number; body: unknown };
const respond = ({ status, body }: Reply) =>
  Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body });

/** `GET` de la propuesta y los dos `POST` de accion, cada uno con su respuesta. */
function stubApi(replies: { get?: Reply; accept?: Reply; reject?: Reply } = {}) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (url.endsWith("/accept")) return respond(replies.accept ?? { status: 200, body: { success: true, action: "accepted", message: "ok", order_number: "ORD-123" } });
    if (url.endsWith("/reject")) return respond(replies.reject ?? { status: 200, body: { success: true, action: "rejected", message: "ok", order_number: null } });
    return respond(replies.get ?? { status: 200, body: quote() });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const ROUTE = { entry: "/portal/tok123", path: "/portal/:token" };
const render = (instance = i18n) => renderPageWithI18n(<CustomerPortal />, instance, ROUTE);

// Con llaves: una flecha que devolviera el mock se tomaria por la funcion de limpieza.
beforeEach(() => {
  stubApi();
});
afterEach(() => vi.unstubAllGlobals());

describe("CustomerPortal, in Spanish", () => {
  it("shows the proposal: header, countdown, line items and totals", async () => {
    render();

    expect(await screen.findByText("Propuesta de zapatos")).toBeInTheDocument();
    expect(screen.getByText("Te envió una propuesta")).toBeInTheDocument();
    expect(screen.getByText("Q-0007")).toBeInTheDocument();
    expect(screen.getByText("⏰ Expira")).toBeInTheDocument();
    // Antes `{days}d` a mano; ahora lo formatea Intl.
    expect(screen.getByText("3d")).toBeInTheDocument();
    expect(screen.getByText("Detalle")).toBeInTheDocument();
    expect(screen.getByText("Zapatos")).toBeInTheDocument();
    expect(screen.getByText(/^USD\s160\.00$/)).toBeInTheDocument();
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.getByText("Descuento")).toBeInTheDocument();
    expect(screen.getByText("IVA (16%)")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText(/^USD\s208\.80$/)).toBeInTheDocument();
    expect(screen.getByText("Términos y condiciones")).toBeInTheDocument();
  });

  it("offers to accept or reject while the proposal is open", async () => {
    render();

    expect(await screen.findByRole("button", { name: "✓ Aceptar y firmar propuesta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "✗ Rechazar propuesta" })).toBeInTheDocument();
    expect(screen.getByText("¿Preguntas? Contacta a Taller Sol")).toBeInTheDocument();
  });

  it("hides the actions when the proposal can no longer be accepted", async () => {
    stubApi({ get: { status: 200, body: quote({ can_accept: false }) } });
    render();
    await screen.findByText("Propuesta de zapatos");

    expect(screen.queryByRole("button", { name: /Aceptar y firmar/ })).not.toBeInTheDocument();
  });

  it("says so when the proposal has no line items, and skips discount and tax", async () => {
    stubApi({ get: { status: 200, body: quote({ lines: [], discount_amount: 0, tax_rate: 0 }) } });
    render();

    expect(await screen.findByText("Sin líneas de detalle")).toBeInTheDocument();
    expect(screen.queryByText("Descuento")).not.toBeInTheDocument();
    expect(screen.queryByText(/^IVA/)).not.toBeInTheDocument();
  });

  it("accepts: asks for confirmation, sends the data and shows the order number", async () => {
    const fetchMock = stubApi();
    render();

    fireEvent.click(await screen.findByRole("button", { name: "✓ Aceptar y firmar propuesta" }));
    expect(screen.getByText("Confirmar aceptación", { selector: "p" })).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Tu nombre completo"), { target: { value: "Ana Lopez" } });
    fireEvent.change(screen.getByPlaceholderText("Instrucciones adicionales..."), { target: { value: "Entregar el lunes" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar aceptación" }));

    expect(await screen.findByText("¡Propuesta aceptada!")).toBeInTheDocument();
    expect(screen.getByText("ORD-123", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("Hemos recibido tu confirmación.")).toBeInTheDocument();
    expect(screen.getByText(/se pondrá en contacto/)).toBeInTheDocument();
    const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/accept"));
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ client_name: "Ana Lopez", client_notes: "Entregar el lunes" });
  });

  it("goes back from the accept form without sending anything", async () => {
    const fetchMock = stubApi();
    render();

    fireEvent.click(await screen.findByRole("button", { name: "✓ Aceptar y firmar propuesta" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(await screen.findByRole("button", { name: "✓ Aceptar y firmar propuesta" })).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/accept"))).toBe(false);
  });

  it("rejects with a reason and confirms the rejection", async () => {
    const fetchMock = stubApi();
    render();

    fireEvent.click(await screen.findByRole("button", { name: "✗ Rechazar propuesta" }));
    fireEvent.change(screen.getByPlaceholderText("Razón del rechazo..."), { target: { value: "Muy caro" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar rechazo" }));

    expect(await screen.findByText("Propuesta rechazada")).toBeInTheDocument();
    expect(screen.getByText("Si cambias de opinión, contacta a Taller Sol.")).toBeInTheDocument();
    const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/reject"));
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ reason: "Muy caro" });
  });

  it("shows the translated backend error when accepting fails", async () => {
    stubApi({
      accept: {
        status: 409,
        body: { error: { code: "PORTAL_QUOTE_ACCEPT_INVALID_STATUS", message: "Cannot accept.", detail: { status: "accepted" } } },
      },
    });
    render();

    fireEvent.click(await screen.findByRole("button", { name: "✓ Aceptar y firmar propuesta" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar aceptación" }));

    expect(await screen.findByText("No se puede aceptar una cotizacion en estado 'accepted'.")).toBeInTheDocument();
  });

  it("explains an expired link, naming nobody because the proposal never loaded", async () => {
    stubApi({ get: { status: 410, body: { error: { code: "PORTAL_LINK_EXPIRED", message: "Link expired." } } } });
    render();

    expect(await screen.findByText("Este link expiró")).toBeInTheDocument();
    expect(screen.getByText("Contacta a la empresa para solicitar uno nuevo.")).toBeInTheDocument();
  });

  it("explains an invalid link", async () => {
    stubApi({ get: { status: 404, body: { error: { code: "PORTAL_SESSION_NOT_FOUND", message: "Not found." } } } });
    render();

    expect(await screen.findByText("Link inválido")).toBeInTheDocument();
    expect(screen.getByText("Verifica que hayas copiado la URL completa.")).toBeInTheDocument();
  });

  it("goes straight to the confirmation of a proposal that was already accepted or rejected", async () => {
    stubApi({ get: { status: 200, body: quote({ already_acted: true, status: "accepted" }) } });
    const accepted = render();
    expect(await screen.findByText("¡Propuesta aceptada!")).toBeInTheDocument();
    expect(screen.getByText("Revisa tu email de confirmación")).toBeInTheDocument();
    accepted.unmount();

    stubApi({ get: { status: 200, body: quote({ already_acted: true, status: "rejected" }) } });
    render();
    expect(await screen.findByText("Propuesta rechazada")).toBeInTheDocument();
    expect(screen.getAllByText("Este link ya no está disponible para más acciones").length).toBeGreaterThan(0);
  });

  it("shows a loading message while the proposal is fetched", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    render();

    expect(screen.getByText("Cargando propuesta…")).toBeInTheDocument();
  });
});

/**
 * La prueba de que la pagina esta migrada entera, en cada pantalla del flujo.
 * Los datos de la propuesta y lo que formatea Intl no cuentan.
 */
describe("CustomerPortal, in a second language", () => {
  const strings = (root: HTMLElement) =>
    notFromCatalogue(visibleStrings(root), DATA, [FORMATTED_CURRENCY, INITIALS]);

  it("has no string left outside the catalogue in the proposal view", async () => {
    const english = await createPseudoInstance("en");
    const { container } = render(english);
    await screen.findByText("EN(¿Preguntas? Contacta a Taller Sol)");

    expect(strings(container)).toEqual([]);
  });

  it("has no string left outside the catalogue in the accept and reject forms", async () => {
    const english = await createPseudoInstance("en");
    const { container } = render(english);

    fireEvent.click(await screen.findByRole("button", { name: "EN(✓ Aceptar y firmar propuesta)" }));
    expect(strings(container)).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "EN(Cancelar)" }));
    fireEvent.click(await screen.findByRole("button", { name: "EN(✗ Rechazar propuesta)" }));
    expect(strings(container)).toEqual([]);
  });

  it("has no string left outside the catalogue in the confirmations and the error screens", async () => {
    const english = await createPseudoInstance("en");

    stubApi({ get: { status: 200, body: quote({ already_acted: true, status: "accepted" }) } });
    const accepted = render(english);
    await screen.findByText("EN(¡Propuesta aceptada!)");
    expect(strings(accepted.container)).toEqual([]);
    accepted.unmount();

    stubApi({ get: { status: 200, body: quote({ already_acted: true, status: "rejected" }) } });
    const rejected = render(english);
    await screen.findByText("EN(Propuesta rechazada)");
    expect(strings(rejected.container)).toEqual([]);
    rejected.unmount();

    stubApi({ get: { status: 410, body: { error: { code: "PORTAL_LINK_EXPIRED", message: "x" } } } });
    const expired = render(english);
    await screen.findByText("EN(Este link expiró)");
    expect(strings(expired.container)).toEqual([]);
    expired.unmount();

    stubApi({ get: { status: 404, body: { error: { code: "PORTAL_SESSION_NOT_FOUND", message: "x" } } } });
    const invalid = render(english);
    await screen.findByText("EN(Link inválido)");
    expect(strings(invalid.container)).toEqual([]);
  });

  it("formats amounts and the countdown with the second language's conventions", async () => {
    const english = await createPseudoInstance("en");
    render(english);

    // Los pone Intl segun el locale, no el catalogo.
    expect(await screen.findByText("$160.00")).toBeInTheDocument();
    expect(screen.getByText("3d")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("EN(IVA (16%))")).toBeInTheDocument());
  });
});
