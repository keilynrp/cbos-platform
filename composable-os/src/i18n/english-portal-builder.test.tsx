import { fireEvent, screen, waitFor } from "@testing-library/react";
import i18next, { type i18n as I18n } from "i18next";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import globalI18n, { buildI18nOptions, resources } from "@/i18n";
import { formatDate } from "@/i18n/format";
import PortalBuilder from "@/pages/PortalBuilder";
import { renderPageWithI18n, visibleStrings } from "@/test/i18n";

import { leaves, type Catalogue } from "./catalogueChecks";

/**
 * `portalBuilder` en el ingles *real* (tarea 12 del plan de i18n): las sesiones de
 * portal, el constructor de paginas con su paleta, sus propiedades y las vistas
 * previas de la tienda, con el catalogo `en` que se envia.
 */

const portal = vi.hoisted(() => ({ getSessions: vi.fn(), createSession: vi.fn(), sendEmail: vi.fn() }));
const sales = vi.hoisted(() => ({ getQuotes: vi.fn() }));

vi.mock("@/services/portal", () => ({ portalService: portal }));
vi.mock("@/services/sales", () => ({ salesService: sales }));

async function english(): Promise<I18n> {
  const instance = i18next.createInstance();
  await instance.init(buildI18nOptions(resources, "en"));
  return instance;
}

const session = (over: Record<string, unknown> = {}) => ({
  id: "s1", workspace_id: "w1", quote_id: "q1", token: "t1", expires_at: "2026-10-05T12:00:00Z",
  accessed_at: null, completed_at: null, action: null, client_name: "Ana Torres", client_email: "ana@sol.co",
  created_by_id: null, portal_url: "https://portal.test/t1", created_at: "", ...over,
});

const renderPage = (instance: I18n) => renderPageWithI18n(<PortalBuilder />, instance);
const openBuilder = () => fireEvent.mouseDown(screen.getByRole("tab", { name: "Page builder" }), { button: 0 });
/** El nombre de un bloque en la paleta (el lienzo repite el nombre en su etiqueta). */
const palette = (name: string) => screen.getByText(name, { selector: "div[draggable] > span" });
const addBlock = (name: string) => fireEvent.click(palette(name).closest("div[draggable]")!);
const openSelect = (combobox: HTMLElement) => fireEvent.keyDown(combobox, { key: "Enter" });

beforeAll(() => {
  // jsdom no implementa la captura de puntero que usa el Select de Radix.
  const proto = window.HTMLElement.prototype as unknown as Record<string, unknown>;
  proto.hasPointerCapture ??= () => false;
  proto.setPointerCapture ??= () => {};
  proto.releasePointerCapture ??= () => {};
});

beforeEach(() => {
  Object.values(portal).forEach((fn) => fn.mockReset());
  sales.getQuotes.mockReset();
  portal.getSessions.mockResolvedValue([session()]);
  portal.createSession.mockResolvedValue({});
  portal.sendEmail.mockResolvedValue({});
  sales.getQuotes.mockResolvedValue([{ id: "q1", quote_number: "Q-001", title: "Website redesign" }]);
});

afterEach(async () => {
  await globalI18n.changeLanguage("es");
});

describe("PortalBuilder sessions in English", () => {
  it("renders the header, the tabs and the session list", async () => {
    renderPage(await english());

    expect(screen.getByRole("heading", { name: "Portal builder" })).toBeInTheDocument();
    expect(screen.getByText("Design customer portals and manage access by quote.")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Active sessions" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Page builder" })).toBeInTheDocument();
    expect(await screen.findByText("Ana Torres")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText(`ana@sol.co · expires ${formatDate("2026-10-05T12:00:00Z", "en", "medium")}`)).toBeInTheDocument();
    expect(screen.queryByText("Pendiente")).not.toBeInTheDocument();
  });

  it("agrees the session count in the singular and the plural", async () => {
    const instance = await english();
    portal.getSessions.mockResolvedValue([session(), session({ id: "s2" })]);
    const { unmount } = renderPage(instance);
    expect(await screen.findByText("2 portal sessions")).toBeInTheDocument();
    unmount();

    portal.getSessions.mockResolvedValue([session()]);
    renderPage(instance);
    expect(await screen.findByText("1 portal session")).toBeInTheDocument();
  });

  it("translates the status of each session", async () => {
    portal.getSessions.mockResolvedValue([
      session({ id: "a", action: "accepted" }),
      session({ id: "r", action: "rejected" }),
      session({ id: "v", accessed_at: "2026-10-01T00:00:00Z" }),
      session({ id: "p" }),
    ]);
    renderPage(await english());

    for (const status of ["Accepted", "Declined", "Viewed", "Pending"]) {
      expect(await screen.findByText(status)).toBeInTheDocument();
    }
  });

  it("falls back to words for a session without name or email", async () => {
    portal.getSessions.mockResolvedValue([session({ client_name: null, client_email: null })]);
    renderPage(await english());

    expect(await screen.findByText("Unnamed customer")).toBeInTheDocument();
    expect(screen.getByText(/^no email · expires /)).toBeInTheDocument();
  });

  it("offers copy, view and email, and sends the email", async () => {
    renderPage(await english());
    await screen.findByText("Ana Torres");

    expect(screen.getByRole("button", { name: /Copy/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View/ })).toHaveAttribute("href", "https://portal.test/t1");
    fireEvent.click(screen.getByRole("button", { name: /Email/ }));

    await waitFor(() => expect(portal.sendEmail).toHaveBeenCalledWith("s1"));
  });

  it("explains an empty list", async () => {
    portal.getSessions.mockResolvedValue([]);
    renderPage(await english());

    expect(await screen.findByText("No portal sessions yet.")).toBeInTheDocument();
    expect(screen.getByText("Create a link so your customer can view and accept their quote.")).toBeInTheDocument();
    expect(screen.getByText("0 portal sessions")).toBeInTheDocument();
  });

  it("creates a session for a chosen quote", async () => {
    renderPage(await english());
    fireEvent.click(await screen.findByRole("button", { name: /Create portal link/ }));

    expect(await screen.findByText("Create portal session")).toBeInTheDocument();
    for (const text of ["Quote *", "Customer name", "Customer email", "Expires in (hours)"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Create link" })).toBeDisabled();
    expect(screen.getByText("Select a quote")).toBeInTheDocument();

    openSelect(screen.getByRole("combobox"));
    fireEvent.click(await screen.findByRole("option", { name: /Q-001/ }));
    fireEvent.click(screen.getByRole("button", { name: "Create link" }));

    await waitFor(() => expect(portal.createSession).toHaveBeenCalledWith(expect.objectContaining({ quote_id: "q1" })));
  });

  it("shows the English generic message when creating the session fails", async () => {
    portal.createSession.mockRejectedValue(new Error(""));
    // `translateApiError` lee la instancia global: se le da el mismo idioma.
    await globalI18n.changeLanguage("en");
    renderPage(await english());
    fireEvent.click(await screen.findByRole("button", { name: /Create portal link/ }));
    openSelect(await screen.findByRole("combobox"));
    fireEvent.click(await screen.findByRole("option", { name: /Q-001/ }));
    fireEvent.click(screen.getByRole("button", { name: "Create link" }));

    expect(await screen.findByText("Something went wrong")).toBeInTheDocument();
  });
});

describe("PortalBuilder page builder in English", () => {
  it("opens with a starter page, in English", async () => {
    renderPage(await english());
    openBuilder();

    expect(await screen.findByText("Customer portal")).toBeInTheDocument();
    expect(screen.getByText("Welcome to your portal")).toBeInTheDocument();
    expect(screen.getByText("Active projects")).toBeInTheDocument();
    expect(screen.getByText("+3 this month")).toBeInTheDocument();
    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(screen.getByText("Drag blocks to build the customer portal page.")).toBeInTheDocument();
  });

  it("names the viewport and mode controls", async () => {
    renderPage(await english());
    openBuilder();

    for (const name of ["Desktop", "Tablet", "Mobile"]) {
      expect(await screen.findByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: /Edit/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Preview/ })).toBeInTheDocument();
  });

  it("lists the palette by category, translated", async () => {
    renderPage(await english());
    openBuilder();

    for (const category of ["All", "Layout", "Content", "Data", "Navigation", "Shop"]) {
      expect(await screen.findByRole("button", { name: category })).toBeInTheDocument();
    }
    for (const block of ["Section", "Spacer", "Heading", "Button", "Data table", "Form", "Cart", "Chatbot"]) {
      expect(palette(block)).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole("button", { name: "Shop" }));

    expect(palette("Product grid")).toBeInTheDocument();
    expect(screen.queryByText("Spacer", { selector: "div[draggable] > span" })).not.toBeInTheDocument();
  });

  it("adds a block with its sample text in English and opens its properties", async () => {
    renderPage(await english());
    openBuilder();
    await screen.findByText("Customer portal");

    addBlock("Button");

    expect(await screen.findByText("Click here")).toBeInTheDocument();
    expect(screen.getByText("Properties")).toBeInTheDocument();
    for (const label of ["Text", "Variant", "Size", "Alignment"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("lists the choices of a property translated", async () => {
    renderPage(await english());
    openBuilder();
    await screen.findByText("Customer portal");
    addBlock("Button");
    await screen.findByText("Properties");

    const [variant] = screen.getAllByRole("combobox");
    expect(variant).toHaveTextContent("Primary");
    openSelect(variant);
    for (const choice of ["Outline", "Secondary"]) {
      expect(await screen.findByRole("option", { name: choice })).toBeInTheDocument();
    }
  });

  it("switches a boolean property between Yes and No", async () => {
    renderPage(await english());
    openBuilder();
    await screen.findByText("Customer portal");
    addBlock("Card");

    expect(await screen.findByText("Show image")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));

    expect(screen.getByRole("button", { name: "No" })).toBeInTheDocument();
  });

  it("adds an item to a list property", async () => {
    renderPage(await english());
    openBuilder();
    await screen.findByText("Customer portal");
    addBlock("List");
    await screen.findByText("Item one");

    fireEvent.click(screen.getByRole("button", { name: /Add/ }));

    expect(await screen.findByDisplayValue("New item")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Remove item" }).length).toBeGreaterThan(3);
  });

  it("moves, duplicates and removes the selected block with a named toolbar", async () => {
    renderPage(await english());
    openBuilder();
    await screen.findByText("Customer portal");
    addBlock("Button");
    await screen.findByText("Click here");

    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));
    expect(screen.getAllByText("Click here")).toHaveLength(2);

    expect(screen.getByRole("button", { name: "Move up" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move down" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getAllByText("Click here")).toHaveLength(1);
  });

  it("explains an empty canvas and an empty properties panel", async () => {
    renderPage(await english());
    openBuilder();
    expect(await screen.findByText("Select a block to edit it")).toBeInTheDocument();

    // Cada bloque inicial se selecciona por su texto y se elimina.
    for (const text of ["Customer portal", "Welcome to your portal", "Column 1", "Active projects"]) {
      fireEvent.click(screen.getByText(text));
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    }

    expect(await screen.findByText("Drag blocks here or click in the palette")).toBeInTheDocument();
  });

  it("hides the palette in preview mode", async () => {
    renderPage(await english());
    openBuilder();
    await screen.findByText("Customer portal");

    fireEvent.click(screen.getByRole("button", { name: /Preview/ }));

    expect(screen.queryByRole("button", { name: "All" })).not.toBeInTheDocument();
    expect(screen.getByText("Customer portal")).toBeInTheDocument();
  });

  it("renders the shop blocks with their sample content in English", async () => {
    renderPage(await english());
    openBuilder();
    await screen.findByText("Customer portal");

    addBlock("Product grid");
    expect(await screen.findByText("Product 1")).toBeInTheDocument();
    expect(screen.getAllByText("Add to cart").length).toBeGreaterThan(0);

    addBlock("Cart");
    expect(await screen.findByText("Shopping cart")).toBeInTheDocument();
    expect(screen.getByText("3 items")).toBeInTheDocument();
    expect(screen.getByText("Wireless headphones")).toBeInTheDocument();

    addBlock("Checkout form");
    expect(await screen.findByText("Order summary")).toBeInTheDocument();
    expect(screen.getByText("Items (3)")).toBeInTheDocument();
    expect(screen.getAllByText("Place order").length).toBeGreaterThan(0);

    addBlock("Chatbot");
    expect(await screen.findByText("Support assistant")).toBeInTheDocument();
    expect(screen.getByText("Online · Usually replies instantly")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
    expect(screen.getByText("I would like to know about pricing")).toBeInTheDocument();
  });

  it("shows no Spanish text for any of the blocks in the palette", async () => {
    const { container } = renderPage(await english());
    openBuilder();
    await screen.findByText("Customer portal");

    // Las cadenas en espanol que el ingles ya traduce: si alguna se pinta, un bloque
    // se quedo sin cablear. Las que coinciden en los dos idiomas (`Total`, `Chatbot`)
    // y las que llevan marcadores no cuentan.
    const spanish = new Set<string>();
    const en = leaves(resources.en.portalBuilder as Catalogue);
    for (const [key, value] of leaves(resources.es.portalBuilder as Catalogue)) {
      if (en.get(key) !== value && !value.includes("{{")) spanish.add(value);
    }

    const blocks = Array.from(container.querySelectorAll("div[draggable]")) as HTMLElement[];
    expect(blocks.length).toBeGreaterThanOrEqual(23);
    // Cada bloque se anade, queda seleccionado y muestra su panel de propiedades.
    for (const block of blocks) fireEvent.click(block);

    const seen = visibleStrings(container);
    expect(seen.filter((text) => spanish.has(text))).toEqual([]);
    // El barrido ve texto de ejemplo de bloques distintos, no una pagina vacia.
    expect(seen).toEqual(expect.arrayContaining(["Heading text", "Card title", "Item one", "Revenue summary", "Total revenue"]));
  });

  it("fills the form block placeholders from the field names", async () => {
    renderPage(await english());
    openBuilder();
    await screen.findByText("Customer portal");

    addBlock("Form");

    expect(await screen.findByPlaceholderText("Enter name...")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter email...")).toBeInTheDocument();
  });
});
