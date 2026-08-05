from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Invoice(Base):
    """Factura emitida a un cliente."""

    __tablename__ = "invoices"

    workspace_id: Mapped[str] = mapped_column(String, ForeignKey("workspaces.id"), index=True)

    # Número legible: INV-2026-0001
    invoice_number: Mapped[str] = mapped_column(String(30), index=True)

    status: Mapped[str] = mapped_column(String(30), default="draft", index=True)
    # draft | sent | paid | partial | overdue | cancelled | void

    # Dates
    issue_date: Mapped[date] = mapped_column(Date)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Amounts
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    subtotal: Mapped[float] = mapped_column(Float, default=0.0)
    discount_amount: Mapped[float] = mapped_column(Float, default=0.0)
    tax_rate: Mapped[float] = mapped_column(Float, default=0.0)
    tax_amount: Mapped[float] = mapped_column(Float, default=0.0)
    total: Mapped[float] = mapped_column(Float, default=0.0)
    amount_paid: Mapped[float] = mapped_column(Float, default=0.0)
    amount_due: Mapped[float] = mapped_column(Float, default=0.0)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relations
    contact_id: Mapped[str | None] = mapped_column(String, ForeignKey("persons.id", ondelete="SET NULL"), nullable=True)
    organization_id: Mapped[str | None] = mapped_column(String, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)
    sales_order_id: Mapped[str | None] = mapped_column(String, ForeignKey("sales_orders.id", ondelete="SET NULL"), nullable=True, index=True)
    owner_id: Mapped[str | None] = mapped_column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    lines: Mapped[list["InvoiceLine"]] = relationship(
        "InvoiceLine", back_populates="invoice", cascade="all, delete-orphan", order_by="InvoiceLine.line_order"
    )
    payments: Mapped[list["Payment"]] = relationship(
        "Payment", back_populates="invoice", cascade="all, delete-orphan"
    )


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"

    invoice_id: Mapped[str] = mapped_column(String, ForeignKey("invoices.id", ondelete="CASCADE"), index=True)
    line_order: Mapped[int] = mapped_column(Integer, default=0)
    description: Mapped[str] = mapped_column(String(500))
    quantity: Mapped[float] = mapped_column(Float, default=1.0)
    unit_price: Mapped[float] = mapped_column(Float, default=0.0)
    discount_pct: Mapped[float] = mapped_column(Float, default=0.0)
    subtotal: Mapped[float] = mapped_column(Float, default=0.0)

    product_id: Mapped[str | None] = mapped_column(String, ForeignKey("inventory_items.id", ondelete="SET NULL"), nullable=True)

    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="lines")


class Payment(Base):
    """Registro de un pago recibido contra una factura."""

    __tablename__ = "payments"

    workspace_id: Mapped[str] = mapped_column(String, ForeignKey("workspaces.id"), index=True)
    invoice_id: Mapped[str] = mapped_column(String, ForeignKey("invoices.id", ondelete="CASCADE"), index=True)

    amount: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    method: Mapped[str] = mapped_column(String(50), default="transfer")
    # transfer | cash | card | check | crypto | other

    reference: Mapped[str | None] = mapped_column(String(200), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    payment_date: Mapped[date] = mapped_column(Date)

    recorded_by_id: Mapped[str | None] = mapped_column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="payments")


class CompanyProfile(Base):
    """Issuer identity used on invoices — one per workspace."""

    __tablename__ = "company_profiles"

    workspace_id: Mapped[str] = mapped_column(
        String, ForeignKey("workspaces.id"), unique=True, index=True
    )

    legal_name:   Mapped[str | None] = mapped_column(String(255), nullable=True)
    tax_id:       Mapped[str | None] = mapped_column(String(50),  nullable=True)
    tax_id_label: Mapped[str]        = mapped_column(String(20),  default="RFC")

    address_line: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city:         Mapped[str | None] = mapped_column(String(100), nullable=True)
    state:        Mapped[str | None] = mapped_column(String(100), nullable=True)
    postal_code:  Mapped[str | None] = mapped_column(String(20),  nullable=True)
    country:      Mapped[str | None] = mapped_column(String(100), nullable=True)

    email:   Mapped[str | None] = mapped_column(String(320), nullable=True)
    phone:   Mapped[str | None] = mapped_column(String(50),  nullable=True)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)

    logo_data_uri: Mapped[str | None] = mapped_column(Text, nullable=True)

    default_currency:    Mapped[str]        = mapped_column(String(10), default="USD")
    default_tax_rate:    Mapped[float]      = mapped_column(Float, default=0.0)
    invoice_footer_note: Mapped[str | None] = mapped_column(Text, nullable=True)
