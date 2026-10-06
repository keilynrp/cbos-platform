import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import i18next, { type i18n as I18n } from "i18next";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { buildI18nOptions, resources } from "@/i18n";
import { formatDate } from "@/i18n/format";
import Invoicing from "@/pages/Invoicing";
import { renderPageWithI18n } from "@/test/i18n";

/**
 * `invoicing` en el ingles *real* (tarea 12 del plan de i18n): la lista de facturas, el
 * detalle, el registro de pagos y el alta con el catalogo `en` que se envia. Los
 * estados salen del `en` de `common`.
 */

const svc = vi.hoisted(() => ({
  getSummary: vi.fn(), listInvoices: vi.fn(), getInvoice: vi.fn(), createInvoice: vi.fn(),
  updateInvoice: vi.fn(), deleteInvoice: vi.fn(), recordPayment: vi.fn(),
}));
const toast = vi.hoisted(() => vi.fn());

vi.mock("@/services/accounting", () => ({ accountingService: svc }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

async function english(): Promise<I18n> {
  const instance = i18next.createInstance();
  await instance.init(buildI18nOptions(resources, "en"));
  return instance;
}

const item = (over: Record<string, unknown> = {}) => ({
  id: "i1", invoice_number: "INV-001", status: "draft", issue_date: "2026-03-05", due_date: "2026-04-05",
  total: 1160, amount_due: 1160, currency: "USD", organization_id: null, contact_id: null, created_at: "", ...over,
});
const full = (over: Record<string, unknown> = {}) => ({
  ...item(), workspace_id: "w1", paid_at: null, subtotal: 1000, discount_amount: 0, tax_rate: 16, tax_amount: 160,
  amount_paid: 0, notes: "Net 30", sales_order_id: null, owner_id: null, updated_at: "",
  lines: [{
    id: "l1", invoice_id: "i1", line_order: 0, description: "Design service", quantity: 2, unit_price: 500,
    discount_pct: 0, subtotal: 1000, product_id: null, created_at: "",
  }],
  ...over,
});
const summary = (over: Record<string, unknown> = {}) => ({
  total_invoiced: 10000, total_paid: 4000, total_outstanding: 6000, overdue_count: 1, overdue_amount: 500,
  draft_count: 3, sent_count: 2, paid_count: 1, ...over,
});

const renderPage = (instance: I18n) => renderPageWithI18n(<Invoicing />, instance);
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

describe("Invoicing in English", () => {
  it("renders the header, the KPIs and the table", async () => {
    renderPage(await english());

    expect(screen.getByRole("heading", { name: "Invoicing" })).toBeInTheDocument();
    expect(screen.getByText("Manage invoices, payments and accounts receivable")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Billing details/ })).toHaveAttribute("href", "/settings/company");
    expect(await screen.findByText("INV-001")).toBeInTheDocument();

    for (const text of ["Total invoiced", "Collected"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    for (const col of ["Number", "Status", "Issued", "Due", "Total", "Receivable"]) {
      expect(screen.getAllByRole("columnheader", { name: col }).length).toBeGreaterThan(0);
    }
    expect(screen.queryByText("Facturación")).not.toBeInTheDocument();
  });

  it("agrees the KPI counts in the singular and the plural", async () => {
    renderPage(await english());
    expect(await screen.findByText("1 paid invoice")).toBeInTheDocument();
    expect(screen.getByText("2 in progress")).toBeInTheDocument();
    expect(screen.getByText("3 drafts")).toBeInTheDocument();
    expect(screen.getByText("1 invoice")).toBeInTheDocument();
  });

  it("pluralises the KPI counts", async () => {
    svc.getSummary.mockResolvedValue(summary({ paid_count: 5, draft_count: 1, overdue_count: 0 }));
    renderPage(await english());

    expect(await screen.findByText("5 paid invoices")).toBeInTheDocument();
    expect(screen.getByText("1 draft")).toBeInTheDocument();
    expect(screen.getByText("0 invoices")).toBeInTheDocument();
  });

  it("translates the status of each invoice and of each filter", async () => {
    renderPage(await english());
    await screen.findByText("INV-001");

    for (const tab of ["All", "Draft", "Sent", "Partial", "Paid", "Overdue"]) {
      expect(screen.getByRole("tab", { name: tab })).toBeInTheDocument();
    }
    const rows = screen.getAllByRole("row");
    expect(within(rows[1]).getByText("Draft")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Sent")).toBeInTheDocument();
    expect(within(rows[3]).getByText("Overdue")).toBeInTheDocument();
  });

  it("filters by status", async () => {
    renderPage(await english());
    await screen.findByText("INV-001");

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Sent" }), { button: 0 });

    await waitFor(() => expect(svc.listInvoices).toHaveBeenLastCalledWith("sent"));
  });

  it("explains an empty list", async () => {
    svc.listInvoices.mockResolvedValue([]);
    renderPage(await english());

    expect(await screen.findByText("No invoices. Create the first one.")).toBeInTheDocument();
  });

  it("deletes a draft from the row menu and confirms", async () => {
    renderPage(await english());
    openMenu((await screen.findByText("INV-001")).closest("tr")!);
    fireEvent.click(await screen.findByRole("menuitem", { name: /Delete/ }));

    await waitFor(() => expect(svc.deleteInvoice).toHaveBeenCalledWith("i1"));
    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Invoice deleted" }));
  });

  it("explains a refused deletion", async () => {
    svc.deleteInvoice.mockRejectedValue(new Error(""));
    renderPage(await english());
    openMenu((await screen.findByText("INV-001")).closest("tr")!);
    fireEvent.click(await screen.findByRole("menuitem", { name: /Delete/ }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Cannot delete", variant: "destructive" })),
    );
  });

  it("shows the detail with the dates formatted for English, the lines and the totals", async () => {
    renderPage(await english());
    await selectRow();

    expect(await screen.findByText(/^Issued /)).toHaveTextContent(
      `Issued ${formatDate("2026-03-05", "en")} · Due ${formatDate("2026-04-05", "en")}`,
    );
    for (const text of ["Paid", "Amount due", "Invoice lines", "Notes"]) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
    expect(screen.getByText("Design service")).toBeInTheDocument();
    expect(screen.getByText("Tax (16%)")).toBeInTheDocument();
    expect(screen.getByText("Net 30")).toBeInTheDocument();
  });

  it("marks a draft as sent and confirms", async () => {
    renderPage(await english());
    await selectRow();
    fireEvent.click(await screen.findByRole("button", { name: /Mark as sent/ }));

    await waitFor(() => expect(svc.updateInvoice).toHaveBeenCalledWith("i1", { status: "sent" }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Status updated" }));
  });

  it("records a payment on a sent invoice and confirms", async () => {
    svc.getInvoice.mockResolvedValue(full({ id: "i2", invoice_number: "INV-002", status: "sent", amount_due: 400, total: 400 }));
    renderPage(await english());
    await selectRow("INV-002");
    fireEvent.click(await screen.findByRole("button", { name: /Record payment/ }));

    expect(await screen.findByText("Amount")).toBeInTheDocument();
    for (const text of ["Method", "Reference", "Payment date"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.getByPlaceholderText("Transfer or check no.…")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(svc.recordPayment).toHaveBeenCalledWith("i2", expect.objectContaining({ amount: 400, method: "transfer" })));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith({
        title: "Payment recorded",
        description: expect.stringMatching(/ recorded successfully$/),
      }),
    );
  });

  it("lists the payment methods in English", async () => {
    svc.getInvoice.mockResolvedValue(full({ status: "sent", amount_due: 400 }));
    renderPage(await english());
    await selectRow();
    fireEvent.click(await screen.findByRole("button", { name: /Record payment/ }));
    await screen.findByText("Amount");

    expect(screen.getByRole("combobox")).toHaveTextContent("Transfer");
    // jsdom no rellena `pointerType`, que Radix exige para abrir con el raton: se abre con el teclado.
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });
    for (const method of ["Cash", "Card", "Check", "Cryptocurrency", "Other"]) {
      expect(await screen.findByRole("option", { name: method })).toBeInTheDocument();
    }
  });

  it("creates an invoice and confirms", async () => {
    renderPage(await english());
    fireEvent.click(screen.getByRole("button", { name: /New invoice/ }));

    expect(await screen.findByText("Issue date *")).toBeInTheDocument();
    for (const text of ["Due date", "Currency", "Tax (%)", "Lines", "Internal notes", "Subtotal"]) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
    fireEvent.change(screen.getByPlaceholderText("Product or service description"), {
      target: { value: "Design service" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create invoice/ }));

    await waitFor(() => expect(svc.createInvoice).toHaveBeenCalled());
    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Invoice created" }));
  });

  it("adds and removes a line in the new invoice", async () => {
    renderPage(await english());
    fireEvent.click(screen.getByRole("button", { name: /New invoice/ }));
    await screen.findByText("Issue date *");

    expect(screen.getByRole("button", { name: "Remove line" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Add/ }));
    const remove = screen.getAllByRole("button", { name: "Remove line" });
    expect(remove).toHaveLength(2);
    fireEvent.click(remove[0]);

    expect(screen.getAllByPlaceholderText("Product or service description")).toHaveLength(1);
  });
});
