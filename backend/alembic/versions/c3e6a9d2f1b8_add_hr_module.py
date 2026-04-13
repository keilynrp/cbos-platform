"""add_hr_module

Revision ID: c3e6a9d2f1b8
Revises: a1c4e7f2b9d3
Create Date: 2026-04-13 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c3e6a9d2f1b8'
down_revision: Union[str, None] = 'a1c4e7f2b9d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Departments (no circular FK — manager_id removed in favour of simplicity)
    op.create_table(
        'departments',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('workspace_id', sa.String(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_departments_workspace_id', 'departments', ['workspace_id'])

    # Employees
    op.create_table(
        'employees',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('workspace_id', sa.String(), nullable=False),
        sa.Column('employee_number', sa.String(length=30), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('status', sa.String(length=30), server_default='active', nullable=False),
        sa.Column('employment_type', sa.String(length=30), server_default='full_time', nullable=False),
        sa.Column('position', sa.String(length=255), nullable=True),
        sa.Column('department_id', sa.String(), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('on_leave_since', sa.DateTime(timezone=True), nullable=True),
        sa.Column('terminated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('salary', sa.Float(), nullable=True),
        sa.Column('currency', sa.String(length=10), server_default='USD', nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id']),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_employees_workspace_id', 'employees', ['workspace_id'])
    op.create_index('ix_employees_employee_number', 'employees', ['employee_number'])
    op.create_index('ix_employees_status', 'employees', ['status'])
    op.create_index('ix_employees_department_id', 'employees', ['department_id'])


def downgrade() -> None:
    op.drop_index('ix_employees_department_id', table_name='employees')
    op.drop_index('ix_employees_status', table_name='employees')
    op.drop_index('ix_employees_employee_number', table_name='employees')
    op.drop_index('ix_employees_workspace_id', table_name='employees')
    op.drop_table('employees')
    op.drop_index('ix_departments_workspace_id', table_name='departments')
    op.drop_table('departments')
