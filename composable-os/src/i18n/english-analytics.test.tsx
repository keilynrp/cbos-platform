import { fireEvent, screen } from "@testing-library/react";
import { cloneElement, type ReactElement } from "react";
import i18next, { type i18n as I18n } from "i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildI18nOptions, resources } from "@/i18n";
import Analytics from "@/pages/Analytics";
import { renderPageWithI18n } from "@/test/i18n";

/**
 * `analytics` en el ingles *real* (tarea 12 del plan de i18n): las cinco pestanas con
 * el catalogo `en` que se envia, incluidos los ejes y leyendas de los graficos, que
 * toman sus etapas y estados del `en` de `common`.
 */

const svc = vi.hoisted(() => ({
  getSummary: vi.fn(),
  getRevenue: vi.fn(),
  getPipeline: vi.fn(),
  getHR: vi.fn(),
  getProjects: vi.fn(),
  getContracts: vi.fn(),
}));

vi.mock("@/services/analytics", () => ({ analyticsService: svc }));

// En jsdom `ResponsiveContainer` no dibuja nada: con un tamano fijo los graficos
// pintan ejes y leyendas.
vi.mock("recharts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("recharts")>()),
  ResponsiveContainer: ({ children, height }: { children: ReactElement; height?: number }) =>
    cloneElement(children, { width: 800, height: height ?? 300 }),
}));

async function english(): Promise<I18n> {
  const instance = i18next.createInstance();
  await instance.init(buildI18nOptions(resources, "en"));
  return instance;
}

const summary = (overdueCount = 3) => ({
  revenue: { total_invoiced: 12_500, total_paid: 8_000, total_outstanding: 4_500, overdue_amount: 1_200, overdue_count: overdueCount },
  pipeline: { open_opportunities: 4, pipeline_value: 1_200_000, won_this_month: 2, won_value_this_month: 30_000 },
  leads: { total_active: 17, new_this_month: 5 },
  operations: { active_workflow_runs: 1, orders_pending: 2, low_stock_items: 0 },
});

beforeEach(() => {
  Object.values(svc).forEach((fn) => fn.mockReset());
  svc.getSummary.mockResolvedValue(summary());
  svc.getRevenue.mockResolvedValue({
    series: [
      { month: "2026-04", invoiced: 8000, paid: 5000, outstanding: 3000 },
      { month: "2026-05", invoiced: 12500, paid: 8000, outstanding: 4500 },
    ],
  });
  svc.getPipeline.mockResolvedValue({
    stages: [{ stage: "new", count: 3, value: 900 }, { stage: "negotiation", count: 1, value: 500 }],
    total_open: 4, total_value: 1_200_000, won_rate_30d: 0.125, avg_deal_size: 300_000,
  });
  svc.getHR.mockResolvedValue({
    active_count: 12, on_leave_count: 2, new_hires_this_month: 1, terminations_this_month: 0,
    by_employment_type: [{ employment_type: "full_time", count: 9 }, { employment_type: "contractor", count: 3 }],
    department_count: 4, unassigned_employees: 2, terminated_count: 6,
  });
  svc.getProjects.mockResolvedValue({
    active_count: 5, total_budget_active: 85_000, completed_this_month: 2, cancelled_this_month: 0,
    by_status: [{ status: "active", count: 5 }, { status: "on_hold", count: 1 }],
    task_completion_rate: 0.75, total_tasks: 40, done_tasks: 30, overdue_tasks: 4,
  });
  svc.getContracts.mockResolvedValue({
    total_contracts: 9, total_value_signed: 450_000, total_value_executed: 200_000, signed_this_month: 2,
    executed_this_month: 1, expiring_soon: 3,
    by_status: [{ status: "draft", count: 2 }, { status: "signed", count: 5 }],
  });
});

/** Radix activa una pestana con `mousedown`, no con `click`. */
const openTab = (name: string) => fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });

describe("Analytics in English", () => {
  it("renders the header and the five tabs", async () => {
    renderPageWithI18n(<Analytics />, await english());

    expect(screen.getByRole("heading", { name: "Analytics" })).toBeInTheDocument();
    expect(screen.getByText(/Business dashboards with real data/)).toBeInTheDocument();
    for (const tab of ["Revenue", "Pipeline", "Projects", "Contracts", "Team"]) {
      expect(screen.getByRole("tab", { name: tab })).toBeInTheDocument();
    }
    expect(screen.queryByRole("tab", { name: "Ingresos" })).not.toBeInTheDocument();
  });

  it("revenue: KPIs, plurals, chart title and months", async () => {
    renderPageWithI18n(<Analytics />, await english());

    expect(await screen.findByText("Total invoiced")).toBeInTheDocument();
    expect(screen.getByText("$12.5K")).toBeInTheDocument();
    expect(screen.getByText("cumulative")).toBeInTheDocument();
    expect(screen.getByText("Total collected")).toBeInTheDocument();
    expect(screen.getByText("Receivable")).toBeInTheDocument();
    expect(screen.getByText("3 invoices")).toBeInTheDocument();
    expect(screen.getByText("Revenue — last 12 months")).toBeInTheDocument();
    expect(await screen.findByText("Apr 26")).toBeInTheDocument();
  });

  it("revenue: uses the singular for one overdue invoice", async () => {
    svc.getSummary.mockResolvedValue(summary(1));
    renderPageWithI18n(<Analytics />, await english());

    expect(await screen.findByText("1 invoice")).toBeInTheDocument();
  });

  it("revenue: explains the empty chart and a failed load", async () => {
    svc.getRevenue.mockResolvedValue({ series: [] });
    const instance = await english();
    const { unmount } = renderPageWithI18n(<Analytics />, instance);
    expect(await screen.findByText("No invoices recorded yet.")).toBeInTheDocument();
    unmount();

    svc.getSummary.mockRejectedValue(new Error("down"));
    renderPageWithI18n(<Analytics />, instance);
    expect(await screen.findByText("Error loading revenue data.")).toBeInTheDocument();
  });

  it("pipeline: KPIs, win rate and stages named from common", async () => {
    renderPageWithI18n(<Analytics />, await english());
    openTab("Pipeline");

    expect(await screen.findByText("Open opportunities")).toBeInTheDocument();
    expect(screen.getByText("Win rate (30d)")).toBeInTheDocument();
    expect(screen.getByText("12.5%")).toBeInTheDocument();
    expect(await screen.findByText("Won this month")).toBeInTheDocument();
    expect(screen.getByText("New leads (month)")).toBeInTheDocument();
    expect(screen.getByText("Opportunities by stage")).toBeInTheDocument();
    expect(await screen.findByText("New")).toBeInTheDocument();
    expect(screen.getByText("Negotiation")).toBeInTheDocument();
  });

  it("pipeline: explains an empty pipeline", async () => {
    svc.getPipeline.mockResolvedValue({ stages: [], total_open: 0, total_value: 0, won_rate_30d: 0, avg_deal_size: 0 });
    renderPageWithI18n(<Analytics />, await english());
    openTab("Pipeline");

    expect(await screen.findByText("No open opportunities right now.")).toBeInTheDocument();
  });

  it("team: KPIs, organization summary and employment types", async () => {
    renderPageWithI18n(<Analytics />, await english());
    openTab("Team");

    expect(await screen.findByText("Active employees")).toBeInTheDocument();
    expect(screen.getByText("On leave")).toBeInTheDocument();
    expect(screen.getByText("New hires (month)")).toBeInTheDocument();
    expect(screen.getByText("Organization structure")).toBeInTheDocument();
    expect(screen.getByText("Total headcount (active)")).toBeInTheDocument();
    expect(screen.getByText("No department assigned")).toBeInTheDocument();
    expect(screen.getByText("Former employees")).toBeInTheDocument();
    expect(await screen.findByText("Full-time")).toBeInTheDocument();
    expect(screen.getByText("Contractor")).toBeInTheDocument();
  });

  it("projects: KPIs, task health and statuses named from common", async () => {
    renderPageWithI18n(<Analytics />, await english());
    openTab("Projects");

    expect(await screen.findByText("Active projects")).toBeInTheDocument();
    expect(screen.getByText("Total active budget")).toBeInTheDocument();
    expect(screen.getByText("Task health (active projects)")).toBeInTheDocument();
    expect(screen.getByText("Completion rate")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("Projects by status")).toBeInTheDocument();
    expect(await screen.findByText("Active")).toBeInTheDocument();
    expect(screen.getByText("On hold")).toBeInTheDocument();
  });

  it("contracts: KPIs, committed value and statuses named from common", async () => {
    renderPageWithI18n(<Analytics />, await english());
    openTab("Contracts");

    expect(await screen.findByText("Total contracts")).toBeInTheDocument();
    expect(screen.getByText("Committed value")).toBeInTheDocument();
    expect(screen.getByText("Signed + executed value")).toBeInTheDocument();
    expect(screen.getByText("Expiring in 30 days")).toBeInTheDocument();
    expect(screen.getByText("Contracts by status")).toBeInTheDocument();
    expect((await screen.findAllByText("Draft")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Signed").length).toBeGreaterThan(0);
  });
});
