"""add_projects_module

Revision ID: a1c4e7f2b9d3
Revises: d0b8fd6330bf
Create Date: 2026-04-13 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a1c4e7f2b9d3'
down_revision: Union[str, None] = 'd0b8fd6330bf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'projects',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('workspace_id', sa.String(), nullable=False),
        sa.Column('project_number', sa.String(length=30), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=30), server_default='planning', nullable=False),
        sa.Column('budget', sa.Float(), nullable=True),
        sa.Column('currency', sa.String(length=10), server_default='USD', nullable=False),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('activated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('contract_id', sa.String(), nullable=True),
        sa.Column('sales_order_id', sa.String(), nullable=True),
        sa.Column('contact_id', sa.String(), nullable=True),
        sa.Column('organization_id', sa.String(), nullable=True),
        sa.Column('owner_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id']),
        sa.ForeignKeyConstraint(['contract_id'], ['contracts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['sales_order_id'], ['sales_orders.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['contact_id'], ['persons.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('workspace_id', 'project_number', name='uq_projects_workspace_number'),
    )
    op.create_index('ix_projects_workspace_id', 'projects', ['workspace_id'])
    op.create_index('ix_projects_project_number', 'projects', ['project_number'])
    op.create_index('ix_projects_status', 'projects', ['status'])
    op.create_index('ix_projects_contract_id', 'projects', ['contract_id'])
    op.create_index('ix_projects_sales_order_id', 'projects', ['sales_order_id'])
    op.create_index('ix_projects_contact_id', 'projects', ['contact_id'])
    op.create_index('ix_projects_organization_id', 'projects', ['organization_id'])

    op.create_table(
        'project_tasks',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('project_id', sa.String(), nullable=False),
        sa.Column('task_order', sa.Integer(), server_default='0', nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=30), server_default='todo', nullable=False),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('assignee_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assignee_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_project_tasks_project_id', 'project_tasks', ['project_id'])
    op.create_index('ix_project_tasks_status', 'project_tasks', ['status'])


def downgrade() -> None:
    op.drop_index('ix_project_tasks_status', table_name='project_tasks')
    op.drop_index('ix_project_tasks_project_id', table_name='project_tasks')
    op.drop_table('project_tasks')
    op.drop_index('ix_projects_organization_id', table_name='projects')
    op.drop_index('ix_projects_contact_id', table_name='projects')
    op.drop_index('ix_projects_sales_order_id', table_name='projects')
    op.drop_index('ix_projects_contract_id', table_name='projects')
    op.drop_index('ix_projects_status', table_name='projects')
    op.drop_index('ix_projects_project_number', table_name='projects')
    op.drop_index('ix_projects_workspace_id', table_name='projects')
    op.drop_table('projects')
