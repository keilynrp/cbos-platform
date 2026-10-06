import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import i18next, { type i18n as I18n } from "i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildI18nOptions, resources } from "@/i18n";
import { formatDate } from "@/i18n/format";
import { ApiError } from "@/lib/api";
import Projects from "@/pages/Projects";
import { renderPageWithI18n } from "@/test/i18n";

/**
 * `projects` en el ingles *real* (tarea 12 del plan de i18n): la lista, el detalle con sus
 * tareas y los dialogos de alta con el catalogo `en` que se envia. Los estados de
 * proyecto y de tarea salen del `en` de `common`.
 */

const svc = vi.hoisted(() => ({
  getAll: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(),
  addTask: vi.fn(), updateTask: vi.fn(), deleteTask: vi.fn(),
}));
const toast = vi.hoisted(() => vi.fn());

vi.mock("@/services/projects", () => ({ projectsService: svc }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

async function english(): Promise<I18n> {
  const instance = i18next.createInstance();
  await instance.init(buildI18nOptions(resources, "en"));
  return instance;
}

const item = (over: Record<string, unknown> = {}) => ({
  id: "p1", project_number: "PRJ-001", title: "Sun store", status: "planning", budget: 5000, currency: "USD",
  start_date: "2026-03-05", end_date: null, organization_id: null, contact_id: null, contract_id: null,
  created_at: "2026-01-01T00:00:00Z", ...over,
});
const task = (over: Record<string, unknown> = {}) => ({
  id: "t1", project_id: "p1", task_order: 1, title: "Design logo", description: null, status: "todo",
  due_date: "2026-04-10", assignee_id: null, created_at: "", updated_at: "", ...over,
});
const full = (over: Record<string, unknown> = {}) => ({
  ...item(), workspace_id: "w1", description: "Initial scope", activated_at: null, completed_at: null,
  cancelled_at: null, notes: "Project notes", sales_order_id: null, owner_id: null, tasks: [task()],
  updated_at: "", ...over,
});

const renderPage = (instance: I18n) => renderPageWithI18n(<Projects />, instance);
const select = async (title = "Sun store") => fireEvent.click(await screen.findByText(title));

beforeEach(() => {
  Object.values(svc).forEach((fn) => fn.mockReset());
  toast.mockReset();
  svc.getAll.mockResolvedValue([
    item(),
    item({ id: "p2", project_number: "PRJ-002", title: "Web redesign", status: "active", budget: 1000 }),
  ]);
  svc.get.mockResolvedValue(full());
  svc.create.mockResolvedValue(full());
  svc.update.mockResolvedValue(full());
  svc.delete.mockResolvedValue(undefined);
  svc.addTask.mockResolvedValue({});
  svc.updateTask.mockResolvedValue({});
  svc.deleteTask.mockResolvedValue(undefined);
});

describe("Projects in English", () => {
  it("renders the header, the KPIs and the table with English statuses and dates", async () => {
    renderPage(await english());

    expect(screen.getByRole("heading", { name: "Projects" })).toBeInTheDocument();
    expect(screen.getByText("Project lifecycle management")).toBeInTheDocument();
    expect(await screen.findByText("Sun store")).toBeInTheDocument();
    for (const text of ["Total projects", "Total budget", "Project list"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    // «Active» es la etiqueta del KPI y el estado de «Web redesign»: dos elementos.
    expect(screen.getAllByText("Active")).toHaveLength(2);
    for (const col of ["Number", "Title", "Status", "Budget", "Start", "End"]) {
      expect(screen.getByRole("columnheader", { name: col })).toBeInTheDocument();
    }
    expect(screen.getByText("Planning")).toBeInTheDocument();
    expect(screen.getByText("Active", { selector: "div" })).toBeInTheDocument();
    expect(screen.queryByText("2026-03-05")).not.toBeInTheDocument();
    expect(screen.getAllByText(formatDate("2026-03-05", "en"))).toHaveLength(2);
  });

  it("explains an empty list and offers to create the first project", async () => {
    svc.getAll.mockResolvedValue([]);
    renderPage(await english());

    expect(await screen.findByText("No projects yet")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create the first project" }));
    expect(await screen.findByText("New project", { selector: "h2" })).toBeInTheDocument();
  });

  it("creates a project and confirms with a toast", async () => {
    renderPage(await english());
    fireEvent.click(screen.getByRole("button", { name: /New project/ }));

    expect(await screen.findByText("Title *")).toBeInTheDocument();
    for (const text of ["Description", "Budget", "Currency", "Start date", "End date", "Notes"]) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
    const submit = screen.getByRole("button", { name: "Create project" });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("Project name"), { target: { value: "New" } });
    fireEvent.click(submit);

    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Project created" }));
  });

  it("reports a failed creation with an English title", async () => {
    svc.create.mockRejectedValue(new ApiError("Boom", "NOPE_UNKNOWN", {}, 500));
    renderPage(await english());
    fireEvent.click(screen.getByRole("button", { name: /New project/ }));
    fireEvent.change(await screen.findByPlaceholderText("Project name"), { target: { value: "New" } });
    fireEvent.click(screen.getByRole("button", { name: "Create project" }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Could not create the project", variant: "destructive" })),
    );
  });

  it("shows the detail with the period as formatted dates, the task count and the task status", async () => {
    renderPage(await english());
    await select();

    expect(await screen.findByText("Tasks (1)")).toBeInTheDocument();
    expect(screen.getByText("Period")).toBeInTheDocument();
    expect(screen.getByText("To do")).toBeInTheDocument();
    expect(screen.getByText("Design logo")).toBeInTheDocument();
    expect(screen.getByText("Project notes")).toBeInTheDocument();
    expect(screen.queryByText(/2026-03-05/)).not.toBeInTheDocument();
    expect(screen.queryByText("2026-04-10")).not.toBeInTheDocument();
  });

  it("offers Activate on a planning project and confirms the transition", async () => {
    renderPage(await english());
    await select();
    fireEvent.click(await screen.findByRole("button", { name: /Activate/ }));

    await waitFor(() => expect(svc.update).toHaveBeenCalledWith("p1", { status: "active" }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Status updated" }));
  });

  it.each([
    ["active", ["Pause", "Complete", "Cancel"]],
    ["on_hold", ["Resume", "Cancel"]],
  ])("labels the actions of a %s project", async (status, labels) => {
    svc.get.mockResolvedValue(full({ status }));
    renderPage(await english());
    await select();

    for (const label of labels) {
      expect(await screen.findByRole("button", { name: new RegExp(label) })).toBeInTheDocument();
    }
  });

  it("falls back to the English message when a transition is refused without a known code", async () => {
    svc.update.mockRejectedValue(new Error(""));
    renderPage(await english());
    await select();
    fireEvent.click(await screen.findByRole("button", { name: /Activate/ }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith({ title: "Transition not allowed", variant: "destructive" }),
    );
  });

  it("has no actions on a completed project", async () => {
    svc.get.mockResolvedValue(full({ status: "completed" }));
    renderPage(await english());
    await select();

    expect(await screen.findByText("Tasks (1)")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Activate|Pause|^Complete/ })).not.toBeInTheDocument();
  });

  it("explains a project without tasks", async () => {
    svc.get.mockResolvedValue(full({ tasks: [] }));
    renderPage(await english());
    await select();

    expect(await screen.findByText("No tasks")).toBeInTheDocument();
  });

  it("adds a task and confirms", async () => {
    renderPage(await english());
    await select();
    fireEvent.click(await screen.findByRole("button", { name: /Add/ }));

    expect(await screen.findByText("New task")).toBeInTheDocument();
    expect(screen.getByText("Due date")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Task description"), { target: { value: "Another" } });
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Add" }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Task added" }));
  });

  it("deletes a planning project from the row menu", async () => {
    renderPage(await english());
    const row = (await screen.findByText("Sun store")).closest("tr")!;
    fireEvent.pointerDown(within(row).getByRole("button"), { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Project deleted" }));
  });
});
