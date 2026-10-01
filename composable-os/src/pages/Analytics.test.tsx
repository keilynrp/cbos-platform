import { fireEvent, screen, waitFor } from "@testing-library/react";
import { cloneElement, type ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import Analytics from "@/pages/Analytics";
import {
  FORMATTED_CURRENCY, createPseudoInstance, notFromCatalogue, renderPageWithI18n, visibleStrings,
} from "@/test/i18n";

const svc = vi.hoisted(() => ({
  getSummary: vi.fn(),
  getRevenue: vi.fn(),
  getPipeline: vi.fn(),
  getHR: vi.fn(),
  getProjects: vi.fn(),
  getContracts: vi.fn(),
}));

vi.mock("@/services/analytics", () => ({ analyticsService: svc }));

// En jsdom no hay layout y `ResponsiveContainer` no dibuja nada: con un tamano
// fijo los graficos pintan sus ejes y leyendas, que es donde estan las etapas, los
// estados y los tipos de empleo que hay que comprobar.
vi.mock("recharts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("recharts")>()),
  ResponsiveContainer: ({ children, height }: { children: ReactElement; height?: number }) =>
    cloneElement(children, { width: 800, height: height ?? 300 }),
}));

/** Rotulos de mes ya formateados por Intl (`abr 26`, `Apr 26`). */
const FORMATTED_MONTH = /^[A-Za-zñÑ]{3,4}\.?\s\d{2}$/;

const summary = (over: { overdueCount?: number } = {}) => ({
  revenue: { total_invoiced: 12_500, total_paid: 8_000, total_outstanding: 4_500, overdue_amount: 1_200, overdue_count: over.overdueCount ?? 3 },
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
const openTab = (name: string | RegExp) => fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });

describe("Analytics, in Spanish", () => {
  it("renders the header and the five tabs", () => {
    renderPageWithI18n(<Analytics />, i18n);

    expect(screen.getByRole("heading", { name: "Analítica" })).toBeInTheDocument();
    expect(screen.getByText(/Dashboards de negocio con datos reales/)).toBeInTheDocument();
    for (const tab of ["Ingresos", "Pipeline", "Proyectos", "Contratos", "Equipo"]) {
      expect(screen.getByRole("tab", { name: tab })).toBeInTheDocument();
    }
  });

  describe("revenue", () => {
    it("shows the KPI cards with compact amounts", async () => {
      renderPageWithI18n(<Analytics />, i18n);

      expect(await screen.findByText("Total facturado")).toBeInTheDocument();
      expect(screen.getByText(/^USD\s12\.5\sk$/)).toBeInTheDocument();
      expect(screen.getByText("acumulado")).toBeInTheDocument();
      expect(screen.getByText("Total cobrado")).toBeInTheDocument();
      expect(screen.getByText("pagos recibidos")).toBeInTheDocument();
      expect(screen.getByText("Por cobrar")).toBeInTheDocument();
      expect(screen.getByText("pendiente")).toBeInTheDocument();
    });

    it("agrees the overdue count with its number", async () => {
      renderPageWithI18n(<Analytics />, i18n);
      expect(await screen.findByText("3 facturas")).toBeInTheDocument();
    });

    it("uses the singular for one overdue invoice", async () => {
      svc.getSummary.mockResolvedValue(summary({ overdueCount: 1 }));
      renderPageWithI18n(<Analytics />, i18n);

      expect(await screen.findByText("1 factura")).toBeInTheDocument();
    });

    it("titles the chart with the number of months it asks for and labels the axis in Spanish", async () => {
      renderPageWithI18n(<Analytics />, i18n);

      expect(await screen.findByText("Ingresos — últimos 12 meses")).toBeInTheDocument();
      expect(svc.getRevenue).toHaveBeenCalledWith(12);
      // Antes los meses salian de un array en ingles: "Apr '26".
      expect(await screen.findByText("abr 26")).toBeInTheDocument();
      expect(screen.getByText("may 26")).toBeInTheDocument();
    });

    it("explains the empty chart", async () => {
      svc.getRevenue.mockResolvedValue({ series: [] });
      renderPageWithI18n(<Analytics />, i18n);

      expect(await screen.findByText("Sin facturas registradas aún.")).toBeInTheDocument();
    });

    it("explains a failed load", async () => {
      svc.getSummary.mockRejectedValue(new Error("down"));
      renderPageWithI18n(<Analytics />, i18n);

      expect(await screen.findByText("Error cargando datos de ingresos.")).toBeInTheDocument();
    });
  });

  describe("pipeline", () => {
    it("shows the KPIs, the win rate as a percentage and the monthly cards", async () => {
      renderPageWithI18n(<Analytics />, i18n);
      openTab("Pipeline");

      expect(await screen.findByText("Oportunidades abiertas")).toBeInTheDocument();
      expect(screen.getByText("Tasa de cierre (30d)")).toBeInTheDocument();
      expect(screen.getByText("12.5%")).toBeInTheDocument();
      expect(await screen.findByText("Ganadas este mes")).toBeInTheDocument();
      expect(screen.getByText("Leads nuevos (mes)")).toBeInTheDocument();
    });

    it("names the stages in Spanish on the chart axis", async () => {
      renderPageWithI18n(<Analytics />, i18n);
      openTab("Pipeline");

      expect(await screen.findByText("Oportunidades por etapa")).toBeInTheDocument();
      // Antes: "New" y "Negotiation" (la etapa cruda, con la inicial en mayuscula).
      expect(await screen.findByText("Nueva")).toBeInTheDocument();
      expect(screen.getByText("Negociación")).toBeInTheDocument();
    });

    it("explains an empty pipeline and a failed load", async () => {
      svc.getPipeline.mockResolvedValue({ stages: [], total_open: 0, total_value: 0, won_rate_30d: 0, avg_deal_size: 0 });
      renderPageWithI18n(<Analytics />, i18n);
      openTab("Pipeline");
      expect(await screen.findByText("Sin oportunidades abiertas actualmente.")).toBeInTheDocument();
    });

    it("explains a failed load", async () => {
      svc.getPipeline.mockRejectedValue(new Error("down"));
      renderPageWithI18n(<Analytics />, i18n);
      openTab("Pipeline");

      expect(await screen.findByText("Error cargando datos del pipeline.")).toBeInTheDocument();
    });
  });

  describe("team", () => {
    it("shows the KPIs and the organisation summary", async () => {
      renderPageWithI18n(<Analytics />, i18n);
      openTab("Equipo");

      expect(await screen.findByText("Empleados activos")).toBeInTheDocument();
      expect(screen.getByText("En permiso")).toBeInTheDocument();
      expect(screen.getByText("Nuevas contrataciones (mes)")).toBeInTheDocument();
      expect(screen.getByText("Estructura organizacional")).toBeInTheDocument();
      expect(screen.getByText("Departamentos")).toBeInTheDocument();
      expect(screen.getByText("Headcount total (activos)")).toBeInTheDocument();
      expect(screen.getByText("Sin departamento asignado")).toBeInTheDocument();
      expect(screen.getByText("Ex-empleados")).toBeInTheDocument();
    });

    it("names the employment types in Spanish in the chart legend", async () => {
      renderPageWithI18n(<Analytics />, i18n);
      openTab("Equipo");

      expect(await screen.findByText("Tipo de empleo (activos)")).toBeInTheDocument();
      expect(await screen.findByText("Tiempo completo")).toBeInTheDocument();
      expect(screen.getByText("Contratista")).toBeInTheDocument();
    });

    it("falls back to the raw value for an employment type the catalogue does not know", async () => {
      svc.getHR.mockResolvedValue({
        active_count: 1, on_leave_count: 0, new_hires_this_month: 0, terminations_this_month: 0,
        by_employment_type: [{ employment_type: "freelance_x", count: 1 }],
        department_count: 1, unassigned_employees: 0, terminated_count: 0,
      });
      renderPageWithI18n(<Analytics />, i18n);
      openTab("Equipo");

      expect(await screen.findByText("freelance_x")).toBeInTheDocument();
    });

    it("explains an empty chart and a failed load", async () => {
      svc.getHR.mockResolvedValue({
        active_count: 0, on_leave_count: 0, new_hires_this_month: 0, terminations_this_month: 0,
        by_employment_type: [], department_count: 0, unassigned_employees: 0, terminated_count: 0,
      });
      renderPageWithI18n(<Analytics />, i18n);
      openTab("Equipo");
      expect(await screen.findByText("Sin empleados activos registrados.")).toBeInTheDocument();
    });

    it("explains a failed load", async () => {
      svc.getHR.mockRejectedValue(new Error("down"));
      renderPageWithI18n(<Analytics />, i18n);
      openTab("Equipo");

      expect(await screen.findByText("Error cargando datos de equipo.")).toBeInTheDocument();
    });
  });

  describe("projects", () => {
    it("shows the KPIs with the budget compact and the completion rate as a percentage", async () => {
      renderPageWithI18n(<Analytics />, i18n);
      openTab("Proyectos");

      expect(await screen.findByText("Proyectos activos")).toBeInTheDocument();
      expect(screen.getByText(/^USD\s85\sk$/)).toBeInTheDocument();
      expect(screen.getByText("Budget activo total")).toBeInTheDocument();
      expect(screen.getByText("Salud de tareas (proyectos activos)")).toBeInTheDocument();
      expect(screen.getByText("Tasa de completitud")).toBeInTheDocument();
      expect(screen.getByText("75%")).toBeInTheDocument();
      expect(screen.getByText("Tareas totales (activos)")).toBeInTheDocument();
    });

    it("names the project statuses in Spanish on the chart axis", async () => {
      renderPageWithI18n(<Analytics />, i18n);
      openTab("Proyectos");

      expect(await screen.findByText("Proyectos por estado")).toBeInTheDocument();
      expect(await screen.findByText("Activo")).toBeInTheDocument();
      expect(screen.getByText("En pausa")).toBeInTheDocument();
    });

    it("explains an empty chart and a failed load", async () => {
      svc.getProjects.mockResolvedValue({
        active_count: 0, total_budget_active: 0, completed_this_month: 0, cancelled_this_month: 0, by_status: [],
        task_completion_rate: 0, total_tasks: 0, done_tasks: 0, overdue_tasks: 0,
      });
      renderPageWithI18n(<Analytics />, i18n);
      openTab("Proyectos");
      expect(await screen.findByText("Sin proyectos registrados aún.")).toBeInTheDocument();
    });

    it("explains a failed load", async () => {
      svc.getProjects.mockRejectedValue(new Error("down"));
      renderPageWithI18n(<Analytics />, i18n);
      openTab("Proyectos");

      expect(await screen.findByText("Error cargando datos de proyectos.")).toBeInTheDocument();
    });
  });

  describe("contracts", () => {
    it("shows the KPIs and the committed-value summary", async () => {
      renderPageWithI18n(<Analytics />, i18n);
      openTab("Contratos");

      expect(await screen.findByText("Total contratos")).toBeInTheDocument();
      expect(screen.getByText("Valor comprometido")).toBeInTheDocument();
      expect(screen.getByText("Valor firmado + ejecutado")).toBeInTheDocument();
      expect(screen.getByText("Por vencer en 30 días")).toBeInTheDocument();
      expect(screen.getAllByText(/^USD\s450\sk$/).length).toBeGreaterThan(0);
    });

    it("names the contract statuses in Spanish on the chart axis", async () => {
      renderPageWithI18n(<Analytics />, i18n);
      openTab("Contratos");

      expect(await screen.findByText("Contratos por estado")).toBeInTheDocument();
      // El estado sale en el eje y en la leyenda: basta con que este, y en espanol.
      expect((await screen.findAllByText("Borrador")).length).toBeGreaterThan(0);
      expect(screen.getAllByText("Firmado").length).toBeGreaterThan(0);
    });

    it("explains an empty chart and a failed load", async () => {
      svc.getContracts.mockResolvedValue({
        total_contracts: 0, total_value_signed: 0, total_value_executed: 0, signed_this_month: 0,
        executed_this_month: 0, expiring_soon: 0, by_status: [],
      });
      renderPageWithI18n(<Analytics />, i18n);
      openTab("Contratos");
      expect(await screen.findByText("Sin contratos registrados aún.")).toBeInTheDocument();
    });

    it("explains a failed load", async () => {
      svc.getContracts.mockRejectedValue(new Error("down"));
      renderPageWithI18n(<Analytics />, i18n);
      openTab("Contratos");

      expect(await screen.findByText("Error cargando datos de contratos.")).toBeInTheDocument();
    });
  });
});

/**
 * La prueba de que la pagina esta migrada entera, en cada pestana, incluidos los
 * ejes y leyendas de los graficos. Lo que formatea Intl (importes, porcentajes,
 * rotulos de mes) no cuenta.
 */
describe("Analytics, in a second language", () => {
  const strings = (root: HTMLElement) =>
    notFromCatalogue(visibleStrings(root), [], [FORMATTED_CURRENCY, FORMATTED_MONTH]);

  it("has no string left outside the catalogue on the revenue tab, chart included", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPageWithI18n(<Analytics />, english);
    await screen.findByText("EN(Total facturado)");
    await screen.findByText("Apr 26");

    expect(strings(container)).toEqual([]);
  });

  it("has no string left outside the catalogue on the pipeline tab, stages included", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPageWithI18n(<Analytics />, english);
    openTab("EN(Pipeline)");
    await screen.findAllByText("EN(Nueva)");

    expect(strings(container)).toEqual([]);
  });

  it("has no string left outside the catalogue on the team tab, employment types included", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPageWithI18n(<Analytics />, english);
    openTab("EN(Equipo)");
    await screen.findByText("EN(Tiempo completo)");

    expect(strings(container)).toEqual([]);
  });

  it("has no string left outside the catalogue on the projects and contracts tabs", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPageWithI18n(<Analytics />, english);

    openTab("EN(Proyectos)");
    await screen.findByText("EN(Activo)");
    expect(strings(container)).toEqual([]);

    openTab("EN(Contratos)");
    await screen.findAllByText("EN(Borrador)");
    expect(strings(container)).toEqual([]);
  });

  it("formats the amounts and the percentage with the second language's conventions", async () => {
    const english = await createPseudoInstance("en");
    renderPageWithI18n(<Analytics />, english);

    // `$12.5K` lo pone Intl segun el locale, no el catalogo.
    expect(await screen.findByText("$12.5K")).toBeInTheDocument();
    openTab("EN(Pipeline)");
    await waitFor(() => expect(screen.getByText("12.5%")).toBeInTheDocument());
  });
});
