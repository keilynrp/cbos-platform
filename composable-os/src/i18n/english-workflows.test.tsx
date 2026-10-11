import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import i18next, { type i18n as I18n } from "i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildI18nOptions, resources } from "@/i18n";
import { formatDate } from "@/i18n/format";
import Workflows from "@/pages/Workflows";
import { renderPageWithI18n } from "@/test/i18n";

/**
 * `workflows` en el ingles *real* (tarea 12 del plan de i18n): la lista, el historial de
 * ejecuciones y el dialogo de alta con el catalogo `en` que se envia, no el
 * pseudo-localizado de `Workflows.test.tsx`.
 */

const svc = vi.hoisted(() => ({
  getAll: vi.fn(), create: vi.fn(), toggle: vi.fn(), delete: vi.fn(), getRuns: vi.fn(),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("@/services/workflows", () => ({ workflowsService: svc }));
vi.mock("sonner", () => ({ toast }));

async function english(): Promise<I18n> {
  const instance = i18next.createInstance();
  await instance.init(buildI18nOptions(resources, "en"));
  return instance;
}

const workflow = (over: Record<string, unknown> = {}) => ({
  id: "w1", name: "Lead intake", description: "Alerts the team", trigger_type: "event",
  trigger_config: { event_type: "LeadCaptured" }, conditions: [{ field: "a", operator: "eq", value: 1 }],
  actions: [
    { type: "log", config: { message: "hello" } },
    { type: "log", config: {} },
    { type: "log", config: {} },
  ],
  enabled: true, run_count: 1, last_triggered_at: "2026-09-30T12:00:00Z",
  created_at: "2026-09-01T00:00:00Z", updated_at: "2026-09-01T00:00:00Z", ...over,
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

const renderPage = (instance: I18n) => renderPageWithI18n(<Workflows />, instance);
const viewRuns = async () => fireEvent.click((await screen.findAllByRole("button", { name: "View runs" }))[0]);

beforeEach(() => {
  Object.values(svc).forEach((fn) => fn.mockReset());
  Object.values(toast).forEach((fn) => fn.mockReset());
  svc.getAll.mockResolvedValue([
    workflow(),
    workflow({ id: "w2", name: "Closed sales", description: null, conditions: [{}, {}], actions: [{ type: "log", config: {} }], run_count: 5, enabled: false, last_triggered_at: null }),
  ]);
  svc.getRuns.mockResolvedValue(runs);
  svc.create.mockResolvedValue({});
  svc.delete.mockResolvedValue(undefined);
});

describe("Workflows in English", () => {
  it("renders the header, the KPIs and the cards", async () => {
    renderPage(await english());

    expect(screen.getByRole("heading", { name: "Workflows" })).toBeInTheDocument();
    expect(screen.getByText("Event-driven automation — triggers, conditions and actions.")).toBeInTheDocument();
    expect(await screen.findByText("Lead intake")).toBeInTheDocument();
    for (const text of ["Total", "Active", "Runs"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.getAllByRole("button", { name: /New workflow/ })[0]).toBeInTheDocument();
  });

  it("agrees plurals with the number, including one", async () => {
    renderPage(await english());
    await screen.findByText("Lead intake");

    expect(screen.getByText("1 run")).toBeInTheDocument();
    expect(screen.getByText("5 runs")).toBeInTheDocument();
    expect(screen.getByText("1 condition")).toBeInTheDocument();
    expect(screen.getByText("2 conditions")).toBeInTheDocument();
    expect(screen.getByText("+1 more")).toBeInTheDocument();
  });

  it("shows the trigger and action types, and the last run as a formatted date", async () => {
    renderPage(await english());
    await screen.findByText("Lead intake");

    expect(screen.getAllByText("event").length).toBeGreaterThan(0);
    expect(screen.getAllByText("log").length).toBeGreaterThan(0);
    expect(screen.queryByText(/2026-09-30/)).not.toBeInTheDocument();
    expect(screen.getByText(formatDate("2026-09-30T12:00:00Z", "en", "short"))).toBeInTheDocument();
  });

  it("names the send-email action instead of showing its code", async () => {
    svc.getAll.mockResolvedValue([workflow({ actions: [{ type: "send_email", config: {} }] })]);
    renderPage(await english());
    await screen.findByText("Lead intake");

    expect(screen.getByText("send email")).toBeInTheDocument();
    expect(screen.queryByText("send_email")).not.toBeInTheDocument();
  });

  it("explains an empty list and offers to create the first workflow", async () => {
    svc.getAll.mockResolvedValue([]);
    renderPage(await english());

    expect(await screen.findByText("No workflows yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create the first one/ })).toBeInTheDocument();
  });

  it("names the icon-only buttons and the switches", async () => {
    renderPage(await english());
    await screen.findByText("Lead intake");

    expect(screen.getAllByRole("button", { name: "View runs" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Delete workflow" })).toHaveLength(2);
    expect(screen.getByRole("switch", { name: "Turn Lead intake on or off" })).toBeInTheDocument();
  });

  it("shows the run history with English statuses and the raw backend error", async () => {
    renderPage(await english());
    await viewRuns();

    expect(await screen.findByText("Run history")).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    expect(await within(dialog).findByText("failed")).toBeInTheDocument();
    expect(within(dialog).getAllByText("completed").length).toBeGreaterThan(0);
    expect(within(dialog).getByText("Event: LeadCaptured")).toBeInTheDocument();
    expect(within(dialog).getByText("12ms")).toBeInTheDocument();
    expect(within(dialog).getByText("boom")).toBeInTheDocument();
  });

  it("falls back to the raw value for a status the catalogue does not know", async () => {
    svc.getRuns.mockResolvedValue([{ ...runs[0], status: "queued_for_retry", steps_result: [] }]);
    renderPage(await english());
    await viewRuns();

    expect(await screen.findByText("queued_for_retry")).toBeInTheDocument();
  });

  it("shows the empty run history", async () => {
    svc.getRuns.mockResolvedValue([]);
    renderPage(await english());
    await viewRuns();

    expect(await screen.findByText("No runs yet")).toBeInTheDocument();
  });

  it("creates a workflow, sending the English default action message", async () => {
    renderPage(await english());
    await screen.findByText("Lead intake");

    fireEvent.click(screen.getAllByRole("button", { name: /New workflow/ })[0]);
    expect(await screen.findByText("Trigger event")).toBeInTheDocument();
    expect(screen.getByText("Description (optional)")).toBeInTheDocument();
    expect(screen.getByText(/^Available events: LeadCaptured, /)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("E.g. Notify new lead"), { target: { value: "My flow" } });
    fireEvent.change(screen.getByPlaceholderText("E.g. LeadCaptured, QuoteAccepted"), { target: { value: "QuoteAccepted" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(svc.create).toHaveBeenCalled());
    const payload = svc.create.mock.calls[0][0];
    expect(payload.name).toBe("My flow");
    expect(payload.actions).toEqual([{ type: "log", config: { message: "Workflow executed" } }]);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Workflow created"));
  });

  it("sends the message the user typed instead of the default", async () => {
    renderPage(await english());
    await screen.findByText("Lead intake");

    fireEvent.click(screen.getAllByRole("button", { name: /New workflow/ })[0]);
    fireEvent.change(await screen.findByPlaceholderText("E.g. Notify new lead"), { target: { value: "My flow" } });
    fireEvent.change(screen.getByPlaceholderText("E.g. LeadCaptured, QuoteAccepted"), { target: { value: "QuoteAccepted" } });
    fireEvent.change(screen.getByPlaceholderText("Use {field} for event values"), { target: { value: "Closed {field}" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(svc.create).toHaveBeenCalled());
    expect(svc.create.mock.calls[0][0].actions).toEqual([{ type: "log", config: { message: "Closed {field}" } }]);
  });

  it("deletes a workflow and confirms it", async () => {
    renderPage(await english());
    await screen.findByText("Lead intake");

    fireEvent.click(screen.getAllByRole("button", { name: "Delete workflow" })[0]);

    await waitFor(() => expect(svc.delete).toHaveBeenCalled());
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Workflow deleted"));
  });
});
