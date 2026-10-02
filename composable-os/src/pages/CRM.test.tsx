import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import CRM from "@/pages/CRM";
import {
  FORMATTED_CURRENCY, createPseudoInstance, notFromCatalogue, renderPageWithI18n, visibleStrings,
} from "@/test/i18n";

const svc = vi.hoisted(() => ({
  getOpportunities: vi.fn(), getLeads: vi.fn(), getContacts: vi.fn(), getOrganizations: vi.fn(),
  getActivities: vi.fn(), changeStage: vi.fn(), convertLead: vi.fn(), logActivity: vi.fn(),
  createLead: vi.fn(), createOpportunity: vi.fn(),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("@/services/crm", () => ({ crmService: svc }));
vi.mock("sonner", () => ({ toast }));

/** Datos del usuario (nombres, empresas, titulos): no son texto de la interfaz. */
const DATA = [
  "Zapatos Sol", "Venta grande", "Ana Pérez", "Luis Gómez", "Taller Sol", "ana@sol.co", "Gerente", "Sol S.A.",
  "Trato frio", "Calzado", "Llamada de seguimiento", "Resumen", "https://sol.co", "555-0101",
];
/** Fecha corta (`30/9/2026`, `9/30/2026`) e iniciales de los avatares. */
const FORMATTED_DATE = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
const INITIALS = /^[A-Z]{1,2}$/;
const PERCENT = /^\d+(\.\d+)?%$/;

const opp = (over: Record<string, unknown> = {}) => ({
  id: "o1", title: "Zapatos Sol", stage: "new", value: 1000, currency: "USD", probability: 40, close_date: null,
  description: null, contact_id: null, organization_id: null, lost_reason: null, won_at: null, lost_at: null,
  created_at: "2026-01-01T00:00:00Z", ...over,
});
const lead = (over: Record<string, unknown> = {}) => ({
  id: "l1", first_name: "Ana", last_name: "Pérez", email: "ana@sol.co", phone: null, company_name: "Taller Sol",
  source: "referral", status: "contacted", notes: null, created_at: "2026-01-01T00:00:00Z", ...over,
});

const renderPage = (instance = i18n) => renderPageWithI18n(<CRM />, instance);
const openTab = (name: string | RegExp) => fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });

beforeEach(() => {
  Object.values(svc).forEach((fn) => fn.mockReset());
  toast.success.mockReset();
  toast.error.mockReset();
  svc.getOpportunities.mockResolvedValue([
    opp(),
    opp({ id: "o2", title: "Venta grande", stage: "won", value: 3000, probability: 100 }),
    opp({ id: "o3", title: "Trato frio", stage: "lost", value: 0, probability: 10 }),
  ]);
  svc.getLeads.mockResolvedValue([lead(), lead({ id: "l2", first_name: "Luis", last_name: "Gómez", status: "converted", source: null })]);
  svc.getContacts.mockResolvedValue([
    { id: "c1", first_name: "Ana", last_name: "Pérez", email: "ana@sol.co", phone: "555-0101", title: "Gerente", organization_id: null, organization_name: "Sol S.A.", created_at: "" },
  ]);
  svc.getOrganizations.mockResolvedValue([
    { id: "g1", name: "Sol S.A.", industry: "Calzado", website: "https://sol.co", phone: null, created_at: "" },
  ]);
  svc.getActivities.mockResolvedValue([
    { id: "a1", activity_type: "call", title: "Llamada de seguimiento", description: "Resumen", entity_type: "lead", entity_id: "l1", user_id: null, due_date: null, completed_at: null, created_at: "2026-03-05T10:00:00Z" },
  ]);
  svc.changeStage.mockResolvedValue({});
  svc.convertLead.mockResolvedValue({});
  svc.logActivity.mockResolvedValue({});
  svc.createLead.mockResolvedValue({});
  svc.createOpportunity.mockResolvedValue({});
});

describe("CRM, in Spanish", () => {
  it("renders the header, the KPIs and the stage names of the pipeline", async () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "CRM" })).toBeInTheDocument();
    expect(screen.getByText("Gestiona leads, deals y relaciones — conectado al backend en tiempo real.")).toBeInTheDocument();
    expect(await screen.findByText("Zapatos Sol")).toBeInTheDocument();
    for (const text of ["Pipeline total", "Oportunidades abiertas", "Tasa de cierre", "Tamaño medio"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    // Antes: New, Qualified, Proposal, Negotiation, Won, Lost.
    for (const stage of ["Nueva", "Calificada", "Propuesta", "Negociación", "Ganada", "Perdida"]) {
      expect(screen.getAllByText(stage).length).toBeGreaterThan(0);
    }
  });

  it("shows the win rate as a percentage and each deal's probability", async () => {
    renderPage();
    await screen.findByText("Zapatos Sol");

    expect(screen.getByText("33%")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("names the five tabs in Spanish", () => {
    renderPage();

    for (const tab of ["Pipeline", "Leads", "Contactos", "Organizaciones", "Actividad"]) {
      expect(screen.getByRole("tab", { name: tab })).toBeInTheDocument();
    }
  });

  it("lists the leads with a translated status and source", async () => {
    renderPage();
    openTab("Leads");

    expect(await screen.findByText("Ana Pérez")).toBeInTheDocument();
    expect(screen.getByText("contactado")).toBeInTheDocument();
    expect(screen.getByText("referido")).toBeInTheDocument();
    expect(screen.getByText("convertido")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Registrar/ })).toHaveLength(2);
    // Un lead ya convertido no se vuelve a convertir.
    expect(screen.getAllByRole("button", { name: /Convertir/ })).toHaveLength(1);
  });

  it("falls back to the raw value for a lead status the catalogue does not know", async () => {
    svc.getLeads.mockResolvedValue([lead({ status: "frozen_x" })]);
    renderPage();
    openTab("Leads");

    expect(await screen.findByText("frozen_x")).toBeInTheDocument();
  });

  it("explains an empty lead list", async () => {
    svc.getLeads.mockResolvedValue([]);
    renderPage();
    openTab("Leads");

    expect(await screen.findByText("Sin leads registrados")).toBeInTheDocument();
  });

  it("lists contacts and organizations", async () => {
    renderPage();
    openTab("Contactos");
    expect(await screen.findByText("Gerente")).toBeInTheDocument();

    openTab("Organizaciones");
    expect(await screen.findByText("Calzado")).toBeInTheDocument();
  });

  it("shows the activity timeline with the type and entity in Spanish", async () => {
    renderPage();
    openTab("Actividad");

    expect(await screen.findByText("Cronología de actividad")).toBeInTheDocument();
    expect(screen.getByText("Recientes")).toBeInTheDocument();
    // Antes: "call · lead", crudo y en ingles.
    expect(screen.getByText("llamada · lead")).toBeInTheDocument();
  });

  it("explains an empty timeline", async () => {
    svc.getActivities.mockResolvedValue([]);
    renderPage();
    openTab("Actividad");

    expect(await screen.findByText("Sin actividad registrada")).toBeInTheDocument();
  });

  it("surfaces a failed load as a translated toast", async () => {
    svc.getOpportunities.mockRejectedValue(new Error("down"));
    renderPage();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Error cargando oportunidades: down"), { timeout: 5000 });
  });

  it("changes a deal's stage, naming the stages in Spanish, and confirms", async () => {
    renderPage();
    fireEvent.click(await screen.findByText("Zapatos Sol"));

    expect(await screen.findByText("Cambiar etapa — Zapatos Sol")).toBeInTheDocument();
    expect(screen.getByText("Nueva etapa")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Etapa actualizada"));
  });

  it("converts a lead and confirms", async () => {
    renderPage();
    openTab("Leads");
    fireEvent.click(await screen.findByRole("button", { name: /Convertir/ }));

    expect(await screen.findByText("Convertir lead — Ana")).toBeInTheDocument();
    expect(screen.getByText("Título de la oportunidad *")).toBeInTheDocument();
    expect(screen.getByText("Valor ($)")).toBeInTheDocument();
    expect(screen.getByText("Fecha de cierre")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Convertir" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Lead convertido a oportunidad"));
  });

  it("logs an activity from a lead and confirms", async () => {
    renderPage();
    openTab("Leads");
    fireEvent.click((await screen.findAllByRole("button", { name: /Registrar/ }))[0]);

    expect(await screen.findByText("Registrar actividad — Ana Pérez")).toBeInTheDocument();
    expect(screen.getByText("Tipo")).toBeInTheDocument();
    expect(screen.getByText("Descripción")).toBeInTheDocument();
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "Llamada" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Actividad registrada"));
  });

  it("creates a lead and an opportunity, confirming each", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Nuevo Lead/ }));
    expect(await screen.findByText("Nombre *")).toBeInTheDocument();
    expect(screen.getByText("Apellido")).toBeInTheDocument();
    expect(screen.getByText("Empresa")).toBeInTheDocument();
    expect(screen.getByText("Fuente")).toBeInTheDocument();
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "Ana" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Lead creado"));

    fireEvent.click(await screen.findByRole("button", { name: /Nueva Oportunidad/ }));
    expect(await screen.findByText("Probabilidad (%)")).toBeInTheDocument();
    expect(screen.getByText("Etapa")).toBeInTheDocument();
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "Trato" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Oportunidad creada"));
  });
});

describe("CRM, in a second language", () => {
  const strings = (root: HTMLElement) =>
    notFromCatalogue(visibleStrings(root), DATA, [FORMATTED_CURRENCY, FORMATTED_DATE, INITIALS, PERCENT]);

  it("has no string left outside the catalogue in the pipeline", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPage(english);
    await screen.findByText("Zapatos Sol");

    expect(strings(container)).toEqual([]);
    expect(screen.getAllByText("EN(Nueva)").length).toBeGreaterThan(0);
  });

  it("has no string left outside the catalogue in the leads, contacts, organizations and activity tabs", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPage(english);

    openTab("EN(Leads)");
    await screen.findByText("EN(contactado)");
    expect(strings(container)).toEqual([]);

    openTab("EN(Contactos)");
    await screen.findByText("Gerente");
    expect(strings(container)).toEqual([]);

    openTab("EN(Organizaciones)");
    await screen.findByText("Calzado");
    expect(strings(container)).toEqual([]);

    openTab("EN(Actividad)");
    await screen.findByText("EN(Cronología de actividad)");
    expect(strings(container)).toEqual([]);
    expect(screen.getByText("EN(llamada) · EN(lead)")).toBeInTheDocument();
  });

  it("has no string left outside the catalogue in the stage, convert and log dialogs", async () => {
    const english = await createPseudoInstance("en");
    renderPage(english);

    fireEvent.click(await screen.findByText("Zapatos Sol"));
    let dialog = await screen.findByRole("dialog");
    expect(strings(dialog)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "EN(Cancelar)" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    openTab("EN(Leads)");
    fireEvent.click(await screen.findByRole("button", { name: /EN\(Convertir\)/ }));
    dialog = await screen.findByRole("dialog");
    expect(strings(dialog)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "EN(Cancelar)" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    fireEvent.click((await screen.findAllByRole("button", { name: /EN\(Registrar\)/ }))[0]);
    dialog = await screen.findByRole("dialog");
    expect(strings(dialog)).toEqual([]);
  });

  it("has no string left outside the catalogue in the new lead and opportunity dialogs", async () => {
    const english = await createPseudoInstance("en");
    renderPage(english);

    fireEvent.click(screen.getByRole("button", { name: /EN\(Nuevo Lead\)/ }));
    let dialog = await screen.findByRole("dialog");
    expect(strings(dialog)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "EN(Cancelar)" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /EN\(Nueva Oportunidad\)/ }));
    dialog = await screen.findByRole("dialog");
    expect(strings(dialog)).toEqual([]);
  });
});
