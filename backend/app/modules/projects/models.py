"""
Projects module models.

A Project represents a unit of work delivered to a client.
It can be linked to a Contract, SalesOrder, or Organization.

Status machine:
    planning → active, cancelled
    active   → on_hold, completed, cancelled
    on_hold  → active, cancelled
    completed → (terminal)
    cancelled → (terminal)

Task status:
    todo       → in_progress, cancelled
    in_progress→ done, todo, cancelled
    done       → todo  (reopenable)
    cancelled  → (terminal)
"""
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Project(Base):
    """A project delivered to a workspace client."""

    __tablename__ = "projects"
    __table_args__ = (
        UniqueConstraint("workspace_id", "project_number", name="uq_projects_workspace_number"),
    )

    workspace_id: Mapped[str] = mapped_column(String, ForeignKey("workspaces.id"), index=True)

    # Human-readable number: PRJ-2026-0001
    project_number: Mapped[str] = mapped_column(String(30), index=True)

    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(String(30), default="planning", index=True)
    # planning | active | on_hold | completed | cancelled

    # Budget
    budget: Mapped[float | None] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="USD")

    # Timeline
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Status timestamps
    activated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Cross-module links
    contract_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("contracts.id", ondelete="SET NULL"), nullable=True, index=True
    )
    sales_order_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("sales_orders.id", ondelete="SET NULL"), nullable=True, index=True
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

    # Tasks
    tasks: Mapped[list["ProjectTask"]] = relationship(
        "ProjectTask",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="ProjectTask.task_order",
    )


class ProjectTask(Base):
    """A task within a project."""

    __tablename__ = "project_tasks"

    project_id: Mapped[str] = mapped_column(
        String, ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    task_order: Mapped[int] = mapped_column(Integer, default=0)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="todo", index=True)
    # todo | in_progress | done | cancelled

    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    assignee_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    project: Mapped["Project"] = relationship("Project", back_populates="tasks")
