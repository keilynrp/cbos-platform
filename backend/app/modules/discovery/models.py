from sqlalchemy import String, Text, JSON, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DiscoverySession(Base):
    """Sesión de discovery con el AI assistant."""
    __tablename__ = "discovery_sessions"

    workspace_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    actor_id: Mapped[str | None] = mapped_column(String(36), nullable=True)  # None = público

    # Estado de la sesión
    status: Mapped[str] = mapped_column(String(30), default="active")
    # active | completed | abandoned

    # Contexto acumulado
    business_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    industry: Mapped[str | None] = mapped_column(String(100), nullable=True)
    company_size: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # nano (<5), small (5-20), medium (20-100), large (100+)

    # Resultado
    detected_pain_points: Mapped[list | None] = mapped_column(JSON, nullable=True)
    matched_capabilities: Mapped[list | None] = mapped_column(JSON, nullable=True)
    recommended_package: Mapped[str | None] = mapped_column(String(50), nullable=True)
    blueprint: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Relación con mensajes
    messages: Mapped[list["DiscoveryMessage"]] = relationship(
        "DiscoveryMessage",
        back_populates="session",
        order_by="DiscoveryMessage.created_at",
        lazy="selectin",
    )


class DiscoveryMessage(Base):
    """Mensaje en la conversación de discovery."""
    __tablename__ = "discovery_messages"

    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("discovery_sessions.id"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(20))  # user | assistant | system
    content: Mapped[str] = mapped_column(Text)
    token_count: Mapped[int | None] = mapped_column(Integer, nullable=True)

    session: Mapped["DiscoverySession"] = relationship(
        "DiscoverySession", back_populates="messages"
    )
