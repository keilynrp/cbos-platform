"""quote_line_and_events

Revision ID: b4f9e2a1c7d3
Revises: c3e6a9d2f1b8
Create Date: 2026-05-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b4f9e2a1c7d3'
down_revision: Union[str, None] = 'c3e6a9d2f1b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── New columns on quote_lines ────────────────────────────────────────
    op.add_column('quote_lines', sa.Column('sku', sa.String(100), nullable=True))
    op.add_column('quote_lines', sa.Column('unit', sa.String(50), nullable=True))
    op.add_column('quote_lines', sa.Column('tax_percent', sa.Float(), nullable=False, server_default='0'))
    op.add_column('quote_lines', sa.Column('notes', sa.Text(), nullable=True))

    # ── New table: quote_events ───────────────────────────────────────────
    op.create_table(
        'quote_events',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('workspace_id', sa.String(), nullable=False),
        sa.Column('quote_id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['quote_id'], ['quotes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_quote_events_quote_id', 'quote_events', ['quote_id'])
    op.create_index('ix_quote_events_workspace_id', 'quote_events', ['workspace_id'])


def downgrade() -> None:
    op.drop_index('ix_quote_events_workspace_id', table_name='quote_events')
    op.drop_index('ix_quote_events_quote_id', table_name='quote_events')
    op.drop_table('quote_events')
    op.drop_column('quote_lines', 'notes')
    op.drop_column('quote_lines', 'tax_percent')
    op.drop_column('quote_lines', 'unit')
    op.drop_column('quote_lines', 'sku')
