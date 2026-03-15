from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Quote(Base):
    """Cotización formal enviada a un prospecto u organización."""

    __tablename__ = "quotes"

    workspace_id: Mapped[str] = mapped_column(
        String, ForeignKey("workspaces.id"), index=True
    )

    # Número legible único por workspace: Q-2026-0001
    quote_number: Mapped[str] = mapped_column(String(30), index=True)

    title: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(50), default="draft", index=True)
    # draft | sent | accepted | rejected | expired

    valid_until: Mapped[date | None] = mapped_column(Date, nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="USD")

    # Totales (se recalculan al guardar líneas)
    subtotal: Mapped[float] = mapped_column(Float, default=0.0)
    discount_amount: Mapped[float] = mapped_column(Float, default=0.0)
    tax_rate: Mapped[float] = mapped_column(Float, default=0.0)    # porcentaje, e.g. 16.0
    tax_amount: Mapped[float] = mapped_column(Float, default=0.0)
    total: Mapped[float] = mapped_column(Float, default=0.0)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    terms: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamps de estado
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relaciones
    opportunity_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("opportunities.id"), nullable=True, index=True
    )
    contact_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("persons.id"), nullable=True
    )
    organization_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("organizations.id"), nullable=True, index=True
    )
    owner_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("users.id"), nullable=True
    )

    # Relationships
    lines: Mapped[list["QuoteLine"]] = relationship(
        "QuoteLine", back_populates="quote", order_by="QuoteLine.line_order",
        cascade="all, delete-orphan"
    )
    sales_order: Mapped[Optional["SalesOrder"]] = relationship(
        "SalesOrder", back_populates="quote", uselist=False
    )

    __table_args__ = (
        UniqueConstraint("workspace_id", "quote_number", name="uq_quote_number_workspace"),
    )


class QuoteLine(Base):
    """Línea de item dentro de una cotización."""

    __tablename__ = "quote_lines"

    workspace_id: Mapped[str] = mapped_column(
        String, ForeignKey("workspaces.id"), index=True
    )
    quote_id: Mapped[str] = mapped_column(
        String, ForeignKey("quotes.id", ondelete="CASCADE"), index=True
    )

    line_order: Mapped[int] = mapped_column(Integer, default=1)
    description: Mapped[str] = mapped_column(Text)
    quantity: Mapped[float] = mapped_column(Float, default=1.0)
    unit_price: Mapped[float] = mapped_column(Float, default=0.0)
    discount_percent: Mapped[float] = mapped_column(Float, default=0.0)  # 0-100
    amount: Mapped[float] = mapped_column(Float, default=0.0)  # calculado

    # Referencia futura a producto del inventario
    product_id: Mapped[str | None] = mapped_column(String, nullable=True)

    # Relationship
    quote: Mapped["Quote"] = relationship("Quote", back_populates="lines")


class SalesOrder(Base):
    """Orden de venta generada cuando una cotización es aceptada."""

    __tablename__ = "sales_orders"

    workspace_id: Mapped[str] = mapped_column(
        String, ForeignKey("workspaces.id"), index=True
    )

    order_number: Mapped[str] = mapped_column(String(30), index=True)
    status: Mapped[str] = mapped_column(String(50), default="draft", index=True)
    # draft | confirmed | in_fulfillment | fulfilled | cancelled

    total: Mapped[float] = mapped_column(Float, default=0.0)
    currency: Mapped[str] = mapped_column(String(10), default="USD")

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    fulfilled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relaciones
    quote_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("quotes.id"), nullable=True, unique=True
    )
    opportunity_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("opportunities.id"), nullable=True, index=True
    )
    contact_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("persons.id"), nullable=True
    )
    organization_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("organizations.id"), nullable=True, index=True
    )
    owner_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("users.id"), nullable=True
    )

    # Relationships
    quote: Mapped[Optional["Quote"]] = relationship("Quote", back_populates="sales_order")

    __table_args__ = (
        UniqueConstraint("workspace_id", "order_number", name="uq_order_number_workspace"),
    )
