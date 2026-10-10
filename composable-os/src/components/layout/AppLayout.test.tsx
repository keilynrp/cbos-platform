import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppLayout } from "@/components/layout/AppLayout";
import i18n from "@/i18n";
import {
  FORMATTED_RELATIVE, createPseudoInstance, notFromCatalogue, renderWithI18n, visibleStrings,
} from "@/test/i18n";

const auth = vi.hoisted(() => ({ user: null as null | Record<string, unknown>, logout: vi.fn() }));
const notif = vi.hoisted(() => ({
  notifications: [] as Array<Record<string, unknown>>,
  unreadCount: 0,
  markAllRead: vi.fn(),
  dismiss: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: auth.user, logout: auth.logout }) }));
vi.mock("@/lib/useNotifications", () => ({ useNotifications: () => notif }));

/** Iniciales del avatar y nombre del producto: no son de ningun idioma. */
const NOT_TEXT = [/^AT$/, /^CBOS$/];

/** Lo que llega del servidor o del usuario: no es texto de la interfaz. */
const DATA = ["Ana Torres", "ana@sol.co", "QuoteAccepted"];

const note = (over: Record<string, unknown> = {}) => ({
  id: "n1", event_type: "QuoteAccepted", payload: {}, entity_id: null,
  timestamp: new Date(Date.now() - 5 * 60_000).toISOString(), read: false, ...over,
});

const renderLayout = (instance = i18n) => renderWithI18n(<AppLayout />, instance);
const openBell = (name: string) => fireEvent.click(screen.getByRole("button", { name }));

beforeEach(() => {
  auth.user = { full_name: "Ana Torres", email: "ana@sol.co" };
  auth.logout.mockReset();
  notif.notifications = [note()];
  notif.unreadCount = 1;
  notif.markAllRead.mockReset();
  notif.dismiss.mockReset();
});

describe("AppLayout / AppSidebar en español", () => {
  it("muestra la navegación con sus secciones", () => {
    renderLayout();

    for (const section of ["Comercio", "Operaciones", "Sistema"]) {
      expect(screen.getByText(section)).toBeInTheDocument();
    }
    for (const item of [
      "Dashboard", "CRM", "Ventas", "Inventario", "Portal", "Facturación", "Contratos", "Proyectos",
      "Equipo", "Workflows", "Discovery", "Analítica", "Ajustes",
    ]) {
      expect(screen.getByRole("link", { name: item })).toBeInTheDocument();
    }
  });

  it("los enlaces siguen apuntando a su ruta", () => {
    renderLayout();

    expect(screen.getByRole("link", { name: "Ventas" })).toHaveAttribute("href", "/sales");
    expect(screen.getByRole("link", { name: "Equipo" })).toHaveAttribute("href", "/hr");
    expect(screen.getByRole("link", { name: "Portal" })).toHaveAttribute("href", "/portal-builder");
  });

  it("el pie ofrece cambiar de tema y colapsar", () => {
    renderLayout();

    expect(screen.getByRole("button", { name: "Modo oscuro" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Colapsar" })).toBeInTheDocument();
  });

  it("colapsar cambia el nombre del botón a Expandir", () => {
    renderLayout();

    fireEvent.click(screen.getByRole("button", { name: "Colapsar" }));

    expect(screen.getByRole("button", { name: "Expandir" })).toBeInTheDocument();
  });

  it("la cabecera tiene búsqueda, el usuario y salir", () => {
    renderLayout();

    expect(screen.getByPlaceholderText("Buscar en la plataforma...")).toBeInTheDocument();
    expect(screen.getAllByText("Ana Torres").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(auth.logout).toHaveBeenCalledOnce();
  });

  it("sin nombre cae a «Usuario»", () => {
    auth.user = { full_name: null, email: "ana@sol.co" };
    renderLayout();

    expect(screen.getAllByText("Usuario").length).toBeGreaterThan(0);
  });

  it("las notificaciones: lista, tiempo relativo, marcar todas y descartar", () => {
    renderLayout();

    openBell("Notificaciones");

    expect(screen.getByText("Cotización aceptada")).toBeInTheDocument();
    expect(screen.getByText(/QuoteAccepted · hace 5 min/)).toBeInTheDocument();
    expect(notif.markAllRead).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Marcar todas" }));
    expect(notif.markAllRead).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
    expect(notif.dismiss).toHaveBeenCalledWith("n1");
  });

  it("el texto de la notificacion sale del catalogo segun el tipo de evento", () => {
    notif.notifications = [
      note({ id: "n1", event_type: "InvoiceOverdue" }),
      note({ id: "n2", event_type: "EventoNuevo" }),
    ];
    renderLayout();

    openBell("Notificaciones");

    expect(screen.getByText("Factura vencida ⚠️")).toBeInTheDocument();
    // Un evento sin entrada en el catalogo se muestra con su nombre, no con un hueco.
    expect(screen.getByText("EventoNuevo")).toBeInTheDocument();
  });

  it("sin notificaciones lo dice", () => {
    notif.notifications = [];
    notif.unreadCount = 0;
    renderLayout();

    openBell("Notificaciones");

    expect(screen.getByText("Sin notificaciones")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Marcar todas" })).not.toBeInTheDocument();
  });
});

describe("AppLayout / AppSidebar: nada cableado (idioma pseudo-localizado)", () => {
  it("la navegación, la cabecera y el pie", async () => {
    const en = await createPseudoInstance("en");
    const { container } = renderLayout(en);

    const leaked = notFromCatalogue(visibleStrings(container), DATA, [FORMATTED_RELATIVE, ...NOT_TEXT]);

    expect(leaked).toEqual([]);
    expect(screen.getByRole("link", { name: "EN(Ventas)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "EN(Colapsar)" })).toBeInTheDocument();
  });

  it("el panel de notificaciones, con y sin datos", async () => {
    const en = await createPseudoInstance("en");

    const { unmount } = renderLayout(en);
    openBell("EN(Notificaciones)");
    const popover = document.body;
    expect(within(popover).getByRole("button", { name: "EN(Marcar todas)" })).toBeInTheDocument();
    expect(within(popover).getByRole("button", { name: "EN(Descartar)" })).toBeInTheDocument();
    const withData = notFromCatalogue(visibleStrings(popover), DATA, [FORMATTED_RELATIVE, ...NOT_TEXT]);
    expect(withData).toEqual([]);
    unmount();

    notif.notifications = [];
    notif.unreadCount = 0;
    renderLayout(en);
    openBell("EN(Notificaciones)");
    expect(screen.getByText("EN(Sin notificaciones)")).toBeInTheDocument();
  });

  it("el usuario sin nombre y el cierre de sesión", async () => {
    auth.user = { full_name: null, email: "ana@sol.co" };
    const en = await createPseudoInstance("en");
    renderLayout(en);

    expect(screen.getAllByText("EN(Usuario)").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "EN(Cerrar sesión)" })).toBeInTheDocument();
  });
});
