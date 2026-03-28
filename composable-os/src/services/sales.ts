// composable-os/src/services/sales.ts
import { api } from "@/lib/api";

// ── Types (aligned with backend QuoteRead / SalesOrderRead) ──────────────────

export interface QuoteLine {
  id: string;
  quote_id: string;
  line_order: number;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  amount: number;
  product_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: string;
  workspace_id: string;
  quote_number: string;
  title: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  currency: string;
  subtotal: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  valid_until: string | null;
  notes: string | null;
  terms: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  lines: QuoteLine[];
  contact_id: string | null;
  organization_id: string | null;
  opportunity_id: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesOrderLine {
  id: string;
  order_id: string;
  line_order: number;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  amount: number;
  product_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesOrder {
  id: string;
  workspace_id: string;
  order_number: string;
  status: "draft" | "confirmed" | "in_fulfillment" | "fulfilled" | "cancelled";
  currency: string;
  total: number;
  notes: string | null;
  confirmed_at: string | null;
  fulfilled_at: string | null;
  cancelled_at: string | null;
  lines: SalesOrderLine[];
  quote_id: string | null;
  contact_id: string | null;
  organization_id: string | null;
  opportunity_id: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateQuoteLineDto {
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  line_order: number;
  product_id?: string;
}

export interface CreateQuoteDto {
  title: string;
  currency?: string;
  tax_rate?: number;
  discount_amount?: number;
  valid_until?: string;
  notes?: string;
  terms?: string;
  contact_id?: string;
  organization_id?: string;
  opportunity_id?: string;
  lines?: CreateQuoteLineDto[];
}

export interface UpdateQuoteDto {
  title?: string;
  currency?: string;
  tax_rate?: number;
  discount_amount?: number;
  valid_until?: string;
  notes?: string;
  terms?: string;
}

// ── Service ──────────────────────────────────────────────────────────────────

export const salesService = {
  // Quotes
  getQuotes: (params?: { status?: string; opportunity_id?: string }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => v != null) as [string, string][]
    ).toString();
    return api.get<Quote[]>(`/sales/quotes${qs ? `?${qs}` : ""}`);
  },
  getQuote: (id: string) => api.get<Quote>(`/sales/quotes/${id}`),
  createQuote: (dto: CreateQuoteDto) => api.post<Quote>("/sales/quotes", dto),
  updateQuote: (id: string, dto: UpdateQuoteDto) =>
    api.patch<Quote>(`/sales/quotes/${id}`, dto),
  sendQuote: (id: string) => api.patch<Quote>(`/sales/quotes/${id}/send`, {}),
  acceptQuote: (id: string) =>
    api.patch<SalesOrder>(`/sales/quotes/${id}/accept`, {}),
  rejectQuote: (id: string, reason?: string) =>
    api.patch<Quote>(`/sales/quotes/${id}/reject`, { reason }),
  addLine: (quoteId: string, dto: CreateQuoteLineDto) =>
    api.post<Quote>(`/sales/quotes/${quoteId}/lines`, dto),
  removeLine: (quoteId: string, lineId: string) =>
    api.delete(`/sales/quotes/${quoteId}/lines/${lineId}`),
  getQuotePdfUrl: (id: string) => `/api/v1/sales/quotes/${id}/pdf`,

  // Orders
  getOrders: (params?: { status?: string }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => v != null) as [string, string][]
    ).toString();
    return api.get<SalesOrder[]>(`/sales/orders${qs ? `?${qs}` : ""}`);
  },
  getOrder: (id: string) => api.get<SalesOrder>(`/sales/orders/${id}`),
  confirmOrder: (id: string) =>
    api.patch<SalesOrder>(`/sales/orders/${id}/confirm`, {}),
  startFulfillment: (id: string) =>
    api.patch<SalesOrder>(`/sales/orders/${id}/start-fulfillment`, {}),
  fulfillOrder: (id: string) =>
    api.patch<SalesOrder>(`/sales/orders/${id}/fulfill`, {}),
  cancelOrder: (id: string) =>
    api.patch<SalesOrder>(`/sales/orders/${id}/cancel`, {}),
};
