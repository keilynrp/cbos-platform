import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import { formatDate } from "@/i18n/format";
import HR from "@/pages/HR";
import {
  FORMATTED_CURRENCY, createPseudoInstance, notFromCatalogue, renderPageWithI18n, visibleStrings,
} from "@/test/i18n";

const svc = vi.hoisted(() => ({
  getAll: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(),
  getDepartments: vi.fn(), createDepartment: vi.fn(), deleteDepartment: vi.fn(),
}));
const toast = vi.hoisted(() => vi.fn());

vi.mock("@/services/hr", () => ({ hrService: svc }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

/** Datos del usuario (nombres, cargos, departamentos, notas): no son texto de la interfaz. */
const DATA = [
  "E-001", "E-002", "Ana Torres", "Luis Gómez", "Ingeniera", "Diseñador", "Ingeniería", "Diseño",
  "Equipo clave", "ana@sol.co", "555-0101", "Notas de Ana", "USD",
];
const FORMATTED_DATE = /^\d{1,2}\/\d{1,2}\/\d{2,4}$|^\d{1,2} \p{L}{3,4}\.? \d{4}$/u;
const COUNT = /^\d+$/;

const emp = (over: Record<string, unknown> = {}) => ({
  id: "e1", employee_number: "E-001", full_name: "Ana Torres", email: "ana@sol.co", status: "active",
  employment_type: "full_time", position: "Ingeniera", department_id: "d1", start_date: "2026-03-05",
  created_at: "", ...over,
});
const fullEmp = (over: Record<string, unknown> = {}) => ({
  ...emp(), workspace_id: "w1", phone: "555-0101", end_date: null, on_leave_since: null, terminated_at: null,
  salary: 3000, currency: "USD", notes: "Notas de Ana", updated_at: "", ...over,
});
const dept = (over: Record<string, unknown> = {}) => ({
  id: "d1", workspace_id: "w1", name: "Ingeniería", description: "Equipo clave", created_at: "", updated_at: "", ...over,
});

const renderPage = (instance = i18n) => renderPageWithI18n(<HR />, instance);
const openTab = (name: string | RegExp) => fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });
const select = async (name = "Ana Torres") => fireEvent.click(await screen.findByText(name));

beforeEach(() => {
  Object.values(svc).forEach((fn) => fn.mockReset());
  toast.mockReset();
  svc.getAll.mockResolvedValue([
    emp(),
    emp({ id: "e2", employee_number: "E-002", full_name: "Luis Gómez", status: "on_leave", employment_type: "part_time", position: "Diseñador", department_id: "d2" }),
  ]);
  svc.getDepartments.mockResolvedValue([dept(), dept({ id: "d2", name: "Diseño", description: null })]);
  svc.get.mockResolvedValue(fullEmp());
  svc.create.mockResolvedValue({});
  svc.update.mockResolvedValue({});
  svc.delete.mockResolvedValue(undefined);
  svc.createDepartment.mockResolvedValue({});
  svc.deleteDepartment.mockResolvedValue(undefined);
});

describe("HR, in Spanish", () => {
  it("renders the header, the KPIs and the table with translated status and type", async () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Equipo" })).toBeInTheDocument();
    expect(screen.getByText("Gestión de empleados y departamentos")).toBeInTheDocument();
    expect(await screen.findByText("Ana Torres")).toBeInTheDocument();
    for (const text of ["Total equipo", "Activos", "Bajas"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    for (const col of ["No.", "Nombre", "Cargo", "Departamento", "Tipo", "Estado"]) {
      expect(screen.getByRole("columnheader", { name: col })).toBeInTheDocument();
    }
    expect(screen.getByText("Activo", { selector: "div" })).toBeInTheDocument();
    expect(screen.getByText("De permiso", { selector: "div" })).toBeInTheDocument();
    expect(screen.getByText("Tiempo completo")).toBeInTheDocument();
    // Antes: "Medio tiempo", distinto de "Tiempo parcial" en Analytics.
    expect(screen.getByText("Tiempo parcial")).toBeInTheDocument();
  });

  it("falls back to the raw value for an employment type the catalogue does not know", async () => {
    svc.getAll.mockResolvedValue([emp({ employment_type: "freelance_x" })]);
    renderPage();

    expect(await screen.findByText("freelance_x")).toBeInTheDocument();
  });

  it("explains an empty team and offers to register the first employee", async () => {
    svc.getAll.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText("Sin empleados registrados")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Registrar primer empleado" }));
    expect(await screen.findByText("Nuevo empleado", { selector: "h2" })).toBeInTheDocument();
  });

  it("registers an employee and confirms", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Nuevo empleado/ }));

    expect(await screen.findByText("Nombre completo *")).toBeInTheDocument();
    for (const text of ["Email", "Teléfono", "Cargo", "Tipo de empleo", "Fecha de inicio", "Salario", "Moneda", "Notas"]) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
    fireEvent.change(screen.getByPlaceholderText("Ej. Ana Torres"), { target: { value: "Nueva" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Empleado registrado" }));
  });

  it("shows the employee detail with the start date formatted and the labels translated", async () => {
    renderPage();
    await select();

    expect(await screen.findByText("Ingreso")).toBeInTheDocument();
    expect(screen.getByText("Contacto")).toBeInTheDocument();
    expect(screen.getByText("Notas de Ana")).toBeInTheDocument();
    // Antes: la fecha ISO cruda "2026-03-05".
    expect(screen.queryByText("2026-03-05")).not.toBeInTheDocument();
    expect(screen.getAllByText(formatDate("2026-03-05", "es")).length).toBeGreaterThan(0);
  });

  it("puts an active employee on leave and confirms", async () => {
    renderPage();
    await select();
    fireEvent.click(await screen.findByRole("button", { name: /Poner en permiso/ }));

    await waitFor(() => expect(svc.update).toHaveBeenCalledWith("e1", { status: "on_leave" }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Estado actualizado" }));
    expect(screen.getByRole("button", { name: /Dar de baja/ })).toBeInTheDocument();
  });

  it("offers to reinstate an employee on leave", async () => {
    svc.get.mockResolvedValue(fullEmp({ status: "on_leave" }));
    renderPage();
    await select();

    expect(await screen.findByRole("button", { name: /Reincorporar/ })).toBeInTheDocument();
  });

  it("states when a terminated employee left and offers no actions", async () => {
    svc.get.mockResolvedValue(fullEmp({ status: "terminated", terminated_at: "2026-05-01T00:00:00Z" }));
    renderPage();
    await select();

    expect(await screen.findByText(/^Dado de baja: /)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Poner en permiso|Reincorporar/ })).not.toBeInTheDocument();
  });

  it("falls back to the translated message when a transition is refused without a known code", async () => {
    svc.update.mockRejectedValue(new Error(""));
    renderPage();
    await select();
    fireEvent.click(await screen.findByRole("button", { name: /Poner en permiso/ }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith({ title: "Transición no permitida", variant: "destructive" }),
    );
  });

  it("deletes an employee from the row menu", async () => {
    renderPage();
    const row = (await screen.findByText("Ana Torres")).closest("tr")!;
    fireEvent.pointerDown(within(row).getByRole("button"), { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Eliminar" }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Empleado eliminado" }));
  });

  it("lists the departments with an agreeing employee count", async () => {
    renderPage();
    openTab("Departamentos");

    expect(await screen.findByText("Ingeniería")).toBeInTheDocument();
    // Antes: "empleado{s}" pegado a mano: uno solo en cada departamento.
    expect(screen.getAllByText("1 empleado")).toHaveLength(2);
  });

  it("pluralises the department count", async () => {
    svc.getAll.mockResolvedValue([emp(), emp({ id: "e3", employee_number: "E-003" })]);
    renderPage();
    openTab("Departamentos");

    expect(await screen.findByText("2 empleados")).toBeInTheDocument();
    expect(screen.getByText("0 empleados")).toBeInTheDocument();
  });

  it("explains an empty department list", async () => {
    svc.getDepartments.mockResolvedValue([]);
    renderPage();
    openTab("Departamentos");

    expect(await screen.findByText("Sin departamentos")).toBeInTheDocument();
  });

  it("creates a department and confirms", async () => {
    renderPage();
    openTab("Departamentos");
    fireEvent.click(await screen.findByRole("button", { name: /Nuevo departamento/ }));

    expect(await screen.findByText("Nombre *")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Ej. Ingeniería"), { target: { value: "Ventas" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear" }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Departamento creado" }));
  });
});

describe("HR, in a second language", () => {
  const strings = (root: HTMLElement) =>
    notFromCatalogue(visibleStrings(root), DATA, [FORMATTED_CURRENCY, FORMATTED_DATE, COUNT]);

  it("has no string left outside the catalogue in the employee list", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPage(english);
    await screen.findByText("Ana Torres");

    expect(strings(container)).toEqual([]);
    expect(screen.getByText("EN(Tiempo parcial)")).toBeInTheDocument();
  });

  it("has no string left outside the catalogue when the team is empty", async () => {
    svc.getAll.mockResolvedValue([]);
    const english = await createPseudoInstance("en");
    const { container } = renderPage(english);
    await screen.findByText("EN(Sin empleados registrados)");

    expect(strings(container)).toEqual([]);
  });

  it("has no string left outside the catalogue in the detail of an active and a terminated employee", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPage(english);
    await select();
    await screen.findByText("EN(Ingreso)");
    expect(strings(container)).toEqual([]);

    svc.get.mockResolvedValue(fullEmp({ id: "e2", status: "terminated", terminated_at: "2026-05-01T00:00:00Z" }));
    await select("Luis Gómez");
    await screen.findByText(/^EN\(Dado de baja: /);
    expect(strings(container)).toEqual([]);
  });

  it("has no string left outside the catalogue in the departments tab", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPage(english);
    openTab("EN(Departamentos)");
    await screen.findByText("Ingeniería");

    expect(strings(container)).toEqual([]);
  });

  it("has no string left outside the catalogue in the employee and department dialogs", async () => {
    const english = await createPseudoInstance("en");
    renderPage(english);

    fireEvent.click(screen.getByRole("button", { name: /EN\(Nuevo empleado\)/ }));
    expect(strings(await screen.findByRole("dialog"))).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "EN(Cancelar)" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    openTab("EN(Departamentos)");
    fireEvent.click(await screen.findByRole("button", { name: /EN\(Nuevo departamento\)/ }));
    expect(strings(await screen.findByRole("dialog"))).toEqual([]);
  });
});
