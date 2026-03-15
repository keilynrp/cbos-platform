from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PortalSession(Base):
    """Sesión de acceso público para que un cliente vea y acepte una cotización."""

    __tablename__ = "portal_sessions"

    workspace_id: Mapped[str] = mapped_column(
        String, ForeignKey("workspaces.id"), index=True
    )
    quote_id: Mapped[str] = mapped_column(
        String, ForeignKey("quotes.id"), index=True
    )

    # Token de acceso público — URL-safe, 43 chars, alto entropy
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)

    # Expiry
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    # Lifecycle
    accessed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )  # primer GET del cliente
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )  # cuando tomó acción
    action: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # accepted | rejected

    # Datos del cliente (opcionales, para audit trail)
    client_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    client_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    client_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Quién generó el link
    created_by_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("users.id"), nullable=True
    )
