import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import { formatDate } from "@/i18n/format";
import Invoicing from "@/pages/Invoicing";
import {
  FORMATTED_CURRENCY, createPseudoInstance, notFromCatalogue, renderPageWithI18n, visibleStrings,
} from "@/test/i18n";

const svc = vi.hoisted(() => ({
  getSummary: vi.fn(), listInvoices: vi.fn(), getInvoice: vi.fn(), createInvoice: vi.fn(),
  updateInvoice: vi.fn(), deleteInvoice: vi.fn(), recordPayment: vi.fn(),
}));
const toast = vi.hoisted(() => vi.fn());

vi.mock("@/services/accounting", () => ({ accountingService: svc }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

/** Datos del usuario o del servidor: no son texto de la interfaz. */
const DATA = ["INV-001", "INV-002", "INV-003", "Servicio de diseño", "Pago a 30 días", "archived", "USD"];
const FORMATTED_DATE = /^\d{1,2}\/\d{1,2}\/\d{2,4}$|^\d{1,2} \p{L}{3,4}\.? \d{4}$/u;

const item = (over: Record<string, unknown> = {}) => ({
  id: "i1", invoice_number: "INV-001", status: "draft", issue_date: "2026-03-05", due_date: "2026-04-05",
  total: 1160, amount_due: 1160, currency: "USD", organization_id: null, contact_id: null, created_at: "", ...over,
});
const full = (over: Record<string, unknown> = {}) => ({
  ...item(), workspace_id: "w1", paid_at: null, subtotal: 1000, discount_amount: 0, tax_rate: 16, tax_amount: 160,
  amount_paid: 0, notes: "Pago a 30 días", sales_order_id: null, owner_id: null, updated_at: "",
  lines: [{
    id: "l1", invoice_id: "i1", line_order: 0, description: "Servicio de diseño", quantity: 2, unit_price: 500,
    discount_pct: 0, subtotal: 1000, product_id: null, created_at: "",
  }],
  ...over,
});
const summary = (over: Record<string, unknown> = {}) => ({
  total_invoiced: 10000, total_paid: 4000, total_outstanding: 6000, overdue_count: 1, overdue_amount: 500,
  draft_count: 3, sent_count: 2, paid_count: 1, ...over,
});

const renderPage = (instance = i18n) => renderPageWithI18n(<Invoicing />, instance);
const openMenu = (row: HTMLElement) =>
  fireEvent.pointerDown(within(row).getByRole("button"), { button: 0, ctrlKey: false });
const selectRow = async (number = "INV-001") => fireEvent.click(await screen.findByText(number));

beforeAll(() => {
  // jsdom no implementa la captura de puntero que usa el Select de Radix.
  const proto = window.HTMLElement.prototype as unknown as Record<string, unknown>;
  proto.hasPointerCapture ??= () => false;
  proto.setPointerCapture ??= () => {};
  proto.releasePointerCapture ??= () => {};
});

beforeEach(() => {
  Object.values(svc).forEach((fn) => fn.mockReset());
  toast.mockReset();
  svc.getSummary.mockResolvedValue(summary());
  svc.listInvoices.mockResolvedValue([
    item(),
    item({ id: "i2", invoice_number: "INV-002", status: "sent", amount_due: 400, total: 400 }),
    item({ id: "i3", invoice_number: "INV-003", status: "overdue", due_date: null }),
  ]);
  svc.getInvoice.mockResolvedValue(full());
  svc.createInvoice.mockResolvedValue({});
  svc.updateInvoice.mockResolvedValue({});
  svc.deleteInvoice.mockResolvedValue(undefined);
  svc.recordPayment.mockResolvedValue({});
});

describe("Invoicing, in Spanish", () => {
  it("renders the header, the KPIs and the table", async () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Facturación" })).toBeInTheDocument();
    expect(screen.getByText("Gestiona facturas, pagos y cuentas por cobrar")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Datos de facturación/ })).toHaveAttribute("href", "/settings/company");
    expect(await screen.findByText("INV-001")).toBeInTheDocument();

    for (const text of ["Total facturado", "Cobrado", "Vencidas"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    for (const col of ["Número", "Estado", "Emisión", "Vencimiento", "Total", "Por cobrar"]) {
      expect(screen.getAllByRole("columnheader", { name: col }).length).toBeGreaterThan(0);
    }
  });

  it("agrees the KPI counts in the singular and the plural", async () => {
    renderPage();
    expect(await screen.findByText("1 factura pagada")).toBeInTheDocument();
    expect(screen.getByText("2 en proceso")).toBeInTheDocument();
    expect(screen.getByText("3 borradores")).toBeInTheDocument();
    expect(screen.getByText("1 factura")).toBeInTheDocument();
  });

  it("pluralises the KPI counts", async () => {
    svc.getSummary.mockResolvedValue(summary({ paid_count: 5, draft_count: 1, overdue_count: 0 }));
    renderPage();

    expect(await screen.findByText("5 facturas pagadas")).toBeInTheDocument();
    expect(screen.getByText("1 borrador")).toBeInTheDocument();
    expect(screen.getByText("0 facturas")).toBeInTheDocument();
  });

  it("translates the status of each invoice and of each filter", async () => {
    renderPage();
    await screen.findByText("INV-001");

    for (const tab of ["Todas", "Borrador", "Enviada", "Parcial", "Pagada", "Vencida"]) {
      expect(screen.getByRole("tab", { name: tab })).toBeInTheDocument();
    }
    const rows = screen.getAllByRole("row");
    expect(within(rows[1]).getByText("Borrador")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Enviada")).toBeInTheDocument();
    expect(within(rows[3]).getByText("Vencida")).toBeInTheDocument();
  });

  it("falls back to the raw value for a status the catalogue does not know", async () => {
    svc.listInvoices.mockResolvedValue([item({ status: "archived" })]);
    renderPage();

    expect(await screen.findByText("archived")).toBeInTheDocument();
  });

  it("filters by status", async () => {
    renderPage();
    await screen.findByText("INV-001");

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Enviada" }), { button: 0 });

    await waitFor(() => expect(svc.listInvoices).toHaveBeenLastCalledWith("sent"));
  });

  it("explains an empty list", async () => {
    svc.listInvoices.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText("Sin facturas. Crea la primera.")).toBeInTheDocument();
  });

  it("shows a dash when an invoice has no due date", async () => {
    renderPage();
    const row = (await screen.findByText("INV-003")).closest("tr")!;

    expect(within(row).getByText("—")).toBeInTheDocument();
  });

  it("deletes a draft from the row menu and confirms", async () => {
    renderPage();
    openMenu((await screen.findByText("INV-001")).closest("tr")!);
    fireEvent.click(await screen.findByRole("menuitem", { name: /Eliminar/ }));

    await waitFor(() => expect(svc.deleteInvoice).toHaveBeenCalledWith("i1"));
    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Factura eliminada" }));
  });

  it("explains a refused deletion", async () => {
    svc.deleteInvoice.mockRejectedValue(new Error(""));
    renderPage();
    openMenu((await screen.findByText("INV-001")).closest("tr")!);
    fireEvent.click(await screen.findByRole("menuitem", { name: /Eliminar/ }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "No se puede eliminar", variant: "destructive" })),
    );
  });

  it("does not offer to delete a sent invoice", async () => {
    renderPage();
    openMenu((await screen.findByText("INV-002")).closest("tr")!);

    expect(await screen.findByRole("menuitem", { name: /Ver detalle/ })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Eliminar/ })).not.toBeInTheDocument();
  });

  it("shows the detail with the dates formatted, the lines and the totals", async () => {
    renderPage();
    await selectRow();

    expect(await screen.findByText(/^Emitida /)).toHaveTextContent(
      `Emitida ${formatDate("2026-03-05", "es")} · Vence ${formatDate("2026-04-05", "es")}`,
    );
    for (const text of ["Pagado", "Por pagar", "Líneas de factura", "Notas"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.getByText("Servicio de diseño")).toBeInTheDocument();
    expect(screen.getByText("IVA (16%)")).toBeInTheDocument();
    expect(screen.getByText("Pago a 30 días")).toBeInTheDocument();
  });

  it("marks a draft as sent and confirms", async () => {
    renderPage();
    await selectRow();
    fireEvent.click(await screen.findByRole("button", { name: /Marcar enviada/ }));

    await waitFor(() => expect(svc.updateInvoice).toHaveBeenCalledWith("i1", { status: "sent" }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Estado actualizado" }));
  });

  it("cancels a draft from the detail", async () => {
    renderPage();
    await selectRow();
    fireEvent.click(await screen.findByRole("button", { name: /^Cancelar/ }));

    await waitFor(() => expect(svc.updateInvoice).toHaveBeenCalledWith("i1", { status: "cancelled" }));
  });

  it("titles a failed status change with the generic error", async () => {
    svc.updateInvoice.mockRejectedValue(new Error(""));
    renderPage();
    await selectRow();
    fireEvent.click(await screen.findByRole("button", { name: /Marcar enviada/ }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Error", variant: "destructive" })),
    );
  });

  it("closes the detail panel", async () => {
    renderPage();
    await selectRow();
    await screen.findByText(/^Emitida /);

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(screen.queryByText(/^Emitida /)).not.toBeInTheDocument();
  });

  it("records a payment on a sent invoice and confirms", async () => {
    svc.getInvoice.mockResolvedValue(full({ id: "i2", invoice_number: "INV-002", status: "sent", amount_due: 400, total: 400 }));
    renderPage();
    await selectRow("INV-002");
    fireEvent.click(await screen.findByRole("button", { name: /Registrar pago/ }));

    expect(await screen.findByText("Monto")).toBeInTheDocument();
    for (const text of ["Método", "Referencia", "Fecha de pago"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.getByPlaceholderText("No. de transferencia, cheque…")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(svc.recordPayment).toHaveBeenCalledWith("i2", expect.objectContaining({ amount: 400, method: "transfer" })));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith({
        title: "Pago registrado",
        description: expect.stringMatching(/ registrado correctamente$/),
      }),
    );
  });

  it("lists the payment methods translated", async () => {
    svc.getInvoice.mockResolvedValue(full({ status: "sent", amount_due: 400 }));
    renderPage();
    await selectRow();
    fireEvent.click(await screen.findByRole("button", { name: /Registrar pago/ }));
    await screen.findByText("Monto");

    // El valor elegido por defecto ya sale traducido, no como `transfer`.
    expect(screen.getByRole("combobox")).toHaveTextContent("Transferencia");
    // jsdom no rellena `pointerType`, que Radix exige para abrir con el raton: se abre con el teclado.
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });
    for (const method of ["Efectivo", "Tarjeta", "Cheque", "Criptomoneda", "Otro"]) {
      expect(await screen.findByRole("option", { name: method })).toBeInTheDocument();
    }
  });

  it("does not offer to record a payment on a paid invoice", async () => {
    svc.getInvoice.mockResolvedValue(full({ status: "paid", amount_due: 0, amount_paid: 1160 }));
    renderPage();
    await selectRow();
    await screen.findByText(/^Emitida /);

    expect(screen.queryByRole("button", { name: /Registrar pago/ })).not.toBeInTheDocument();
  });

  it("creates an invoice and confirms", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Nueva factura/ }));

    expect(await screen.findByText("Fecha de emisión *")).toBeInTheDocument();
    for (const text of ["Fecha de vencimiento", "Moneda", "IVA (%)", "Líneas", "Notas internas", "Subtotal"]) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
    fireEvent.change(screen.getByPlaceholderText("Descripción del producto o servicio"), {
      target: { value: "Servicio de diseño" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Crear factura/ }));

    await waitFor(() => expect(svc.createInvoice).toHaveBeenCalled());
    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Factura creada" }));
  });

  it("adds and removes a line in the new invoice", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Nueva factura/ }));
    await screen.findByText("Fecha de emisión *");

    expect(screen.getByRole("button", { name: "Quitar línea" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Agregar/ }));
    const remove = screen.getAllByRole("button", { name: "Quitar línea" });
    expect(remove).toHaveLength(2);
    fireEvent.click(remove[0]);

    expect(screen.getAllByPlaceholderText("Descripción del producto o servicio")).toHaveLength(1);
  });
});

describe("Invoicing, in a second language", () => {
  const strings = (root: HTMLElement) =>
    notFromCatalogue(visibleStrings(root), DATA, [FORMATTED_CURRENCY, FORMATTED_DATE]);

  it("has no string left outside the catalogue in the list and the KPIs", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPage(english);
    await screen.findByText("INV-001");

    expect(strings(container)).toEqual([]);
    expect(screen.getByRole("heading", { name: "EN(Facturación)" })).toBeInTheDocument();
    expect(screen.getByText("EN(1 factura pagada)")).toBeInTheDocument();
  });

  it("has no string left outside the catalogue when there are no invoices", async () => {
    svc.listInvoices.mockResolvedValue([]);
    const english = await createPseudoInstance("en");
    const { container } = renderPage(english);
    await screen.findByText("EN(Sin facturas. Crea la primera.)");

    expect(strings(container)).toEqual([]);
  });

  it("has no string left outside the catalogue in the detail panel", async () => {
    svc.getInvoice.mockResolvedValue(full({ status: "sent", amount_due: 400, discount_amount: 50 }));
    const english = await createPseudoInstance("en");
    const { container } = renderPage(english);
    await selectRow();
    await screen.findByText(/^EN\(Emitida /);

    expect(strings(container)).toEqual([]);
    expect(screen.getByRole("button", { name: "EN(Registrar pago)" })).toBeInTheDocument();
  });

  it("has no string left outside the catalogue in the payment dialog", async () => {
    svc.getInvoice.mockResolvedValue(full({ status: "sent", amount_due: 400 }));
    const english = await createPseudoInstance("en");
    renderPage(english);
    await selectRow();
    fireEvent.click(await screen.findByRole("button", { name: "EN(Registrar pago)" }));
    await screen.findByText("EN(Monto)");

    expect(strings(screen.getByRole("dialog"))).toEqual([]);
    expect(screen.getByRole("combobox")).toHaveTextContent("EN(Transferencia)");
  });

  it("has no string left outside the catalogue in the new invoice dialog", async () => {
    const english = await createPseudoInstance("en");
    renderPage(english);
    fireEvent.click(screen.getByRole("button", { name: /EN\(Nueva factura\)/ }));
    await screen.findByText("EN(Fecha de emisión *)");

    expect(strings(screen.getByRole("dialog"))).toEqual([]);
  });
});
