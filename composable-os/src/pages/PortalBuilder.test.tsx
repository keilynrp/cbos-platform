import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import { formatDate } from "@/i18n/format";
import PortalBuilder from "@/pages/PortalBuilder";
import {
  FORMATTED_CURRENCY, createPseudoInstance, notFromCatalogue, renderPageWithI18n, visibleStrings,
} from "@/test/i18n";

const portal = vi.hoisted(() => ({ getSessions: vi.fn(), createSession: vi.fn(), sendEmail: vi.fn() }));
const sales = vi.hoisted(() => ({ getQuotes: vi.fn() }));

vi.mock("@/services/portal", () => ({ portalService: portal }));
vi.mock("@/services/sales", () => ({ salesService: sales }));

/** Datos del usuario o del servidor: no son texto de la interfaz. */
const DATA = ["Ana Torres", "ana@sol.co", "Luis Gómez", "Q-001", "Rediseño web"];
const FORMATTED_DATE = /^\d{1,2}\/\d{1,2}\/\d{2,4}$|^\d{1,2} \p{L}{3,4}\.? \d{4}$/u;
/** `$29/mo` y los precios de ejemplo: cifras de muestra, no texto del catalogo. */
const SAMPLE_NUMBERS = [FORMATTED_CURRENCY, /^[$+\d]/];

const session = (over: Record<string, unknown> = {}) => ({
  id: "s1", workspace_id: "w1", quote_id: "q1", token: "t1", expires_at: "2026-10-05T12:00:00Z",
  accessed_at: null, completed_at: null, action: null, client_name: "Ana Torres", client_email: "ana@sol.co",
  created_by_id: null, portal_url: "https://portal.test/t1", created_at: "", ...over,
});

const renderPage = (instance = i18n) => renderPageWithI18n(<PortalBuilder />, instance);
const openBuilder = () => fireEvent.mouseDown(screen.getByRole("tab", { name: /Constructor de páginas|Page Builder/ }), { button: 0 });
/** El nombre de un bloque en la paleta (el lienzo repite el nombre en su etiqueta). */
const palette = (name: string) => screen.getByText(name, { selector: "div[draggable] > span" });
/** Un bloque de la paleta: el `div` clicable que lo contiene. */
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
  sales.getQuotes.mockResolvedValue([{ id: "q1", quote_number: "Q-001", title: "Rediseño web" }]);
});

describe("PortalBuilder: sesiones, en español", () => {
  it("renders the header, the tabs and the session list", async () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Constructor de portales" })).toBeInTheDocument();
    expect(screen.getByText("Diseña portales de cliente y gestiona accesos por cotización.")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Sesiones activas" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Constructor de páginas" })).toBeInTheDocument();
    expect(await screen.findByText("Ana Torres")).toBeInTheDocument();
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(screen.getByText(`ana@sol.co · expira ${formatDate("2026-10-05T12:00:00Z", "es", "medium")}`)).toBeInTheDocument();
  });

  it("agrees the session count in the singular and the plural", async () => {
    portal.getSessions.mockResolvedValue([session(), session({ id: "s2" })]);
    const { unmount } = renderPage();
    expect(await screen.findByText("2 sesiones de portal")).toBeInTheDocument();
    unmount();

    portal.getSessions.mockResolvedValue([session()]);
    renderPage();
    expect(await screen.findByText("1 sesión de portal")).toBeInTheDocument();
  });

  it("translates the status of each session", async () => {
    portal.getSessions.mockResolvedValue([
      session({ id: "a", action: "accepted" }),
      session({ id: "r", action: "rejected" }),
      session({ id: "v", accessed_at: "2026-10-01T00:00:00Z" }),
      session({ id: "p" }),
    ]);
    renderPage();

    for (const status of ["Aceptado", "Rechazado", "Visto", "Pendiente"]) {
      expect(await screen.findByText(status)).toBeInTheDocument();
    }
  });

  it("falls back to words for a session without name or email", async () => {
    portal.getSessions.mockResolvedValue([session({ client_name: null, client_email: null })]);
    renderPage();

    expect(await screen.findByText("Cliente sin nombre")).toBeInTheDocument();
    expect(screen.getByText(/^sin email · expira /)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Email/ })).not.toBeInTheDocument();
  });

  it("offers copy, view and email, and sends the email", async () => {
    renderPage();
    await screen.findByText("Ana Torres");

    expect(screen.getByRole("button", { name: /Copiar/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver/ })).toHaveAttribute("href", "https://portal.test/t1");
    fireEvent.click(screen.getByRole("button", { name: /Email/ }));

    await waitFor(() => expect(portal.sendEmail).toHaveBeenCalledWith("s1"));
  });

  it("explains an empty list", async () => {
    portal.getSessions.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText("Sin sesiones de portal aún.")).toBeInTheDocument();
    expect(screen.getByText("Crea un enlace para que tu cliente vea y acepte su cotización.")).toBeInTheDocument();
    expect(screen.getByText("0 sesiones de portal")).toBeInTheDocument();
  });

  it("creates a session for a chosen quote", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /Crear enlace de portal/ }));

    expect(await screen.findByText("Crear sesión de portal")).toBeInTheDocument();
    for (const text of ["Cotización *", "Nombre del cliente", "Email del cliente", "Expira en (horas)"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Crear enlace" })).toBeDisabled();

    openSelect(screen.getByRole("combobox"));
    fireEvent.click(await screen.findByRole("option", { name: /Q-001/ }));
    fireEvent.click(screen.getByRole("button", { name: "Crear enlace" }));

    await waitFor(() => expect(portal.createSession).toHaveBeenCalledWith(expect.objectContaining({ quote_id: "q1" })));
  });

  it("shows the quote placeholder until one is chosen", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /Crear enlace de portal/ }));

    expect(await screen.findByText("Selecciona una cotización")).toBeInTheDocument();
  });

  it("shows a translated message when creating the session fails", async () => {
    portal.createSession.mockRejectedValue(new Error(""));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /Crear enlace de portal/ }));
    openSelect(await screen.findByRole("combobox"));
    fireEvent.click(await screen.findByRole("option", { name: /Q-001/ }));
    fireEvent.click(screen.getByRole("button", { name: "Crear enlace" }));

    // Antes: `String(error)`, es decir "Error: ".
    expect(await screen.findByText("Ocurrio un error")).toBeInTheDocument();
  });
});

describe("PortalBuilder: constructor, en español", () => {
  it("opens with a starter page, in Spanish", async () => {
    renderPage();
    openBuilder();

    expect(await screen.findByText("Portal del cliente")).toBeInTheDocument();
    expect(screen.getByText("Te damos la bienvenida a tu portal")).toBeInTheDocument();
    expect(screen.getByText("Proyectos activos")).toBeInTheDocument();
    expect(screen.getByText("+3 este mes")).toBeInTheDocument();
    expect(screen.getByText("Documentos")).toBeInTheDocument();
    expect(screen.getByText("Arrastra bloques para construir la página del portal cliente.")).toBeInTheDocument();
  });

  it("names the viewport and mode controls", async () => {
    renderPage();
    openBuilder();

    for (const name of ["Escritorio", "Tableta", "Móvil"]) {
      expect(await screen.findByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: /Editar/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Vista previa/ })).toBeInTheDocument();
  });

  it("lists the palette by category, translated", async () => {
    renderPage();
    openBuilder();

    for (const category of ["Todos", "Diseño", "Contenido", "Datos", "Navegación", "Tienda"]) {
      expect(await screen.findByRole("button", { name: category })).toBeInTheDocument();
    }
    for (const block of ["Sección", "Espaciador", "Título", "Botón", "Tabla de datos", "Formulario", "Carrito", "Chatbot"]) {
      expect(palette(block)).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole("button", { name: "Tienda" }));

    expect(palette("Cuadrícula de productos")).toBeInTheDocument();
    expect(screen.queryByText("Espaciador", { selector: "div[draggable] > span" })).not.toBeInTheDocument();
  });

  it("adds a block with its sample text in Spanish and opens its properties", async () => {
    renderPage();
    openBuilder();
    await screen.findByText("Portal del cliente");

    addBlock("Botón");

    expect(await screen.findByText("Haz clic aquí")).toBeInTheDocument();
    expect(screen.getByText("Propiedades")).toBeInTheDocument();
    for (const label of ["Texto", "Variante", "Tamaño", "Alineación"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("lists the choices of a property translated", async () => {
    renderPage();
    openBuilder();
    await screen.findByText("Portal del cliente");
    addBlock("Botón");
    await screen.findByText("Propiedades");

    const [variant] = screen.getAllByRole("combobox");
    expect(variant).toHaveTextContent("Primario");
    openSelect(variant);
    for (const choice of ["Contorno", "Secundario"]) {
      expect(await screen.findByRole("option", { name: choice })).toBeInTheDocument();
    }
  });

  it("switches a boolean property between Sí and No", async () => {
    renderPage();
    openBuilder();
    await screen.findByText("Portal del cliente");
    addBlock("Tarjeta");

    expect(await screen.findByText("Mostrar imagen")).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "Sí" });
    fireEvent.click(toggle);

    expect(screen.getByRole("button", { name: "No" })).toBeInTheDocument();
  });

  it("adds an item to a list property", async () => {
    renderPage();
    openBuilder();
    await screen.findByText("Portal del cliente");
    addBlock("Lista");
    await screen.findByText("Elemento uno");

    fireEvent.click(screen.getByRole("button", { name: /Agregar/ }));

    expect(await screen.findByDisplayValue("Elemento nuevo")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Quitar elemento" }).length).toBeGreaterThan(3);
  });

  it("moves, duplicates and removes the selected block with a named toolbar", async () => {
    renderPage();
    openBuilder();
    await screen.findByText("Portal del cliente");
    addBlock("Botón");
    await screen.findByText("Haz clic aquí");

    fireEvent.click(screen.getByRole("button", { name: "Duplicar" }));
    expect(screen.getAllByText("Haz clic aquí")).toHaveLength(2);

    expect(screen.getByRole("button", { name: "Mover arriba" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mover abajo" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(screen.getAllByText("Haz clic aquí")).toHaveLength(1);
  });

  it("explains an empty canvas and an empty properties panel", async () => {
    renderPage();
    openBuilder();
    expect(await screen.findByText("Selecciona un bloque para editarlo")).toBeInTheDocument();

    // Cada bloque inicial se selecciona por su texto y se elimina.
    for (const text of ["Portal del cliente", "Te damos la bienvenida a tu portal", "Columna 1", "Proyectos activos"]) {
      fireEvent.click(screen.getByText(text));
      fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    }

    expect(await screen.findByText("Arrastra bloques aquí o haz clic en la paleta")).toBeInTheDocument();
  });

  it("hides the palette in preview mode", async () => {
    renderPage();
    openBuilder();
    await screen.findByText("Portal del cliente");

    fireEvent.click(screen.getByRole("button", { name: /Vista previa/ }));

    expect(screen.queryByRole("button", { name: "Todos" })).not.toBeInTheDocument();
    expect(screen.getByText("Portal del cliente")).toBeInTheDocument();
  });

  it("renders the shop blocks with their sample content in Spanish", async () => {
    renderPage();
    openBuilder();
    await screen.findByText("Portal del cliente");

    addBlock("Cuadrícula de productos");
    expect(await screen.findByText("Producto 1")).toBeInTheDocument();
    expect(screen.getAllByText("Agregar al carrito").length).toBeGreaterThan(0);

    addBlock("Carrito");
    expect(await screen.findByText("Carrito de compras")).toBeInTheDocument();
    expect(screen.getByText("3 artículos")).toBeInTheDocument();
    expect(screen.getByText("Audífonos inalámbricos")).toBeInTheDocument();

    addBlock("Formulario de pago");
    expect(await screen.findByText("Resumen del pedido")).toBeInTheDocument();
    expect(screen.getByText("Artículos (3)")).toBeInTheDocument();
    expect(screen.getAllByText("Realizar pedido").length).toBeGreaterThan(0);

    addBlock("Chatbot");
    expect(await screen.findByText("Asistente de soporte")).toBeInTheDocument();
    expect(screen.getByText("En línea · Suele responder al instante")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Escribe un mensaje...")).toBeInTheDocument();
    expect(screen.getByText("Quisiera saber sobre los precios")).toBeInTheDocument();
  });

  it("fills the form block placeholders from the field names", async () => {
    renderPage();
    openBuilder();
    await screen.findByText("Portal del cliente");

    addBlock("Formulario");

    expect(await screen.findByPlaceholderText("Ingresa nombre...")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ingresa correo...")).toBeInTheDocument();
  });
});

describe("PortalBuilder, in a second language", () => {
  const strings = (root: HTMLElement) =>
    notFromCatalogue(visibleStrings(root), DATA, [FORMATTED_DATE, ...SAMPLE_NUMBERS]);

  it("has no string left outside the catalogue in the session list", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPage(english);
    await screen.findByText("Ana Torres");

    expect(strings(container)).toEqual([]);
    expect(screen.getByRole("heading", { name: "EN(Constructor de portales)" })).toBeInTheDocument();
  });

  it("has no string left outside the catalogue when there are no sessions", async () => {
    portal.getSessions.mockResolvedValue([]);
    const english = await createPseudoInstance("en");
    const { container } = renderPage(english);
    await screen.findByText("EN(Sin sesiones de portal aún.)");

    expect(strings(container)).toEqual([]);
  });

  it("has no string left outside the catalogue in the create-session dialog", async () => {
    const english = await createPseudoInstance("en");
    renderPage(english);
    fireEvent.click(await screen.findByRole("button", { name: /EN\(Crear enlace de portal\)/ }));
    await screen.findByText("EN(Crear sesión de portal)");

    expect(strings(screen.getByRole("dialog"))).toEqual([]);
  });

  it("has no string left outside the catalogue in the starter page and the palette", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPage(english);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "EN(Constructor de páginas)" }), { button: 0 });
    await screen.findByText("EN(Portal del cliente)");

    expect(strings(container)).toEqual([]);
    expect(screen.getByText("EN(Sección)", { selector: "div[draggable] > span" })).toBeInTheDocument();
  });

  it("has no string left outside the catalogue for any block or its properties", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPage(english);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "EN(Constructor de páginas)" }), { button: 0 });
    await screen.findByText("EN(Portal del cliente)");

    const types = Array.from(container.querySelectorAll("div[draggable]")) as HTMLElement[];
    expect(types.length).toBeGreaterThanOrEqual(23);

    const leaked: string[] = [];
    // Cada bloque se anade, queda seleccionado y muestra su panel de propiedades.
    for (const item of types) {
      fireEvent.click(item);
      leaked.push(...strings(container));
    }

    expect(leaked).toEqual([]);
  });

  it("has no string left outside the catalogue in the property choices", async () => {
    const english = await createPseudoInstance("en");
    renderPage(english);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "EN(Constructor de páginas)" }), { button: 0 });
    await screen.findByText("EN(Portal del cliente)");
    fireEvent.click(screen.getByText("EN(Botón)", { selector: "div[draggable] > span" }).closest("div[draggable]")!);
    await screen.findByText("EN(Propiedades)");

    const [variant] = screen.getAllByRole("combobox");
    expect(variant).toHaveTextContent("EN(Primario)");
    openSelect(variant);
    const options = await screen.findAllByRole("option");
    for (const option of options) expect(option.textContent).toMatch(/^EN\(/);
    expect(within(document.body).getByRole("option", { name: "EN(Contorno)" })).toBeInTheDocument();
  });
});
