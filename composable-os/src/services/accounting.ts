import { api } from "@/lib/api";

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  line_order: number;
  description: string;
  quantity: number;
  unit_price: number;
  discount_pct: number;
  subtotal: number;
  product_id: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  workspace_id: string;
  invoice_number: string;
  status: "draft" | "sent" | "paid" | "partial" | "overdue" | "cancelled" | "void";
  issue_date: string;
  due_date: string | null;
  paid_at: string | null;
  currency: string;
  subtotal: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  amount_due: number;
  notes: string | null;
  contact_id: string | null;
  organization_id: string | null;
  sales_order_id: string | null;
  owner_id: string | null;
  lines: InvoiceLine[];
  created_at: string;
  updated_at: string;
}

export interface InvoiceListItem {
  id: string;
  invoice_number: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  total: number;
  amount_due: number;
  currency: string;
  organization_id: string | null;
  contact_id: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  workspace_id: string;
  amount: number;
  currency: string;
  method: string;
  reference: string | null;
  notes: string | null;
  payment_date: string;
  recorded_by_id: string | null;
  created_at: string;
}

export interface AccountingSummary {
  total_invoiced: number;
  total_paid: number;
  total_outstanding: number;
  overdue_count: number;
  overdue_amount: number;
  draft_count: number;
  sent_count: number;
  paid_count: number;
}

export interface CreateInvoiceLineDto {
  description: string;
  quantity: number;
  unit_price: number;
  discount_pct?: number;
  product_id?: string;
  line_order?: number;
}

export interface CreateInvoiceDto {
  issue_date: string;
  due_date?: string;
  currency?: string;
  tax_rate?: number;
  discount_amount?: number;
  notes?: string;
  contact_id?: string;
  organization_id?: string;
  sales_order_id?: string;
  lines?: CreateInvoiceLineDto[];
}

export interface UpdateInvoiceDto {
  status?: string;
  due_date?: string;
  notes?: string;
  tax_rate?: number;
  discount_amount?: number;
}

export interface RecordPaymentDto {
  amount: number;
  method?: string;
  reference?: string;
  notes?: string;
  payment_date: string;
  currency?: string;
}

export interface CompanyProfile {
  id: string;
  workspace_id: string;
  legal_name: string | null;
  tax_id: string | null;
  tax_id_label: string;
  address_line: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  logo_data_uri: string | null;
  default_currency: string;
  default_tax_rate: number;
  invoice_footer_note: string | null;
  created_at: string;
  updated_at: string;
}

export type UpdateCompanyProfileDto = Partial<
  Omit<CompanyProfile, "id" | "workspace_id" | "created_at" | "updated_at">
>;

export const accountingService = {
  getSummary: () =>
    api.get<AccountingSummary>("/accounting/summary"),

  listInvoices: (status?: string) =>
    api.get<InvoiceListItem[]>(`/accounting/invoices${status ? `?status=${status}` : ""}`),

  getInvoice: (id: string) =>
    api.get<Invoice>(`/accounting/invoices/${id}`),

  createInvoice: (dto: CreateInvoiceDto) =>
    api.post<Invoice>("/accounting/invoices", dto),

  updateInvoice: (id: string, dto: UpdateInvoiceDto) =>
    api.patch<Invoice>(`/accounting/invoices/${id}`, dto),

  deleteInvoice: (id: string) =>
    api.delete(`/accounting/invoices/${id}`),

  listPayments: (invoiceId: string) =>
    api.get<Payment[]>(`/accounting/invoices/${invoiceId}/payments`),

  recordPayment: (invoiceId: string, dto: RecordPaymentDto) =>
    api.post<Payment>(`/accounting/invoices/${invoiceId}/payments`, dto),

  getCompanyProfile: () =>
    api.get<CompanyProfile>("/accounting/company-profile"),

  updateCompanyProfile: (dto: UpdateCompanyProfileDto) =>
    api.put<CompanyProfile>("/accounting/company-profile", dto),
};
