import { fireEvent, screen, waitFor } from "@testing-library/react";
import i18next, { type i18n as I18n } from "i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildI18nOptions, resources } from "@/i18n";
import CRM from "@/pages/CRM";
import { renderPageWithI18n } from "@/test/i18n";

/**
 * `crm` en el ingles *real* (tarea 12 del plan de i18n): el pipeline, las pestanas, los
 * dialogos y los avisos con el catalogo `en` que se envia. Las etapas y los tipos de
 * actividad salen del `en` de `common`.
 */

const svc = vi.hoisted(() => ({
  getOpportunities: vi.fn(), getLeads: vi.fn(), getContacts: vi.fn(), getOrganizations: vi.fn(),
  getActivities: vi.fn(), changeStage: vi.fn(), convertLead: vi.fn(), logActivity: vi.fn(),
  createLead: vi.fn(), createOpportunity: vi.fn(),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("@/services/crm", () => ({ crmService: svc }));
vi.mock("sonner", () => ({ toast }));

async function english(): Promise<I18n> {
  const instance = i18next.createInstance();
  await instance.init(buildI18nOptions(resources, "en"));
  return instance;
}

const opp = (over: Record<string, unknown> = {}) => ({
  id: "o1", title: "Shoes Sun", stage: "new", value: 1000, currency: "USD", probability: 40, close_date: null,
  description: null, contact_id: null, organization_id: null, lost_reason: null, won_at: null, lost_at: null,
  created_at: "2026-01-01T00:00:00Z", ...over,
});
const lead = (over: Record<string, unknown> = {}) => ({
  id: "l1", first_name: "Ana", last_name: "Perez", email: "ana@sol.co", phone: null, company_name: "Sun Workshop",
  source: "referral", status: "contacted", notes: null, created_at: "2026-01-01T00:00:00Z", ...over,
});

const renderPage = (instance: I18n) => renderPageWithI18n(<CRM />, instance);
const openTab = (name: string) => fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });

beforeEach(() => {
  Object.values(svc).forEach((fn) => fn.mockReset());
  toast.success.mockReset();
  toast.error.mockReset();
  svc.getOpportunities.mockResolvedValue([
    opp(),
    opp({ id: "o2", title: "Big sale", stage: "won", value: 3000, probability: 100 }),
    opp({ id: "o3", title: "Cold deal", stage: "lost", value: 0, probability: 10 }),
  ]);
  svc.getLeads.mockResolvedValue([lead(), lead({ id: "l2", first_name: "Luis", last_name: "Gomez", status: "converted", source: null })]);
  svc.getContacts.mockResolvedValue([
    { id: "c1", first_name: "Ana", last_name: "Perez", email: "ana@sol.co", phone: "555-0101", title: "Manager", organization_id: null, organization_name: "Sun Inc.", created_at: "" },
  ]);
  svc.getOrganizations.mockResolvedValue([
    { id: "g1", name: "Sun Inc.", industry: "Footwear", website: "https://sol.co", phone: null, created_at: "" },
  ]);
  svc.getActivities.mockResolvedValue([
    { id: "a1", activity_type: "call", title: "Follow-up call", description: "Summary", entity_type: "lead", entity_id: "l1", user_id: null, due_date: null, completed_at: null, created_at: "2026-03-05T10:00:00Z" },
  ]);
  svc.changeStage.mockResolvedValue({});
  svc.convertLead.mockResolvedValue({});
  svc.logActivity.mockResolvedValue({});
  svc.createLead.mockResolvedValue({});
  svc.createOpportunity.mockResolvedValue({});
});

describe("CRM in English", () => {
  it("renders the header, the KPIs and the stage names of the pipeline", async () => {
    renderPage(await english());

    expect(screen.getByRole("heading", { name: "CRM" })).toBeInTheDocument();
    expect(screen.getByText("Manage leads, deals and relationships — connected to the backend in real time.")).toBeInTheDocument();
    expect(await screen.findByText("Shoes Sun")).toBeInTheDocument();
    for (const text of ["Total pipeline", "Open opportunities", "Win rate", "Average size"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    for (const stage of ["New", "Qualified", "Proposal", "Negotiation", "Won", "Lost"]) {
      expect(screen.getAllByText(stage).length).toBeGreaterThan(0);
    }
    expect(screen.queryByText("Nueva")).not.toBeInTheDocument();
  });

  it("names the five tabs and the header buttons in English", async () => {
    renderPage(await english());

    for (const tab of ["Pipeline", "Leads", "Contacts", "Organisations", "Activity"]) {
      expect(screen.getByRole("tab", { name: tab })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: /New lead/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New opportunity/ })).toBeInTheDocument();
  });

  it("lists the leads with a translated status and source", async () => {
    renderPage(await english());
    openTab("Leads");

    expect(await screen.findByText("Ana Perez")).toBeInTheDocument();
    expect(screen.getByText("contacted")).toBeInTheDocument();
    expect(screen.getByText("referral")).toBeInTheDocument();
    expect(screen.getByText("converted")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Log/ })).toHaveLength(2);
    // Un lead ya convertido no se vuelve a convertir.
    expect(screen.getAllByRole("button", { name: /Convert/ })).toHaveLength(1);
  });

  it("explains an empty lead list", async () => {
    svc.getLeads.mockResolvedValue([]);
    renderPage(await english());
    openTab("Leads");

    expect(await screen.findByText("No leads recorded")).toBeInTheDocument();
  });

  it("lists contacts and organizations", async () => {
    renderPage(await english());
    openTab("Contacts");
    expect(await screen.findByText("Manager")).toBeInTheDocument();

    openTab("Organisations");
    expect(await screen.findByText("Footwear")).toBeInTheDocument();
  });

  it("shows the activity timeline with the type and entity in English", async () => {
    renderPage(await english());
    openTab("Activity");

    expect(await screen.findByText("Activity timeline")).toBeInTheDocument();
    expect(screen.getByText("Recent")).toBeInTheDocument();
    expect(screen.getByText("call · lead")).toBeInTheDocument();
  });

  it("explains an empty timeline", async () => {
    svc.getActivities.mockResolvedValue([]);
    renderPage(await english());
    openTab("Activity");

    expect(await screen.findByText("No activity recorded")).toBeInTheDocument();
  });

  it("surfaces a failed load as an English toast", async () => {
    svc.getOpportunities.mockRejectedValue(new Error("down"));
    renderPage(await english());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Error loading opportunities: down"), { timeout: 5000 });
  });

  it("changes a deal's stage and confirms", async () => {
    renderPage(await english());
    fireEvent.click(await screen.findByText("Shoes Sun"));

    expect(await screen.findByText("Change stage — Shoes Sun")).toBeInTheDocument();
    expect(screen.getByText("New stage")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Stage updated"));
  });

  it("converts a lead and confirms", async () => {
    renderPage(await english());
    openTab("Leads");
    fireEvent.click(await screen.findByRole("button", { name: /Convert/ }));

    expect(await screen.findByText("Convert lead — Ana")).toBeInTheDocument();
    expect(screen.getByText("Opportunity title *")).toBeInTheDocument();
    expect(screen.getByText("Value ($)")).toBeInTheDocument();
    expect(screen.getByText("Close date")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Convert" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Lead converted to opportunity"));
  });

  it("logs an activity from a lead and confirms", async () => {
    renderPage(await english());
    openTab("Leads");
    fireEvent.click((await screen.findAllByRole("button", { name: /Log/ }))[0]);

    expect(await screen.findByText("Log activity — Ana Perez")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "Call" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Activity logged"));
  });

  it("creates a lead and an opportunity, confirming each", async () => {
    renderPage(await english());
    fireEvent.click(screen.getByRole("button", { name: /New lead/ }));
    expect(await screen.findByText("First name *")).toBeInTheDocument();
    expect(screen.getByText("Last name")).toBeInTheDocument();
    expect(screen.getByText("Company")).toBeInTheDocument();
    expect(screen.getByText("Source")).toBeInTheDocument();
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "Ana" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Lead created"));

    fireEvent.click(await screen.findByRole("button", { name: /New opportunity/ }));
    expect(await screen.findByText("Probability (%)")).toBeInTheDocument();
    expect(screen.getByText("Stage")).toBeInTheDocument();
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "Deal" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Opportunity created"));
  });
});
