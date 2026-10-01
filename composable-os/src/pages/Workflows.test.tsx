import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import Workflows from "@/pages/Workflows";
import { createPseudoInstance, notFromCatalogue, renderPageWithI18n, visibleStrings } from "@/test/i18n";

const svc = vi.hoisted(() => ({
  getAll: vi.fn(),
  create: vi.fn(),
  toggle: vi.fn(),
  delete: vi.fn(),
  getRuns: vi.fn(),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("@/services/workflows", () => ({ workflowsService: svc }));
vi.mock("sonner", () => ({ toast }));

/** Datos del backend: no pertenecen al catalogo de la app y no se traducen. */
const DATA = ["Alta de leads", "Cierre de ventas", "Avisa al equipo", "LeadCaptured", "boom", "hola"];

const workflow = (over: Record<string, unknown> = {}) => ({
  id: "w1",
  name: "Alta de leads",
  description: "Avisa al equipo",
  trigger_type: "event",
  trigger_config: { event_type: "LeadCaptured" },
  conditions: [{ field: "a", operator: "eq", value: 1 }],
  actions: [
    { type: "log", config: { message: "hola" } },
    { type: "log", config: {} },
    { type: "log", config: {} },
  ],
  enabled: true,
  run_count: 1,
  last_triggered_at: "2026-09-30T12:00:00Z",
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
  ...over,
});

const runs = [
  {
    id: "r1", workflow_id: "w1", status: "completed", trigger_event_type: "LeadCaptured", trigger_event_id: null,
    steps_result: [{ action_type: "log", status: "completed", detail: "", duration_ms: 12 }],
    error: null, created_at: "2026-09-30T12:00:00Z",
  },
  {
    id: "r2", workflow_id: "w1", status: "failed", trigger_event_type: null, trigger_event_id: null,
    steps_result: [], error: "boom", created_at: "2026-09-30T13:00:00Z",
  },
];

beforeEach(() => {
  Object.values(svc).forEach((fn) => fn.mockReset());
  Object.values(toast).forEach((fn) => fn.mockReset());
  svc.getAll.mockResolvedValue([
    workflow(),
    workflow({ id: "w2", name: "Cierre de ventas", description: null, conditions: [{}, {}], actions: [{ type: "log", config: {} }], run_count: 5, enabled: false, last_triggered_at: null }),
  ]);
  svc.getRuns.mockResolvedValue(runs);
  svc.create.mockResolvedValue({});
  svc.delete.mockResolvedValue(undefined);
});

describe("Workflows, in Spanish", () => {
  it("renders the header, the KPIs and the cards", async () => {
    renderPageWithI18n(<Workflows />, i18n);

    expect(screen.getByRole("heading", { name: "Workflows" })).toBeInTheDocument();
    expect(screen.getByText("Automatización event-driven — triggers, conditions y actions.")).toBeInTheDocument();
    expect(await screen.findByText("Alta de leads")).toBeInTheDocument();
    expect(screen.getByText("Activos")).toBeInTheDocument();
    expect(screen.getByText("Ejecuciones")).toBeInTheDocument();
  });

  it("agrees plurals with the number, including one", async () => {
    renderPageWithI18n(<Workflows />, i18n);
    await screen.findByText("Alta de leads");

    // Antes salia "1 runs" y "2 condition" (en ingles y sin concordar).
    expect(screen.getByText("1 ejecución")).toBeInTheDocument();
    expect(screen.getByText("5 ejecuciones")).toBeInTheDocument();
    expect(screen.getByText("1 condición")).toBeInTheDocument();
    expect(screen.getByText("2 condiciones")).toBeInTheDocument();
    expect(screen.getByText("+1 más")).toBeInTheDocument();
  });

  it("shows the trigger type translated", async () => {
    renderPageWithI18n(<Workflows />, i18n);
    await screen.findByText("Alta de leads");

    expect(screen.getAllByText("evento").length).toBeGreaterThan(0);
  });

  it("shows the empty state", async () => {
    svc.getAll.mockResolvedValue([]);
    renderPageWithI18n(<Workflows />, i18n);

    expect(await screen.findByText("Sin workflows todavía")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Crear el primero/ })).toBeInTheDocument();
  });

  it("labels the icon-only buttons", async () => {
    renderPageWithI18n(<Workflows />, i18n);
    await screen.findByText("Alta de leads");

    expect(screen.getAllByRole("button", { name: "Ver ejecuciones" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Eliminar workflow" })).toHaveLength(2);
    expect(screen.getByRole("switch", { name: "Activar o desactivar Alta de leads" })).toBeInTheDocument();
  });

  it("shows the run history with translated statuses and the raw backend error", async () => {
    renderPageWithI18n(<Workflows />, i18n);
    await screen.findByText("Alta de leads");

    fireEvent.click(screen.getAllByRole("button", { name: "Ver ejecuciones" })[0]);

    expect(await screen.findByText("Historial de ejecuciones")).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    expect(await within(dialog).findByText("fallida")).toBeInTheDocument();
    expect(within(dialog).getAllByText("completada").length).toBeGreaterThan(0);
    expect(within(dialog).getByText("Evento: LeadCaptured")).toBeInTheDocument();
    expect(within(dialog).getByText("boom")).toBeInTheDocument();
  });

  it("falls back to the raw value for a status the catalogue does not know", async () => {
    svc.getRuns.mockResolvedValue([{ ...runs[0], status: "queued_for_retry", steps_result: [] }]);
    renderPageWithI18n(<Workflows />, i18n);
    await screen.findByText("Alta de leads");

    fireEvent.click(screen.getAllByRole("button", { name: "Ver ejecuciones" })[0]);

    expect(await screen.findByText("queued_for_retry")).toBeInTheDocument();
  });

  it("shows the empty run history", async () => {
    svc.getRuns.mockResolvedValue([]);
    renderPageWithI18n(<Workflows />, i18n);
    await screen.findByText("Alta de leads");

    fireEvent.click(screen.getAllByRole("button", { name: "Ver ejecuciones" })[0]);

    expect(await screen.findByText("Sin ejecuciones aún")).toBeInTheDocument();
  });

  it("creates a workflow with the default action message of the active language", async () => {
    renderPageWithI18n(<Workflows />, i18n);
    await screen.findByText("Alta de leads");

    fireEvent.click(screen.getAllByRole("button", { name: /Nuevo Workflow/ })[0]);
    fireEvent.change(await screen.findByPlaceholderText("Ej: Notificar lead nuevo"), { target: { value: "Mi flujo" } });
    fireEvent.change(screen.getByPlaceholderText("Ej: LeadCaptured, QuoteAccepted"), { target: { value: "QuoteAccepted" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear" }));

    await waitFor(() => expect(svc.create).toHaveBeenCalled());
    const payload = svc.create.mock.calls[0][0];
    expect(payload.name).toBe("Mi flujo");
    expect(payload.trigger_config).toEqual({ event_type: "QuoteAccepted" });
    expect(payload.actions).toEqual([{ type: "log", config: { message: "Workflow ejecutado" } }]);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Workflow creado"));
  });

  it("sends the message the user typed instead of the default", async () => {
    renderPageWithI18n(<Workflows />, i18n);
    await screen.findByText("Alta de leads");

    fireEvent.click(screen.getAllByRole("button", { name: /Nuevo Workflow/ })[0]);
    fireEvent.change(await screen.findByPlaceholderText("Ej: Notificar lead nuevo"), { target: { value: "Mi flujo" } });
    fireEvent.change(screen.getByPlaceholderText("Ej: LeadCaptured, QuoteAccepted"), { target: { value: "QuoteAccepted" } });
    fireEvent.change(screen.getByPlaceholderText("Usa {field} para valores del evento"), { target: { value: "Se cerro {field}" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear" }));

    await waitFor(() => expect(svc.create).toHaveBeenCalled());
    expect(svc.create.mock.calls[0][0].actions).toEqual([{ type: "log", config: { message: "Se cerro {field}" } }]);
  });

  it("deletes a workflow and confirms it", async () => {
    renderPageWithI18n(<Workflows />, i18n);
    await screen.findByText("Alta de leads");

    fireEvent.click(screen.getAllByRole("button", { name: "Eliminar workflow" })[0]);

    await waitFor(() => expect(svc.delete).toHaveBeenCalled());
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Workflow eliminado"));
  });
});

/**
 * La prueba de que la pagina esta migrada entera, en los tres sitios donde hay
 * texto: la pagina, el dialogo de historial y el de creacion. Lo que el test
 * sembro como dato del backend y las fechas formateadas no cuentan.
 */
describe("Workflows, in a second language", () => {
  it("has no string left outside the catalogue on the page", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPageWithI18n(<Workflows />, english);
    await screen.findByText("Alta de leads");

    expect(notFromCatalogue(visibleStrings(container), DATA)).toEqual([]);
  });

  it("has no string left outside the catalogue in the run history", async () => {
    const english = await createPseudoInstance("en");
    renderPageWithI18n(<Workflows />, english);
    await screen.findByText("Alta de leads");

    fireEvent.click(screen.getAllByRole("button", { name: "EN(Ver ejecuciones)" })[0]);
    await screen.findByText("EN(Historial de ejecuciones)");
    await screen.findByText("EN(fallida)");

    expect(notFromCatalogue(visibleStrings(screen.getByRole("dialog")), DATA)).toEqual([]);
  });

  it("has no string left outside the catalogue in the create dialog", async () => {
    const english = await createPseudoInstance("en");
    renderPageWithI18n(<Workflows />, english);
    await screen.findByText("Alta de leads");

    fireEvent.click(screen.getAllByRole("button", { name: /EN\(Nuevo Workflow\)/ })[0]);
    await screen.findByPlaceholderText("EN(Ej: Notificar lead nuevo)");

    expect(notFromCatalogue(visibleStrings(screen.getByRole("dialog")), DATA)).toEqual([]);
  });

  it("uses the second language's default action message", async () => {
    const english = await createPseudoInstance("en");
    renderPageWithI18n(<Workflows />, english);
    await screen.findByText("Alta de leads");

    fireEvent.click(screen.getAllByRole("button", { name: /EN\(Nuevo Workflow\)/ })[0]);
    fireEvent.change(await screen.findByPlaceholderText("EN(Ej: Notificar lead nuevo)"), { target: { value: "x" } });
    fireEvent.change(screen.getByPlaceholderText("EN(Ej: LeadCaptured, QuoteAccepted)"), { target: { value: "QuoteAccepted" } });
    fireEvent.click(screen.getByRole("button", { name: "EN(Crear)" }));

    await waitFor(() => expect(svc.create).toHaveBeenCalled());
    expect(svc.create.mock.calls[0][0].actions[0].config.message).toBe("EN(Workflow ejecutado)");
  });
});
