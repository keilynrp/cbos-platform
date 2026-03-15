from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Lead(Base):
    """Prospecto entrante — aún no calificado como oportunidad."""

    __tablename__ = "leads"

    workspace_id: Mapped[str] = mapped_column(
        String, ForeignKey("workspaces.id"), index=True
    )
    # Datos del prospecto
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    company_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Clasificación
    source: Mapped[str] = mapped_column(String(50), default="manual")
    # manual | website | referral | social | cold_outreach | event | other
    status: Mapped[str] = mapped_column(String(50), default="new")
    # new | contacted | qualified | disqualified | converted

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relaciones con identity
    organization_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("organizations.id"), nullable=True, index=True
    )
    owner_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("users.id"), nullable=True, index=True
    )

    # Si se convierte, apunta a la oportunidad generada
    opportunity_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("opportunities.id"), nullable=True
    )

    # Relationships
    organization: Mapped[Optional["app.modules.identity.models.Organization"]] = relationship(  # type: ignore[name-defined]
        "Organization", foreign_keys=[organization_id]
    )
    opportunity: Mapped[Optional["Opportunity"]] = relationship(
        "Opportunity", foreign_keys=[opportunity_id], back_populates="source_lead"
    )
    activities: Mapped[list["Activity"]] = relationship(
        "Activity",
        primaryjoin="and_(Activity.entity_id == foreign(Lead.id), Activity.entity_type == 'lead')",
        viewonly=True,
    )


class Opportunity(Base):
    """Oportunidad de venta calificada en el pipeline."""

    __tablename__ = "opportunities"

    workspace_id: Mapped[str] = mapped_column(
        String, ForeignKey("workspaces.id"), index=True
    )

    title: Mapped[str] = mapped_column(String(255))
    stage: Mapped[str] = mapped_column(String(50), default="new", index=True)
    # new | qualified | proposal | negotiation | won | lost

    value: Mapped[float | None] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    probability: Mapped[int | None] = mapped_column(nullable=True)  # 0-100
    close_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    lost_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamps de cierre
    won_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    lost_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relaciones
    contact_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("persons.id"), nullable=True, index=True
    )
    organization_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("organizations.id"), nullable=True, index=True
    )
    owner_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("users.id"), nullable=True, index=True
    )

    # Relationships
    source_lead: Mapped[Optional["Lead"]] = relationship(
        "Lead", foreign_keys="Lead.opportunity_id", back_populates="opportunity"
    )
    activities: Mapped[list["Activity"]] = relationship(
        "Activity",
        primaryjoin="and_(Activity.entity_id == foreign(Opportunity.id), Activity.entity_type == 'opportunity')",
        viewonly=True,
    )


class Activity(Base):
    """Registro de actividad comercial — llamada, email, reunión, nota, tarea."""

    __tablename__ = "activities"

    workspace_id: Mapped[str] = mapped_column(
        String, ForeignKey("workspaces.id"), index=True
    )

    activity_type: Mapped[str] = mapped_column(String(50))
    # call | email | meeting | note | task

    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Entidad a la que está asociada (polimórfico simple)
    entity_type: Mapped[str] = mapped_column(String(50), index=True)
    # lead | opportunity
    entity_id: Mapped[str] = mapped_column(String, index=True)

    # Quién registró la actividad
    user_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("users.id"), nullable=True, index=True
    )

    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
