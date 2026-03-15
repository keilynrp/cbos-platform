import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────
export interface InventoryItem {
  id: string;
  product_id: string;
  product_name?: string;
  sku: string | null;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  reorder_point: number;
  reorder_quantity: number;
  unit_cost: number;
  location: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  inventory_item_id: string;
  product_name?: string;
  movement_type: string;
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreateMovementDto {
  inventory_item_id: string;
  movement_type: "in" | "out" | "adjustment" | "reservation" | "release";
  quantity: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
}

// ── API ────────────────────────────────────────────────────────────────────
export const inventoryService = {
  // Items
  getItems: () => api.get<InventoryItem[]>("/inventory/items"),
  getItem: (id: string) => api.get<InventoryItem>(`/inventory/items/${id}`),
  updateItem: (id: string, dto: Partial<InventoryItem>) =>
    api.patch<InventoryItem>(`/inventory/items/${id}`, dto),

  // Movements
  getMovements: (itemId?: string) =>
    api.get<StockMovement[]>(itemId ? `/inventory/movements?item_id=${itemId}` : "/inventory/movements"),
  createMovement: (dto: CreateMovementDto) =>
    api.post<StockMovement>("/inventory/movements", dto),
};
