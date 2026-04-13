"""
HR module models.

Department — team grouping within a workspace.
Employee — a team member record, standalone (no FK to persons).

Employee status machine:
    active    → on_leave, terminated
    on_leave  → active, terminated
    terminated → (terminal)
"""
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Department(Base):
    """An organisational department / team within a workspace."""

    __tablename__ = "departments"

    workspace_id: Mapped[str] = mapped_column(String, ForeignKey("workspaces.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    employees: Mapped[list["Employee"]] = relationship(
        "Employee",
        back_populates="department",
        foreign_keys="Employee.department_id",
        lazy="noload",
    )


class Employee(Base):
    """A team member / employee record."""

    __tablename__ = "employees"

    workspace_id: Mapped[str] = mapped_column(String, ForeignKey("workspaces.id"), index=True)

    # Human-readable number: EMP-2026-0001
    employee_number: Mapped[str] = mapped_column(String(30), index=True)

    # Personal info (standalone, not linked to persons table for module independence)
    full_name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Employment
    status: Mapped[str] = mapped_column(String(30), default="active", index=True)
    # active | on_leave | terminated

    employment_type: Mapped[str] = mapped_column(String(30), default="full_time")
    # full_time | part_time | contractor | intern

    position: Mapped[str | None] = mapped_column(String(255), nullable=True)  # job title

    department_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("departments.id"), nullable=True, index=True
    )

    # Timeline
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Status timestamps
    on_leave_since: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    terminated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Compensation
    salary: Mapped[float | None] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="USD")

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    department: Mapped["Department | None"] = relationship(
        "Department",
        back_populates="employees",
        foreign_keys=[department_id],
    )
