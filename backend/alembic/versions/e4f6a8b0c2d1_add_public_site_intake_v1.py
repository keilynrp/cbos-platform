"""add public site intake v1 tables

Revision ID: e4f6a8b0c2d1
Revises: b4f9e2a1c7d3
Create Date: 2026-05-13 16:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e4f6a8b0c2d1"
down_revision: Union[str, None] = "b4f9e2a1c7d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "public_sites",
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("site_slug", sa.String(length=100), nullable=False),
        sa.Column("domain", sa.String(length=255), nullable=True),
        sa.Column("api_key", sa.String(length=255), nullable=False),
        sa.Column("allowed_origins", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("api_key"),
        sa.UniqueConstraint("workspace_id", "site_slug", name="uq_public_sites_workspace_slug"),
    )
    op.create_index(op.f("ix_public_sites_api_key"), "public_sites", ["api_key"], unique=True)
    op.create_index(op.f("ix_public_sites_site_slug"), "public_sites", ["site_slug"], unique=False)
    op.create_index(op.f("ix_public_sites_workspace_id"), "public_sites", ["workspace_id"], unique=False)

    op.create_table(
        "public_lead_submissions",
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("site_slug", sa.String(length=100), nullable=False),
        sa.Column("idempotency_key", sa.String(length=255), nullable=False),
        sa.Column("request_hash", sa.String(length=64), nullable=False),
        sa.Column("lead_id", sa.String(), nullable=False),
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["lead_id"], ["leads.id"]),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "workspace_id", "site_slug", "idempotency_key",
            name="uq_public_lead_submissions_workspace_site_key",
        ),
    )
    op.create_index(
        op.f("ix_public_lead_submissions_idempotency_key"),
        "public_lead_submissions",
        ["idempotency_key"],
        unique=False,
    )
    op.create_index(
        op.f("ix_public_lead_submissions_lead_id"),
        "public_lead_submissions",
        ["lead_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_public_lead_submissions_site_slug"),
        "public_lead_submissions",
        ["site_slug"],
        unique=False,
    )
    op.create_index(
        op.f("ix_public_lead_submissions_workspace_id"),
        "public_lead_submissions",
        ["workspace_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_public_lead_submissions_workspace_id"), table_name="public_lead_submissions")
    op.drop_index(op.f("ix_public_lead_submissions_site_slug"), table_name="public_lead_submissions")
    op.drop_index(op.f("ix_public_lead_submissions_lead_id"), table_name="public_lead_submissions")
    op.drop_index(op.f("ix_public_lead_submissions_idempotency_key"), table_name="public_lead_submissions")
    op.drop_table("public_lead_submissions")

    op.drop_index(op.f("ix_public_sites_workspace_id"), table_name="public_sites")
    op.drop_index(op.f("ix_public_sites_site_slug"), table_name="public_sites")
    op.drop_index(op.f("ix_public_sites_api_key"), table_name="public_sites")
    op.drop_table("public_sites")
