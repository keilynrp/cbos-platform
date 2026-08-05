"""
Contracts module models.

A Contract is a legally-binding document between a workspace and a client.
It can be linked to a SalesOrder and/or an Opportunity, and it has an ordered
list of ContractClause sections.

Status machine:
    draft → sent → signed → executed
    Any non-terminal state → terminated
    executed (past end_date) → expired  (set by caller / future scanner)
"""
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Contract(Base):
    """A contract document linked to workspace, client, and optionally a sales order."""

    __tablename__ = "contracts"
    __table_args__ = (
        UniqueConstraint("workspace_id", "contract_number", name="uq_contracts_workspace_number"),
    )

    workspace_id: Mapped[str] = mapped_column(String, ForeignKey("workspaces.id"), index=True)

    # Human-readable number: CTR-2026-0001
    contract_number: Mapped[str] = mapped_column(String(30), index=True)

    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(String(30), default="draft", index=True)
    # draft | sent | signed | executed | expired | terminated

    # Financial
    value: Mapped[float | None] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="USD")

    # Validity window
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Status timestamps
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    signed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    executed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    terminated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships to other modules
    sales_order_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("sales_orders.id", ondelete="SET NULL"), nullable=True, index=True
    )
    opportunity_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("opportunities.id", ondelete="SET NULL"), nullable=True, index=True
    )
    contact_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("persons.id", ondelete="SET NULL"), nullable=True, index=True
    )
    organization_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    owner_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Ordered clauses
    clauses: Mapped[list["ContractClause"]] = relationship(
        "ContractClause",
        back_populates="contract",
        cascade="all, delete-orphan",
        order_by="ContractClause.clause_order",
    )


class ContractClause(Base):
    """An ordered clause / section within a contract."""

    __tablename__ = "contract_clauses"

    contract_id: Mapped[str] = mapped_column(
        String, ForeignKey("contracts.id", ondelete="CASCADE"), index=True
    )
    clause_order: Mapped[int] = mapped_column(Integer, default=0)
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text, default="")

    contract: Mapped["Contract"] = relationship("Contract", back_populates="clauses")
