"""add notification_preferences to users

Revision ID: 1b07e0fdcc9f
Revises: 992e03930fd5
Create Date: 2026-04-12 22:10:48.240876

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '1b07e0fdcc9f'
down_revision: Union[str, None] = '992e03930fd5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column(
            'notification_preferences',
            sa.JSON(),
            nullable=True,
            server_default='{"email_enabled": true, "email_events": {}}',
        ),
    )


def downgrade() -> None:
    op.drop_column('users', 'notification_preferences')
