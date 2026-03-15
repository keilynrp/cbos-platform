from datetime import datetime

from pydantic import BaseModel, Field


# ── ProductCategory ──────────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str
    slug: str = Field(..., pattern=r"^[a-z0-9-]+$")
    description: str | None = None
    parent_id: str | None = None


class CategoryRead(BaseModel):
    id: str
    workspace_id: str
    name: str
    slug: str
    description: str | None
    parent_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Product ──────────────────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    sku: str
    name: str
    description: str | None = None
    category_id: str | None = None
    unit: str = "pcs"
    unit_price: float = Field(default=0.0, ge=0)
    cost_price: float = Field(default=0.0, ge=0)
    is_service: bool = False
    min_stock: float = Field(default=0.0, ge=0)


class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    category_id: str | None = None
    unit: str | None = None
    unit_price: float | None = Field(default=None, ge=0)
    cost_price: float | None = Field(default=None, ge=0)
    is_service: bool | None = None
    is_active: bool | None = None
    min_stock: float | None = Field(default=None, ge=0)


class ProductRead(BaseModel):
    id: str
    workspace_id: str
    sku: str
    name: str
    description: str | None
    category_id: str | None
    unit: str
    unit_price: float
    cost_price: float
    is_service: bool
    is_active: bool
    min_stock: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── InventoryItem ─────────────────────────────────────────────────────────────

class InventoryItemRead(BaseModel):
    id: str
    workspace_id: str
    product_id: str
    location: str
    current_stock: float
    reserved_stock: float
    available_stock: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class StockLevel(BaseModel):
    """Stock summary per product — agregado de todas las ubicaciones."""
    product_id: str
    sku: str
    name: str
    unit: str
    min_stock: float
    total_current: float
    total_reserved: float
    total_available: float
    is_low_stock: bool
    locations: list[InventoryItemRead]


# ── StockMovement ─────────────────────────────────────────────────────────────

class MovementCreate(BaseModel):
    product_id: str
    movement_type: str  # in | out | adjustment
    quantity: float = Field(..., gt=0)
    location: str = "main"
    reference_type: str | None = None
    reference_id: str | None = None
    notes: str | None = None


class ReserveRequest(BaseModel):
    product_id: str
    quantity: float = Field(..., gt=0)
    location: str = "main"
    reference_type: str | None = "sales_order"
    reference_id: str | None = None
    notes: str | None = None


class ReleaseRequest(BaseModel):
    product_id: str
    quantity: float = Field(..., gt=0)
    location: str = "main"
    reference_id: str | None = None
    notes: str | None = None


class MovementRead(BaseModel):
    id: str
    workspace_id: str
    product_id: str
    inventory_item_id: str
    movement_type: str
    quantity: float
    stock_before: float
    stock_after: float
    reference_type: str | None
    reference_id: str | None
    notes: str | None
    user_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Auto-reserve from SalesOrder ─────────────────────────────────────────────

class OrderLineReserve(BaseModel):
    product_id: str
    quantity: float
    location: str = "main"


class OrderReserveRequest(BaseModel):
    order_id: str
    lines: list[OrderLineReserve]


class OrderReserveResult(BaseModel):
    order_id: str
    reserved: list[str]     # product_ids successfully reserved
    failed: list[str]       # product_ids with insufficient stock
    partial: bool           # True if some lines failed
