import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────
export interface Product {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  unit_price: number;
  currency: string;
  product_type: string;
  is_active: boolean;
  created_at: string;
}

export interface QuoteItem {
  product_id: string;
  product_name?: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount_pct: number;
  total: number;
}

export interface Quote {
  id: string;
  quote_number: string;
  title: string;
  status: string;
  contact_id: string | null;
  contact_name?: string;
  organization_id: string | null;
  organization_name?: string;
  opportunity_id: string | null;
  items: QuoteItem[];
  subtotal: number;
  discount_pct: number;
  tax_pct: number;
  total: number;
  currency: string;
  valid_until: string | null;
  notes: string | null;
  created_at: string;
}

export interface SalesOrder {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  quote_id: string | null;
  quote_number?: string;
  contact_id: string | null;
  contact_name?: string;
  organization_id: string | null;
  organization_name?: string;
  items: QuoteItem[];
  subtotal: number;
  total: number;
  currency: string;
  notes: string | null;
  created_at: string;
}

export interface CreateQuoteDto {
  title: string;
  contact_id?: string;
  organization_id?: string;
  opportunity_id?: string;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
    discount_pct?: number;
    description?: string;
  }>;
  discount_pct?: number;
  tax_pct?: number;
  valid_until?: string;
  notes?: string;
}

export interface CreateProductDto {
  name: string;
  description?: string;
  sku?: string;
  unit_price: number;
  currency?: string;
  product_type?: string;
}

// ── API ────────────────────────────────────────────────────────────────────
export const salesService = {
  // Products
  getProducts: () => api.get<Product[]>("/sales/products"),
  createProduct: (dto: CreateProductDto) => api.post<Product>("/sales/products", dto),

  // Quotes
  getQuotes: () => api.get<Quote[]>("/sales/quotes"),
  getQuote: (id: string) => api.get<Quote>(`/sales/quotes/${id}`),
  createQuote: (dto: CreateQuoteDto) => api.post<Quote>("/sales/quotes", dto),
  updateQuote: (id: string, dto: Partial<CreateQuoteDto & { status: string }>) =>
    api.patch<Quote>(`/sales/quotes/${id}`, dto),
  deleteQuote: (id: string) => api.delete(`/sales/quotes/${id}`),

  // Sales Orders
  getOrders: () => api.get<SalesOrder[]>("/sales/orders"),
  getOrder: (id: string) => api.get<SalesOrder>(`/sales/orders/${id}`),
  createOrder: (dto: { quote_id?: string; notes?: string }) =>
    api.post<SalesOrder>("/sales/orders", dto),
  updateOrder: (id: string, dto: { status?: string; payment_status?: string }) =>
    api.patch<SalesOrder>(`/sales/orders/${id}`, dto),
};
