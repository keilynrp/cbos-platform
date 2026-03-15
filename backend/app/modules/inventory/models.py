from sqlalchemy import Boolean, Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ProductCategory(Base):
    """Categoría jerárquica de productos."""

    __tablename__ = "product_categories"

    workspace_id: Mapped[str] = mapped_column(
        String, ForeignKey("workspaces.id"), index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    parent_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("product_categories.id"), nullable=True, index=True
    )

    # Relationships
    products: Mapped[list["Product"]] = relationship("Product", back_populates="category")
    children: Mapped[list["ProductCategory"]] = relationship(
        "ProductCategory", back_populates="parent"
    )
    parent: Mapped["ProductCategory | None"] = relationship(
        "ProductCategory", back_populates="children", remote_side="ProductCategory.id"
    )

    __table_args__ = (
        UniqueConstraint("workspace_id", "slug", name="uq_category_slug_workspace"),
    )


class Product(Base):
    """Item del catálogo — producto físico o servicio."""

    __tablename__ = "products"

    workspace_id: Mapped[str] = mapped_column(
        String, ForeignKey("workspaces.id"), index=True
    )
    category_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("product_categories.id"), nullable=True, index=True
    )

    sku: Mapped[str] = mapped_column(String(100), index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    unit: Mapped[str] = mapped_column(String(30), default="pcs")
    # pcs | kg | L | m | hr | day | month

    unit_price: Mapped[float] = mapped_column(Float, default=0.0)
    cost_price: Mapped[float] = mapped_column(Float, default=0.0)

    is_service: Mapped[bool] = mapped_column(Boolean, default=False)
    # Servicios no necesitan tracking de stock
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Umbral de alerta de stock bajo
    min_stock: Mapped[float] = mapped_column(Float, default=0.0)

    # Relationships
    category: Mapped["ProductCategory | None"] = relationship(
        "ProductCategory", back_populates="products"
    )
    inventory_items: Mapped[list["InventoryItem"]] = relationship(
        "InventoryItem", back_populates="product", cascade="all, delete-orphan"
    )
    stock_movements: Mapped[list["StockMovement"]] = relationship(
        "StockMovement", back_populates="product"
    )

    __table_args__ = (
        UniqueConstraint("workspace_id", "sku", name="uq_product_sku_workspace"),
    )


class InventoryItem(Base):
    """Nivel de stock de un producto en una ubicación."""

    __tablename__ = "inventory_items"

    workspace_id: Mapped[str] = mapped_column(
        String, ForeignKey("workspaces.id"), index=True
    )
    product_id: Mapped[str] = mapped_column(
        String, ForeignKey("products.id"), index=True
    )
    location: Mapped[str] = mapped_column(String(100), default="main")
    # main | warehouse-a | pos-1 | etc.

    current_stock: Mapped[float] = mapped_column(Float, default=0.0)
    reserved_stock: Mapped[float] = mapped_column(Float, default=0.0)
    # available = current_stock - reserved_stock (computed at read)

    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="inventory_items")

    __table_args__ = (
        UniqueConstraint(
            "workspace_id", "product_id", "location",
            name="uq_inventory_product_location"
        ),
    )

    @property
    def available_stock(self) -> float:
        return round(self.current_stock - self.reserved_stock, 4)


class StockMovement(Base):
    """Registro auditado de cada movimiento de inventario."""

    __tablename__ = "stock_movements"

    workspace_id: Mapped[str] = mapped_column(
        String, ForeignKey("workspaces.id"), index=True
    )
    product_id: Mapped[str] = mapped_column(
        String, ForeignKey("products.id"), index=True
    )
    inventory_item_id: Mapped[str] = mapped_column(
        String, ForeignKey("inventory_items.id"), index=True
    )

    movement_type: Mapped[str] = mapped_column(String(50), index=True)
    # in | out | reserve | release | adjustment

    quantity: Mapped[float] = mapped_column(Float)
    # Positivo = entrada, negativo = salida
    # Para reserve/release, la magnitud es la cantidad reservada/liberada

    stock_before: Mapped[float] = mapped_column(Float, default=0.0)
    stock_after: Mapped[float] = mapped_column(Float, default=0.0)

    # Trazabilidad — qué orden/documento originó el movimiento
    reference_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # sales_order | purchase | manual | adjustment
    reference_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("users.id"), nullable=True
    )

    # Relationship
    product: Mapped["Product"] = relationship("Product", back_populates="stock_movements")
