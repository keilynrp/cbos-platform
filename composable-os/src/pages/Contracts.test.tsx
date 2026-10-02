import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import { ApiError } from "@/lib/api";
import Contracts from "@/pages/Contracts";
import {
  FORMATTED_CURRENCY, createPseudoInstance, notFromCatalogue, renderPageWithI18n, visibleStrings,
} from "@/test/i18n";

const svc = vi.hoisted(() => ({
  getAll: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(),
  addClause: vi.fn(), deleteClause: vi.fn(),
}));
const toast = vi.hoisted(() => vi.fn());

vi.mock("@/services/contracts", () => ({ contractsService: svc }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

/** Datos del usuario (titulos, numeros, clausulas): no son texto de la interfaz. */
const DATA = ["CT-001", "CT-002", "Acuerdo Sol", "Soporte anual", "Confidencialidad", "Texto legal", "USD"];

const item = (over: Record<string, unknown> = {}) => ({
  id: "c1", contract_number: "CT-001", title: "Acuerdo Sol", status: "draft", value: 1500, currency: "USD",
  start_date: null, end_date: null, organization_id: null, contact_id: null, sales_order_id: null,
  created_at: "2026-01-01T00:00:00Z", ...over,
});
const full = (over: Record<string, unknown> = {}) => ({
  ...item(), workspace_id: "w1", description: null, sent_at: null, signed_at: null, executed_at: null,
  terminated_at: null, expired_at: null, notes: null, opportunity_id: null, owner_id: null, updated_at: "2026-01-01T00:00:00Z",
  clauses: [{ id: "k1", contract_id: "c1", clause_order: 1, title: "Confidencialidad", body: "Texto legal", created_at: "", updated_at: "" }],
  ...over,
});

const renderPage = (instance = i18n) => renderPageWithI18n(<Contracts />, instance);
const selectFirst = async (title = "Acuerdo Sol") => fireEvent.click(await screen.findByText(title));

beforeEach(() => {
  Object.values(svc).forEach((fn) => fn.mockReset());
  toast.mockReset();
  svc.getAll.mockResolvedValue([
    item(),
    item({ id: "c2", contract_number: "CT-002", title: "Soporte anual", status: "executed", value: 500 }),
  ]);
  svc.get.mockResolvedValue(full());
  svc.create.mockResolvedValue(full());
  svc.update.mockResolvedValue(full());
  svc.delete.mockResolvedValue(undefined);
  svc.addClause.mockResolvedValue({});
  svc.deleteClause.mockResolvedValue(undefined);
});

describe("Contracts, in Spanish", () => {
  it("renders the header, the KPIs and the table with translated statuses", async () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Contratos" })).toBeInTheDocument();
    expect(screen.getByText("Gestión del ciclo de vida de contratos con clientes.")).toBeInTheDocument();
    expect(await screen.findByText("Acuerdo Sol")).toBeInTheDocument();
    for (const text of ["Total contratos", "En proceso", "Ejecutados", "Valor total", "Todos los contratos"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    for (const col of ["Número", "Título", "Estado", "Valor", "Vence"]) {
      expect(screen.getByRole("columnheader", { name: col })).toBeInTheDocument();
    }
    expect(screen.getByText("Borrador")).toBeInTheDocument();
    expect(screen.getByText("Ejecutado", { selector: "div" })).toBeInTheDocument();
  });

  it("falls back to the raw value for a status the catalogue does not know", async () => {
    svc.getAll.mockResolvedValue([item({ status: "archived_x" })]);
    renderPage();

    expect(await screen.findByText("archived_x")).toBeInTheDocument();
  });

  it("invites the user to create the first contract", async () => {
    svc.getAll.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText("Sin contratos aún.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Crear el primero" }));
    expect(await screen.findByText("Nuevo contrato", { selector: "h2" })).toBeInTheDocument();
  });

  it("creates a contract and confirms with a toast", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /Nuevo contrato/ }));

    expect(await screen.findByText("Título *")).toBeInTheDocument();
    expect(screen.getByText("Fecha inicio")).toBeInTheDocument();
    expect(screen.getByText("Fecha fin")).toBeInTheDocument();
    expect(screen.getByText("Moneda")).toBeInTheDocument();
    const submit = screen.getByRole("button", { name: "Crear contrato" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Ej: Acuerdo de servicios Q4 2026"), { target: { value: "Nuevo" } });
    fireEvent.click(submit);

    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Contrato creado" }));
  });

  it("reports a failure with the translated title and the backend message", async () => {
    svc.create.mockRejectedValue(new ApiError("Boom", "NOPE_UNKNOWN", {}, 500));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /Nuevo contrato/ }));
    fireEvent.change(await screen.findByPlaceholderText("Ej: Acuerdo de servicios Q4 2026"), { target: { value: "Nuevo" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear contrato" }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Error", variant: "destructive" })),
    );
  });

  it("shows the detail with the clause count and its clause number", async () => {
    renderPage();
    await selectFirst();

    expect(await screen.findByText("Cláusulas (1)")).toBeInTheDocument();
    expect(screen.getByText("Cláusula 1")).toBeInTheDocument();
    expect(screen.getByText("Confidencialidad")).toBeInTheDocument();
    expect(screen.getByText("Inicio")).toBeInTheDocument();
    expect(screen.getByText("Vencimiento")).toBeInTheDocument();
  });

  it("offers the transitions of the current status, translated", async () => {
    renderPage();
    await selectFirst();

    expect(await screen.findByRole("button", { name: "Enviar a cliente" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Terminar" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Enviar a cliente" }));
    await waitFor(() => expect(svc.update).toHaveBeenCalledWith("c1", { status: "sent" }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Estado actualizado" }));
  });

  it.each([
    ["sent", "Marcar firmado"],
    ["signed", "Ejecutar contrato"],
    ["executed", "Marcar vencido"],
  ])("labels the next step from %s", async (status, label) => {
    svc.get.mockResolvedValue(full({ status }));
    renderPage();
    await selectFirst();

    expect(await screen.findByRole("button", { name: label })).toBeInTheDocument();
  });

  it("adds a clause and confirms", async () => {
    renderPage();
    await selectFirst();
    fireEvent.click(await screen.findByRole("button", { name: /Agregar/ }));

    fireEvent.change(screen.getByPlaceholderText("Título de la cláusula"), { target: { value: "Pagos" } });
    expect(screen.getByPlaceholderText("Texto de la cláusula...")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Cláusula agregada" }));
  });

  it("explains a contract without clauses", async () => {
    svc.get.mockResolvedValue(full({ clauses: [] }));
    renderPage();
    await selectFirst();

    expect(await screen.findByText("Sin cláusulas. Agrega la primera.")).toBeInTheDocument();
  });

  it("deletes a draft from the row menu", async () => {
    renderPage();
    await screen.findByText("Acuerdo Sol");
    const row = screen.getByText("Acuerdo Sol").closest("tr")!;
    fireEvent.pointerDown(within(row).getByRole("button"), { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Eliminar" }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Contrato eliminado" }));
  });
});

describe("Contracts, in a second language", () => {
  const strings = (root: HTMLElement) => notFromCatalogue(visibleStrings(root), DATA, [FORMATTED_CURRENCY]);

  it("has no string left outside the catalogue in the list", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPage(english);
    await screen.findByText("Acuerdo Sol");

    expect(strings(container)).toEqual([]);
    expect(screen.getByText("EN(Borrador)")).toBeInTheDocument();
  });

  it("has no string left outside the catalogue in the empty state", async () => {
    svc.getAll.mockResolvedValue([]);
    const english = await createPseudoInstance("en");
    const { container } = renderPage(english);
    await screen.findByText("EN(Sin contratos aún.)");

    expect(strings(container)).toEqual([]);
  });

  it("has no string left outside the catalogue in the detail panel and the clause form", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPage(english);
    await selectFirst();
    await screen.findByText("EN(Cláusula 1)");
    fireEvent.click(screen.getByRole("button", { name: "EN(Agregar)" }));

    expect(strings(container)).toEqual([]);
    expect(screen.getByPlaceholderText("EN(Título de la cláusula)")).toBeInTheDocument();
  });

  it("has no string left outside the catalogue in the create dialog", async () => {
    const english = await createPseudoInstance("en");
    renderPage(english);
    fireEvent.click(await screen.findByRole("button", { name: /EN\(Nuevo contrato\)/ }));
    const dialog = await screen.findByRole("dialog");

    expect(strings(dialog)).toEqual([]);
    expect(screen.getByPlaceholderText("EN(Descripción u observaciones...)")).toBeInTheDocument();
  });
});
