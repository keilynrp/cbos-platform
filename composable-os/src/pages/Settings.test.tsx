import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import Settings from "@/pages/Settings";
import {
  FORMATTED_RELATIVE, createPseudoInstance, notFromCatalogue, renderPageWithI18n, visibleStrings,
} from "@/test/i18n";

const svc = vi.hoisted(() => ({ getHealth: vi.fn() }));
const http = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));

vi.mock("@/services/health", () => ({ healthService: svc }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: http,
}));

/** Datos que no son texto de la interfaz: miembros de muestra, valores por defecto, nombres crudos. */
const DATA = ["Sarah Chen", "James Park", "Alex Kim", "Maria Lopez", "Sam Rivera", "Jordan Davis", "@composable.dev", "Composable OS", "composable-os.app", "redis", "HTTPS"];
const INITIALS = /^[A-Z]{2}$/;

const health = (over: Record<string, unknown> = {}) => ({
  status: "healthy",
  version: "1.2.3",
  checks: [
    { name: "api", status: "healthy", latency_ms: 12 },
    { name: "postgres", status: "degraded", latency_ms: 340 },
  ],
  ...over,
});

const prefs = (over: Record<string, unknown> = {}) => ({
  email_enabled: true,
  email_events: { QuoteAccepted: true, SalesOrderCreated: true, WorkflowFailed: true, InventoryLowThresholdDetected: false, InvoiceOverdue: false },
  ...over,
});

beforeEach(() => {
  svc.getHealth.mockReset().mockResolvedValue(health());
  http.get.mockReset().mockResolvedValue(prefs());
  // Como el backend: fusiona `email_events` en lugar de reemplazarlo.
  http.put.mockReset().mockImplementation(async (_url: string, patch: { email_enabled?: boolean; email_events?: Record<string, boolean> }) => {
    const current = prefs();
    return { ...current, ...patch, email_events: { ...current.email_events, ...(patch.email_events ?? {}) } };
  });
});

/** Radix activa una pestana con `mousedown`, no con `click`. */
const openTab = (name: string | RegExp) => fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });

describe("Settings, in Spanish", () => {
  it("renders the header and the five tabs", () => {
    renderPageWithI18n(<Settings />, i18n);

    expect(screen.getByRole("heading", { name: "Ajustes" })).toBeInTheDocument();
    expect(screen.getByText("Configuración de la plataforma, arquitectura y estado del sistema.")).toBeInTheDocument();
    for (const tab of ["Arquitectura", "Estado del sistema", "Notificaciones", "General", "Equipo"]) {
      expect(screen.getByRole("tab", { name: tab })).toBeInTheDocument();
    }
  });

  describe("architecture", () => {
    it("shows the diagram translated, with the protocol name left alone", () => {
      renderPageWithI18n(<Settings />, i18n);

      expect(screen.getByText("Arquitectura de la plataforma")).toBeInTheDocument();
      expect(screen.getByText(/Pasa el cursor sobre los componentes/)).toBeInTheDocument();
      expect(screen.getByText("Aplicaciones cliente")).toBeInTheDocument();
      expect(screen.getByText("Base de datos vectorial")).toBeInTheDocument();
      expect(screen.getByText("PostgreSQL")).toBeInTheDocument();
      expect(screen.getByText("CAPA DE API")).toBeInTheDocument();
      expect(screen.getByText("MICROSERVICIOS")).toBeInTheDocument();
      expect(screen.getByText("HTTPS")).toBeInTheDocument();
    });

    it("explains the three layers below the diagram, now in Spanish", () => {
      renderPageWithI18n(<Settings />, i18n);

      expect(screen.getByText("Capa de datos")).toBeInTheDocument();
      expect(screen.getByText(/La mensajería pub\/sub asíncrona/)).toBeInTheDocument();
      expect(screen.getByText(/Gestiona la autenticación/)).toBeInTheDocument();
    });
  });

  describe("system health", () => {
    it("shows each service with a translated status and a formatted latency", async () => {
      renderPageWithI18n(<Settings />, i18n);
      openTab("Estado del sistema");

      expect(await screen.findByText("saludable", { selector: "div" })).toBeInTheDocument();
      expect(screen.getByText("degradado")).toBeInTheDocument();
      expect(screen.getByText("API Gateway")).toBeInTheDocument();
      expect(screen.getByText("12ms")).toBeInTheDocument();
      expect(screen.getByText("340ms")).toBeInTheDocument();
      expect(screen.getAllByText("Latencia")).toHaveLength(2);
    });

    it("shows the overall status, the version and how fresh the data is", async () => {
      renderPageWithI18n(<Settings />, i18n);
      openTab("Estado del sistema");

      expect(await screen.findByText(/Estado general:/)).toBeInTheDocument();
      expect(screen.getByText(/v1\.2\.3/)).toBeInTheDocument();
      // Antes: "Actualizado hace 0s".
      expect(await screen.findByText(/^Actualizado (ahora|hace \d+ s)$/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Actualizar" })).toBeInTheDocument();
    });

    it("falls back to the raw name of a service the catalogue does not know", async () => {
      svc.getHealth.mockResolvedValue(health({ checks: [{ name: "redis", status: "healthy", latency_ms: 3 }] }));
      renderPageWithI18n(<Settings />, i18n);
      openTab("Estado del sistema");

      expect(await screen.findByText("redis")).toBeInTheDocument();
    });

    it("explains when the backend cannot be reached", async () => {
      svc.getHealth.mockRejectedValue(new Error("down"));
      renderPageWithI18n(<Settings />, i18n);
      openTab("Estado del sistema");

      expect(await screen.findByText(/No se pudo conectar con el sistema/, undefined, { timeout: 5000 })).toBeInTheDocument();
    });
  });

  describe("notifications", () => {
    it("lists the event types in Spanish with named switches and a summary", async () => {
      renderPageWithI18n(<Settings />, i18n);
      openTab("Notificaciones");

      expect(await screen.findByText("Cotizaciones aceptadas")).toBeInTheDocument();
      expect(screen.getByText("Tipos de evento")).toBeInTheDocument();
      expect(screen.getByRole("switch", { name: "Cotizaciones aceptadas" })).toBeChecked();
      expect(screen.getByRole("switch", { name: "Stock bajo" })).not.toBeChecked();
      expect(screen.getByText("3 de 5 tipos de evento activos")).toBeInTheDocument();
    });

    it("saves a per-event toggle", async () => {
      renderPageWithI18n(<Settings />, i18n);
      openTab("Notificaciones");

      fireEvent.click(await screen.findByRole("switch", { name: "Facturas vencidas" }));

      await waitFor(() => expect(http.put).toHaveBeenCalledWith("/notifications/preferences", { email_events: { InvoiceOverdue: true } }));
      expect(await screen.findByText("4 de 5 tipos de evento activos")).toBeInTheDocument();
    });

    it("turns everything off from the master switch", async () => {
      renderPageWithI18n(<Settings />, i18n);
      openTab("Notificaciones");

      fireEvent.click(await screen.findByRole("switch", { name: "Notificaciones por correo" }));

      await waitFor(() => expect(http.put).toHaveBeenCalledWith("/notifications/preferences", { email_enabled: false }));
      expect(await screen.findByText("Todas las notificaciones por correo están desactivadas")).toBeInTheDocument();
      expect(screen.getByRole("switch", { name: "Cotizaciones aceptadas" })).toBeDisabled();
    });

    it("explains the in-app notifications", async () => {
      renderPageWithI18n(<Settings />, i18n);
      openTab("Notificaciones");

      expect(await screen.findByText("Notificaciones en tiempo real")).toBeInTheDocument();
      expect(screen.getByText(/se entregan por WebSocket/)).toBeInTheDocument();
    });
  });

  describe("general and team", () => {
    it("shows the workspace form and the preferences", async () => {
      renderPageWithI18n(<Settings />, i18n);
      openTab("General");

      expect(await screen.findByText("Ajustes del workspace")).toBeInTheDocument();
      expect(screen.getByLabelText("Nombre del workspace")).toHaveValue("Composable OS");
      expect(screen.getByLabelText("URL del workspace")).toBeDisabled();
      expect(screen.getByRole("switch", { name: "Activar recomendaciones de IA" })).toBeChecked();
      expect(screen.getByText("Preferencias")).toBeInTheDocument();
    });

    it("lists the team with translated roles", async () => {
      renderPageWithI18n(<Settings />, i18n);
      openTab("Equipo");

      expect(await screen.findByText("Miembros del equipo")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Invitar/ })).toBeInTheDocument();
      expect(screen.getAllByText("Administrador")).toHaveLength(2);
      expect(screen.getAllByText("Miembro")).toHaveLength(4);
    });
  });
});

/**
 * La prueba de que la pagina esta migrada entera: cada pestana, con un catalogo
 * `en` pseudo-localizado. Los nombres de los miembros de muestra, los valores por
 * defecto y lo que formatea Intl no cuentan.
 */
describe("Settings, in a second language", () => {
  const strings = (root: HTMLElement) =>
    notFromCatalogue(visibleStrings(root), DATA, [FORMATTED_RELATIVE, INITIALS]);

  it("has no string left outside the catalogue on the architecture tab", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPageWithI18n(<Settings />, english);

    expect(strings(container)).toEqual([]);
  });

  it("has no string left outside the catalogue on the system health tab", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPageWithI18n(<Settings />, english);
    openTab("EN(Estado del sistema)");
    await screen.findAllByText("EN(saludable)");

    expect(strings(container)).toEqual([]);
  });

  it("has no string left outside the catalogue on the notifications tab", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPageWithI18n(<Settings />, english);
    openTab("EN(Notificaciones)");
    await screen.findByText("EN(Cotizaciones aceptadas)");

    expect(strings(container)).toEqual([]);
  });

  it("has no string left outside the catalogue on the general and team tabs", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPageWithI18n(<Settings />, english);

    openTab("EN(General)");
    await screen.findByText("EN(Ajustes del workspace)");
    expect(strings(container)).toEqual([]);

    openTab("EN(Equipo)");
    await screen.findByText("EN(Miembros del equipo)");
    expect(strings(container)).toEqual([]);
  });

  it("names the switches in the second language", async () => {
    const english = await createPseudoInstance("en");
    renderPageWithI18n(<Settings />, english);
    openTab("EN(Notificaciones)");

    const master = await screen.findByRole("switch", { name: "EN(Notificaciones por correo)" });
    expect(within(master.parentElement as HTMLElement).getByText("EN(Notificaciones por correo)")).toBeInTheDocument();
  });
});
