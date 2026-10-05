import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import i18next, { type i18n as I18n } from "i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildI18nOptions, resources } from "@/i18n";
import { ApiError } from "@/lib/api";
import Contracts from "@/pages/Contracts";
import { renderPageWithI18n } from "@/test/i18n";

/**
 * `contracts` en el ingles *real* (tarea 12 del plan de i18n): la lista, el detalle con
 * sus clausulas y el dialogo de alta con el catalogo `en` que se envia. Los estados
 * salen del `en` de `common`.
 */

const svc = vi.hoisted(() => ({
  getAll: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(),
  addClause: vi.fn(), deleteClause: vi.fn(),
}));
const toast = vi.hoisted(() => vi.fn());

vi.mock("@/services/contracts", () => ({ contractsService: svc }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

async function english(): Promise<I18n> {
  const instance = i18next.createInstance();
  await instance.init(buildI18nOptions(resources, "en"));
  return instance;
}

const item = (over: Record<string, unknown> = {}) => ({
  id: "c1", contract_number: "CT-001", title: "Sun agreement", status: "draft", value: 1500, currency: "USD",
  start_date: null, end_date: null, organization_id: null, contact_id: null, sales_order_id: null,
  created_at: "2026-01-01T00:00:00Z", ...over,
});
const full = (over: Record<string, unknown> = {}) => ({
  ...item(), workspace_id: "w1", description: null, sent_at: null, signed_at: null, executed_at: null,
  terminated_at: null, expired_at: null, notes: null, opportunity_id: null, owner_id: null, updated_at: "2026-01-01T00:00:00Z",
  clauses: [{ id: "k1", contract_id: "c1", clause_order: 1, title: "Confidentiality", body: "Legal text", created_at: "", updated_at: "" }],
  ...over,
});

const renderPage = (instance: I18n) => renderPageWithI18n(<Contracts />, instance);
const selectFirst = async () => fireEvent.click(await screen.findByText("Sun agreement"));

beforeEach(() => {
  Object.values(svc).forEach((fn) => fn.mockReset());
  toast.mockReset();
  svc.getAll.mockResolvedValue([
    item(),
    item({ id: "c2", contract_number: "CT-002", title: "Annual support", status: "executed", value: 500 }),
  ]);
  svc.get.mockResolvedValue(full());
  svc.create.mockResolvedValue(full());
  svc.update.mockResolvedValue(full());
  svc.delete.mockResolvedValue(undefined);
  svc.addClause.mockResolvedValue({});
  svc.deleteClause.mockResolvedValue(undefined);
});

describe("Contracts in English", () => {
  it("renders the header, the KPIs and the table with English statuses", async () => {
    renderPage(await english());

    expect(screen.getByRole("heading", { name: "Contracts" })).toBeInTheDocument();
    expect(screen.getByText("Customer contract lifecycle management.")).toBeInTheDocument();
    expect(await screen.findByText("Sun agreement")).toBeInTheDocument();
    for (const text of ["Total contracts", "In progress", "Total value", "All contracts"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    for (const col of ["Number", "Title", "Status", "Value", "Due"]) {
      expect(screen.getByRole("columnheader", { name: col })).toBeInTheDocument();
    }
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText("Executed", { selector: "div" })).toBeInTheDocument();
    expect(screen.queryByText("Borrador")).not.toBeInTheDocument();
  });

  it("invites the user to create the first contract", async () => {
    svc.getAll.mockResolvedValue([]);
    renderPage(await english());

    expect(await screen.findByText("No contracts yet.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create the first one" }));
    expect(await screen.findByText("New contract", { selector: "h2" })).toBeInTheDocument();
  });

  it("creates a contract and confirms with a toast", async () => {
    renderPage(await english());
    fireEvent.click(await screen.findByRole("button", { name: /New contract/ }));

    expect(await screen.findByText("Title *")).toBeInTheDocument();
    expect(screen.getByText("Start date")).toBeInTheDocument();
    expect(screen.getByText("End date")).toBeInTheDocument();
    expect(screen.getByText("Currency")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Description or remarks...")).toBeInTheDocument();
    const submit = screen.getByRole("button", { name: "Create contract" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("E.g. Q4 2026 services agreement"), { target: { value: "New" } });
    fireEvent.click(submit);

    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Contract created" }));
  });

  it("reports a failure with the English title and the backend message", async () => {
    svc.create.mockRejectedValue(new ApiError("Boom", "NOPE_UNKNOWN", {}, 500));
    renderPage(await english());
    fireEvent.click(await screen.findByRole("button", { name: /New contract/ }));
    fireEvent.change(await screen.findByPlaceholderText("E.g. Q4 2026 services agreement"), { target: { value: "New" } });
    fireEvent.click(screen.getByRole("button", { name: "Create contract" }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Error", description: "Boom", variant: "destructive" })),
    );
  });

  it("shows the detail with the clause count and its clause number", async () => {
    renderPage(await english());
    await selectFirst();

    expect(await screen.findByText("Clauses (1)")).toBeInTheDocument();
    expect(screen.getByText("Clause 1")).toBeInTheDocument();
    expect(screen.getByText("Confidentiality")).toBeInTheDocument();
    expect(screen.getByText("Start")).toBeInTheDocument();
    expect(screen.getByText("Expiry")).toBeInTheDocument();
  });

  it("offers the transitions of the current status in English", async () => {
    renderPage(await english());
    await selectFirst();

    expect(await screen.findByRole("button", { name: "Send to customer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Terminate" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Send to customer" }));
    await waitFor(() => expect(svc.update).toHaveBeenCalledWith("c1", { status: "sent" }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Status updated" }));
  });

  it.each([
    ["sent", "Mark as signed"],
    ["signed", "Execute contract"],
    ["executed", "Mark as expired"],
  ])("labels the next step from %s", async (status, label) => {
    svc.get.mockResolvedValue(full({ status }));
    renderPage(await english());
    await selectFirst();

    expect(await screen.findByRole("button", { name: label })).toBeInTheDocument();
  });

  it("adds a clause and confirms", async () => {
    renderPage(await english());
    await selectFirst();
    fireEvent.click(await screen.findByRole("button", { name: /Add/ }));

    fireEvent.change(screen.getByPlaceholderText("Clause title"), { target: { value: "Payments" } });
    expect(screen.getByPlaceholderText("Clause text...")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Clause added" }));
  });

  it("explains a contract without clauses", async () => {
    svc.get.mockResolvedValue(full({ clauses: [] }));
    renderPage(await english());
    await selectFirst();

    expect(await screen.findByText("No clauses. Add the first one.")).toBeInTheDocument();
  });

  it("deletes a draft from the row menu", async () => {
    renderPage(await english());
    await screen.findByText("Sun agreement");
    const row = screen.getByText("Sun agreement").closest("tr")!;
    fireEvent.pointerDown(within(row).getByRole("button"), { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Contract deleted" }));
  });
});
