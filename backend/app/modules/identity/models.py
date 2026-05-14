from sqlalchemy import String, Boolean, Text, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Workspace(Base):
    """Tenant — unidad de aislamiento para cada cliente."""

    __tablename__ = "workspaces"

    name: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    plan: Mapped[str] = mapped_column(String(50), default="starter")
    active_modules: Mapped[list] = mapped_column(JSON, default=list)
    feature_flags: Mapped[dict] = mapped_column(JSON, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    users: Mapped[list["User"]] = relationship("User", back_populates="workspace")
    organizations: Mapped[list["Organization"]] = relationship(
        "Organization", back_populates="workspace"
    )
    public_sites: Mapped[list["PublicSite"]] = relationship(
        "PublicSite", back_populates="workspace"
    )


class Person(Base):
    """Individuo — base para usuarios, contactos y clientes."""

    __tablename__ = "persons"

    workspace_id: Mapped[str] = mapped_column(
        String, ForeignKey("workspaces.id"), index=True
    )
    full_name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(320), index=True)
    phone: Mapped[str | None] = mapped_column(String(50))
    role_labels: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(50), default="active")

    # Relationship
    user: Mapped["User | None"] = relationship("User", back_populates="person")


class User(Base):
    """Usuario autenticado con acceso al sistema."""

    __tablename__ = "users"

    workspace_id: Mapped[str] = mapped_column(
        String, ForeignKey("workspaces.id"), index=True
    )
    person_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("persons.id"), nullable=True
    )
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(String(50), default="member")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_owner: Mapped[bool] = mapped_column(Boolean, default=False)
    notification_preferences: Mapped[dict] = mapped_column(
        JSON, default=lambda: {"email_enabled": True, "email_events": {}},
    )

    # Relationships
    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="users")
    person: Mapped["Person | None"] = relationship("Person", back_populates="user")


class Organization(Base):
    """Empresa, institución o cuenta del sistema."""

    __tablename__ = "organizations"

    workspace_id: Mapped[str] = mapped_column(
        String, ForeignKey("workspaces.id"), index=True
    )
    legal_name: Mapped[str] = mapped_column(String(255))
    brand_name: Mapped[str | None] = mapped_column(String(255))
    org_type: Mapped[str] = mapped_column(String(50), default="customer")
    industry: Mapped[str | None] = mapped_column(String(100))
    country: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(50), default="active")

    # Relationship
    workspace: Mapped["Workspace"] = relationship(
        "Workspace", back_populates="organizations"
    )


class PublicSite(Base):
    """Approved external site allowed to submit public requests into CBOS."""

    __tablename__ = "public_sites"
    __table_args__ = (
        UniqueConstraint("workspace_id", "site_slug", name="uq_public_sites_workspace_slug"),
    )

    workspace_id: Mapped[str] = mapped_column(
        String, ForeignKey("workspaces.id"), index=True
    )
    site_slug: Mapped[str] = mapped_column(String(100), index=True)
    domain: Mapped[str | None] = mapped_column(String(255), nullable=True)
    api_key: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    allowed_origins: Mapped[list[str]] = mapped_column(JSON, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    workspace: Mapped["Workspace"] = relationship(
        "Workspace", back_populates="public_sites"
    )
