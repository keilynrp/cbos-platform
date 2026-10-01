import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import { formatDate } from "@/i18n/format";
import { ApiError } from "@/lib/api";
import Projects from "@/pages/Projects";
import {
  FORMATTED_CURRENCY, createPseudoInstance, notFromCatalogue, renderPageWithI18n, visibleStrings,
} from "@/test/i18n";

const svc = vi.hoisted(() => ({
  getAll: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(),
  addTask: vi.fn(), updateTask: vi.fn(), deleteTask: vi.fn(),
}));
const toast = vi.hoisted(() => vi.fn());

vi.mock("@/services/projects", () => ({ projectsService: svc }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

/** Datos del usuario (numeros, titulos, notas): no son texto de la interfaz. */
const DATA = ["PRJ-001", "PRJ-002", "Tienda Sol", "Rediseño web", "Notas del proyecto", "Alcance inicial", "Diseñar logo", "USD"];
const FORMATTED_DATE = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
const COUNT = /^\d+$/;

const item = (over: Record<string, unknown> = {}) => ({
  id: "p1", project_number: "PRJ-001", title: "Tienda Sol", status: "planning", budget: 5000, currency: "USD",
  start_date: "2026-03-05", end_date: null, organization_id: null, contact_id: null, contract_id: null,
  created_at: "2026-01-01T00:00:00Z", ...over,
});
const task = (over: Record<string, unknown> = {}) => ({
  id: "t1", project_id: "p1", task_order: 1, title: "Diseñar logo", description: null, status: "todo",
  due_date: "2026-04-10", assignee_id: null, created_at: "", updated_at: "", ...over,
});
const full = (over: Record<string, unknown> = {}) => ({
  ...item(), workspace_id: "w1", description: "Alcance inicial", activated_at: null, completed_at: null,
  cancelled_at: null, notes: "Notas del proyecto", sales_order_id: null, owner_id: null, tasks: [task()],
  updated_at: "", ...over,
});

const renderPage = (instance = i18n) => renderPageWithI18n(<Projects />, instance);
const select = async (title = "Tienda Sol") => fireEvent.click(await screen.findByText(title));

beforeEach(() => {
  Object.values(svc).forEach((fn) => fn.mockReset());
  toast.mockReset();
  svc.getAll.mockResolvedValue([
    item(),
    item({ id: "p2", project_number: "PRJ-002", title: "Rediseño web", status: "active", budget: 1000 }),
  ]);
  svc.get.mockResolvedValue(full());
  svc.create.mockResolvedValue(full());
  svc.update.mockResolvedValue(full());
  svc.delete.mockResolvedValue(undefined);
  svc.addTask.mockResolvedValue({});
  svc.updateTask.mockResolvedValue({});
  svc.deleteTask.mockResolvedValue(undefined);
});

describe("Projects, in Spanish", () => {
  it("renders the header, the KPIs and the table with translated statuses and dates", async () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Proyectos" })).toBeInTheDocument();
    expect(screen.getByText("Gestión del ciclo de vida de proyectos")).toBeInTheDocument();
    expect(await screen.findByText("Tienda Sol")).toBeInTheDocument();
    for (const text of ["Total proyectos", "Activos", "Completados", "Presupuesto total", "Lista de proyectos"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    for (const col of ["Número", "Título", "Estado", "Presupuesto", "Inicio", "Fin"]) {
      expect(screen.getByRole("columnheader", { name: col })).toBeInTheDocument();
    }
    expect(screen.getByText("Planificación")).toBeInTheDocument();
    expect(screen.getByText("Activo", { selector: "div" })).toBeInTheDocument();
    // Antes: la fecha ISO cruda "2026-03-05".
    expect(screen.queryByText("2026-03-05")).not.toBeInTheDocument();
    expect(screen.getAllByText(formatDate("2026-03-05", "es"))).toHaveLength(2);
  });

  it("explains an empty list and offers to create the first project", async () => {
    svc.getAll.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText("Sin proyectos aún")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Crear primer proyecto" }));
    expect(await screen.findByText("Nuevo proyecto", { selector: "h2" })).toBeInTheDocument();
  });

  it("creates a project and confirms with a toast", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Nuevo proyecto/ }));

    expect(await screen.findByText("Título *")).toBeInTheDocument();
    for (const text of ["Descripción", "Presupuesto", "Moneda", "Fecha inicio", "Fecha fin", "Notas"]) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
    const submit = screen.getByRole("button", { name: "Crear proyecto" });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("Nombre del proyecto"), { target: { value: "Nuevo" } });
    fireEvent.click(submit);

    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Proyecto creado" }));
  });

  it("reports a failed creation with a translated title", async () => {
    svc.create.mockRejectedValue(new ApiError("Boom", "NOPE_UNKNOWN", {}, 500));
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Nuevo proyecto/ }));
    fireEvent.change(await screen.findByPlaceholderText("Nombre del proyecto"), { target: { value: "Nuevo" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear proyecto" }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Error al crear proyecto", variant: "destructive" })),
    );
  });

  it("shows the detail with the period as formatted dates, the task count and the task status", async () => {
    renderPage();
    await select();

    expect(await screen.findByText("Tareas (1)")).toBeInTheDocument();
    expect(screen.getByText("Período")).toBeInTheDocument();
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(screen.getByText("Diseñar logo")).toBeInTheDocument();
    expect(screen.getByText("Notas del proyecto")).toBeInTheDocument();
    expect(screen.queryByText(/2026-03-05/)).not.toBeInTheDocument();
    expect(screen.queryByText("2026-04-10")).not.toBeInTheDocument();
  });

  it("offers Activate on a planning project and confirms the transition", async () => {
    renderPage();
    await select();
    fireEvent.click(await screen.findByRole("button", { name: /Activar/ }));

    await waitFor(() => expect(svc.update).toHaveBeenCalledWith("p1", { status: "active" }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Estado actualizado" }));
  });

  it.each([
    ["active", ["Pausar", "Completar", "Cancelar"]],
    ["on_hold", ["Reanudar", "Cancelar"]],
  ])("labels the actions of a %s project", async (status, labels) => {
    svc.get.mockResolvedValue(full({ status }));
    renderPage();
    await select();

    for (const label of labels) {
      expect(await screen.findByRole("button", { name: new RegExp(label) })).toBeInTheDocument();
    }
  });

  it("falls back to the translated message when a transition is refused without a known code", async () => {
    svc.update.mockRejectedValue(new Error(""));
    renderPage();
    await select();
    fireEvent.click(await screen.findByRole("button", { name: /Activar/ }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith({ title: "Transición no permitida", variant: "destructive" }),
    );
  });

  it("has no actions on a completed project", async () => {
    svc.get.mockResolvedValue(full({ status: "completed" }));
    renderPage();
    await select();

    expect(await screen.findByText("Tareas (1)")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Activar|Pausar|Completar/ })).not.toBeInTheDocument();
  });

  it("explains a project without tasks", async () => {
    svc.get.mockResolvedValue(full({ tasks: [] }));
    renderPage();
    await select();

    expect(await screen.findByText("Sin tareas")).toBeInTheDocument();
  });

  it("adds a task and confirms", async () => {
    renderPage();
    await select();
    fireEvent.click(await screen.findByRole("button", { name: /Añadir/ }));

    expect(await screen.findByText("Nueva tarea")).toBeInTheDocument();
    expect(screen.getByText("Fecha límite")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Descripción de la tarea"), { target: { value: "Otra" } });
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Añadir" }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Tarea añadida" }));
  });

  it("deletes a planning project from the row menu", async () => {
    renderPage();
    const row = (await screen.findByText("Tienda Sol")).closest("tr")!;
    fireEvent.pointerDown(within(row).getByRole("button"), { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Eliminar" }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Proyecto eliminado" }));
  });
});

describe("Projects, in a second language", () => {
  const strings = (root: HTMLElement) =>
    notFromCatalogue(visibleStrings(root), DATA, [FORMATTED_CURRENCY, FORMATTED_DATE, COUNT]);

  it("has no string left outside the catalogue in the list", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPage(english);
    await screen.findByText("Tienda Sol");

    expect(strings(container)).toEqual([]);
    expect(screen.getByText("EN(Planificación)")).toBeInTheDocument();
  });

  it("has no string left outside the catalogue in the empty state", async () => {
    svc.getAll.mockResolvedValue([]);
    const english = await createPseudoInstance("en");
    const { container } = renderPage(english);
    await screen.findByText("EN(Sin proyectos aún)");

    expect(strings(container)).toEqual([]);
  });

  it("has no string left outside the catalogue in the detail panel", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPage(english);
    await select();
    await screen.findByText("EN(Período)");

    expect(strings(container)).toEqual([]);
    expect(screen.getByText("EN(Pendiente)")).toBeInTheDocument();
  });

  it("has no string left outside the catalogue in the detail of an active project without tasks", async () => {
    svc.get.mockResolvedValue(full({ status: "active", tasks: [], start_date: null, notes: null }));
    const english = await createPseudoInstance("en");
    const { container } = renderPage(english);
    await select();
    await screen.findByText("EN(Sin tareas)");

    expect(strings(container)).toEqual([]);
  });

  it("has no string left outside the catalogue in the create and task dialogs", async () => {
    const english = await createPseudoInstance("en");
    renderPage(english);

    fireEvent.click(screen.getByRole("button", { name: /EN\(Nuevo proyecto\)/ }));
    expect(strings(await screen.findByRole("dialog"))).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "EN(Cancelar)" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await select();
    fireEvent.click(await screen.findByRole("button", { name: /EN\(Añadir\)/ }));
    expect(strings(await screen.findByRole("dialog"))).toEqual([]);
  });
});
