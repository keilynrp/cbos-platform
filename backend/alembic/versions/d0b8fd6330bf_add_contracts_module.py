"""add_contracts_module

Revision ID: d0b8fd6330bf
Revises: 1b07e0fdcc9f
Create Date: 2026-04-13 13:36:12.212771

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'd0b8fd6330bf'
down_revision: Union[str, None] = '1b07e0fdcc9f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'contracts',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('workspace_id', sa.String(), nullable=False),
        sa.Column('contract_number', sa.String(length=30), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=30), server_default='draft', nullable=False),
        sa.Column('value', sa.Float(), nullable=True),
        sa.Column('currency', sa.String(length=10), server_default='USD', nullable=False),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('signed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('executed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('terminated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expired_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('sales_order_id', sa.String(), nullable=True),
        sa.Column('opportunity_id', sa.String(), nullable=True),
        sa.Column('contact_id', sa.String(), nullable=True),
        sa.Column('organization_id', sa.String(), nullable=True),
        sa.Column('owner_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id']),
        sa.ForeignKeyConstraint(['sales_order_id'], ['sales_orders.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['opportunity_id'], ['opportunities.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['contact_id'], ['persons.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('workspace_id', 'contract_number', name='uq_contracts_workspace_number'),
    )
    op.create_index('ix_contracts_workspace_id', 'contracts', ['workspace_id'])
    op.create_index('ix_contracts_contract_number', 'contracts', ['contract_number'])
    op.create_index('ix_contracts_status', 'contracts', ['status'])
    op.create_index('ix_contracts_sales_order_id', 'contracts', ['sales_order_id'])
    op.create_index('ix_contracts_opportunity_id', 'contracts', ['opportunity_id'])
    op.create_index('ix_contracts_contact_id', 'contracts', ['contact_id'])
    op.create_index('ix_contracts_organization_id', 'contracts', ['organization_id'])

    op.create_table(
        'contract_clauses',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('contract_id', sa.String(), nullable=False),
        sa.Column('clause_order', sa.Integer(), server_default='0', nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('body', sa.Text(), server_default='', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['contract_id'], ['contracts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_contract_clauses_contract_id', 'contract_clauses', ['contract_id'])


def downgrade() -> None:
    op.drop_index('ix_contract_clauses_contract_id', table_name='contract_clauses')
    op.drop_table('contract_clauses')
    op.drop_index('ix_contracts_organization_id', table_name='contracts')
    op.drop_index('ix_contracts_contact_id', table_name='contracts')
    op.drop_index('ix_contracts_opportunity_id', table_name='contracts')
    op.drop_index('ix_contracts_sales_order_id', table_name='contracts')
    op.drop_index('ix_contracts_status', table_name='contracts')
    op.drop_index('ix_contracts_contract_number', table_name='contracts')
    op.drop_index('ix_contracts_workspace_id', table_name='contracts')
    op.drop_table('contracts')
