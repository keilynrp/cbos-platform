"""add_sales_order_lines

Revision ID: 992e03930fd5
Revises: b1e2c3d4e5f6
Create Date: 2026-03-27 04:59:15.513682

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '992e03930fd5'
down_revision: Union[str, None] = 'b1e2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'sales_order_lines',
        sa.Column('workspace_id', sa.String(), nullable=False),
        sa.Column('order_id', sa.String(), nullable=False),
        sa.Column('line_order', sa.Integer(), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('quantity', sa.Float(), nullable=False),
        sa.Column('unit_price', sa.Float(), nullable=False),
        sa.Column('discount_percent', sa.Float(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('product_id', sa.String(), nullable=True),
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['order_id'], ['sales_orders.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_sales_order_lines_order_id'), 'sales_order_lines', ['order_id'], unique=False)
    op.create_index(op.f('ix_sales_order_lines_workspace_id'), 'sales_order_lines', ['workspace_id'], unique=False)
    op.add_column('sales_orders', sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('sales_orders', 'cancelled_at')
    op.drop_index(op.f('ix_sales_order_lines_workspace_id'), table_name='sales_order_lines')
    op.drop_index(op.f('ix_sales_order_lines_order_id'), table_name='sales_order_lines')
    op.drop_table('sales_order_lines')
