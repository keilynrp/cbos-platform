"""company profile for invoice issuer

Revision ID: 7bd587f0f493
Revises: e4f6a8b0c2d1
Create Date: 2026-08-04 07:47:24.690520

Autogenerate tambien reporto churn de foreign keys, un unique constraint en
public_sites, un indice en quote_events y un NOT NULL en users. Todo eso es
deriva preexistente entre los modelos y la base de datos de desarrollo, ajena a
este cambio, y se removio a mano. En particular, recrear esas foreign keys
habria borrado los ondelete SET NULL / CASCADE que la base tiene hoy, porque los
modelos no los declaran.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '7bd587f0f493'
down_revision: Union[str, None] = 'e4f6a8b0c2d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'company_profiles',
        sa.Column('workspace_id', sa.String(), nullable=False),
        sa.Column('legal_name', sa.String(length=255), nullable=True),
        sa.Column('tax_id', sa.String(length=50), nullable=True),
        sa.Column('tax_id_label', sa.String(length=20), nullable=False),
        sa.Column('address_line', sa.String(length=255), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('state', sa.String(length=100), nullable=True),
        sa.Column('postal_code', sa.String(length=20), nullable=True),
        sa.Column('country', sa.String(length=100), nullable=True),
        sa.Column('email', sa.String(length=320), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('website', sa.String(length=255), nullable=True),
        sa.Column('logo_data_uri', sa.Text(), nullable=True),
        sa.Column('default_currency', sa.String(length=10), nullable=False),
        sa.Column('default_tax_rate', sa.Float(), nullable=False),
        sa.Column('invoice_footer_note', sa.Text(), nullable=True),
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_company_profiles_workspace_id'),
        'company_profiles',
        ['workspace_id'],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_company_profiles_workspace_id'), table_name='company_profiles')
    op.drop_table('company_profiles')
