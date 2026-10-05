import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import i18next, { type i18n as I18n } from "i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildI18nOptions, resources } from "@/i18n";
import { formatDate } from "@/i18n/format";
import HR from "@/pages/HR";
import { renderPageWithI18n } from "@/test/i18n";

/**
 * `hr` en el ingles *real* (tarea 12 del plan de i18n): la lista de empleados, el
 * detalle, los departamentos y los dialogos de alta con el catalogo `en` que se envia.
 * Los estados y los tipos de empleo salen del `en` de `common`.
 */

const svc = vi.hoisted(() => ({
  getAll: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(),
  getDepartments: vi.fn(), createDepartment: vi.fn(), deleteDepartment: vi.fn(),
}));
const toast = vi.hoisted(() => vi.fn());

vi.mock("@/services/hr", () => ({ hrService: svc }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

async function english(): Promise<I18n> {
  const instance = i18next.createInstance();
  await instance.init(buildI18nOptions(resources, "en"));
  return instance;
}

const emp = (over: Record<string, unknown> = {}) => ({
  id: "e1", employee_number: "E-001", full_name: "Ana Torres", email: "ana@sol.co", status: "active",
  employment_type: "full_time", position: "Engineer", department_id: "d1", start_date: "2026-03-05",
  created_at: "", ...over,
});
const fullEmp = (over: Record<string, unknown> = {}) => ({
  ...emp(), workspace_id: "w1", phone: "555-0101", end_date: null, on_leave_since: null, terminated_at: null,
  salary: 3000, currency: "USD", notes: "Ana's notes", updated_at: "", ...over,
});
const dept = (over: Record<string, unknown> = {}) => ({
  id: "d1", workspace_id: "w1", name: "Engineering", description: "Core team", created_at: "", updated_at: "", ...over,
});

const renderPage = (instance: I18n) => renderPageWithI18n(<HR />, instance);
const openTab = (name: string) => fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });
const select = async (name = "Ana Torres") => fireEvent.click(await screen.findByText(name));

beforeEach(() => {
  Object.values(svc).forEach((fn) => fn.mockReset());
  toast.mockReset();
  svc.getAll.mockResolvedValue([
    emp(),
    emp({ id: "e2", employee_number: "E-002", full_name: "Luis Gomez", status: "on_leave", employment_type: "part_time", position: "Designer", department_id: "d2" }),
  ]);
  svc.getDepartments.mockResolvedValue([dept(), dept({ id: "d2", name: "Design", description: null })]);
  svc.get.mockResolvedValue(fullEmp());
  svc.create.mockResolvedValue({});
  svc.update.mockResolvedValue({});
  svc.delete.mockResolvedValue(undefined);
  svc.createDepartment.mockResolvedValue({});
  svc.deleteDepartment.mockResolvedValue(undefined);
});

describe("HR in English", () => {
  it("renders the header, the KPIs and the table with English status and type", async () => {
    renderPage(await english());

    expect(screen.getByRole("heading", { name: "Team" })).toBeInTheDocument();
    expect(screen.getByText("Employee and department management")).toBeInTheDocument();
    expect(await screen.findByText("Ana Torres")).toBeInTheDocument();
    for (const text of ["Total team", "Terminated"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    // «Active» es la etiqueta del KPI y el estado de Ana: dos elementos.
    expect(screen.getAllByText("Active")).toHaveLength(2);
    for (const col of ["#", "Name", "Position", "Department", "Type", "Status"]) {
      expect(screen.getByRole("columnheader", { name: col })).toBeInTheDocument();
    }
    expect(screen.getByText("Active", { selector: "div" })).toBeInTheDocument();
    expect(screen.getByText("On leave", { selector: "div" })).toBeInTheDocument();
    expect(screen.getByText("Full-time")).toBeInTheDocument();
    expect(screen.getByText("Part-time")).toBeInTheDocument();
    expect(screen.queryByText("Tiempo completo")).not.toBeInTheDocument();
  });

  it("explains an empty team and offers to register the first employee", async () => {
    svc.getAll.mockResolvedValue([]);
    renderPage(await english());

    expect(await screen.findByText("No employees recorded")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Register the first employee" }));
    expect(await screen.findByText("New employee", { selector: "h2" })).toBeInTheDocument();
  });

  it("registers an employee and confirms", async () => {
    renderPage(await english());
    fireEvent.click(screen.getByRole("button", { name: /New employee/ }));

    expect(await screen.findByText("Full name *")).toBeInTheDocument();
    for (const text of ["Email", "Phone", "Position", "Employment type", "Start date", "Salary", "Currency", "Notes"]) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
    expect(screen.getByPlaceholderText("email@company.com")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("E.g. Ana Torres"), { target: { value: "New" } });
    fireEvent.click(screen.getByRole("button", { name: "Register" }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Employee registered" }));
  });

  it("shows the employee detail with the start date formatted for English", async () => {
    renderPage(await english());
    await select();

    expect(await screen.findByText("Joined")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
    expect(screen.getByText("Ana's notes")).toBeInTheDocument();
    expect(screen.queryByText("2026-03-05")).not.toBeInTheDocument();
    expect(screen.getAllByText(formatDate("2026-03-05", "en")).length).toBeGreaterThan(0);
  });

  it("puts an active employee on leave and confirms", async () => {
    renderPage(await english());
    await select();
    fireEvent.click(await screen.findByRole("button", { name: /Put on leave/ }));

    await waitFor(() => expect(svc.update).toHaveBeenCalledWith("e1", { status: "on_leave" }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Status updated" }));
    expect(screen.getByRole("button", { name: /Terminate/ })).toBeInTheDocument();
  });

  it("offers to reinstate an employee on leave", async () => {
    svc.get.mockResolvedValue(fullEmp({ status: "on_leave" }));
    renderPage(await english());
    await select();

    expect(await screen.findByRole("button", { name: /Reinstate/ })).toBeInTheDocument();
  });

  it("states when a terminated employee left and offers no actions", async () => {
    svc.get.mockResolvedValue(fullEmp({ status: "terminated", terminated_at: "2026-05-01T00:00:00Z" }));
    renderPage(await english());
    await select();

    expect(await screen.findByText(/^Terminated: /)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Put on leave|Reinstate/ })).not.toBeInTheDocument();
  });

  it("falls back to the English message when a transition is refused without a known code", async () => {
    svc.update.mockRejectedValue(new Error(""));
    renderPage(await english());
    await select();
    fireEvent.click(await screen.findByRole("button", { name: /Put on leave/ }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith({ title: "Transition not allowed", variant: "destructive" }),
    );
  });

  it("deletes an employee from the row menu", async () => {
    renderPage(await english());
    const row = (await screen.findByText("Ana Torres")).closest("tr")!;
    fireEvent.pointerDown(within(row).getByRole("button"), { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Employee deleted" }));
  });

  it("lists the departments with an agreeing employee count", async () => {
    renderPage(await english());
    openTab("Departments");

    expect(await screen.findByText("Engineering")).toBeInTheDocument();
    expect(screen.getAllByText("1 employee")).toHaveLength(2);
  });

  it("pluralises the department count", async () => {
    svc.getAll.mockResolvedValue([emp(), emp({ id: "e3", employee_number: "E-003" })]);
    renderPage(await english());
    openTab("Departments");

    expect(await screen.findByText("2 employees")).toBeInTheDocument();
    expect(screen.getByText("0 employees")).toBeInTheDocument();
  });

  it("explains an empty department list", async () => {
    svc.getDepartments.mockResolvedValue([]);
    renderPage(await english());
    openTab("Departments");

    expect(await screen.findByText("No departments")).toBeInTheDocument();
  });

  it("creates a department and confirms", async () => {
    renderPage(await english());
    openTab("Departments");
    fireEvent.click(await screen.findByRole("button", { name: /New department/ }));

    expect(await screen.findByText("Name *")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("E.g. Engineering"), { target: { value: "Sales" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Department created" }));
  });
});
