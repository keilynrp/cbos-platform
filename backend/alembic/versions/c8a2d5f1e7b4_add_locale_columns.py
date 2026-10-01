"""add locale columns

Revision ID: c8a2d5f1e7b4
Revises: b7d24e1f9a03
Create Date: 2026-09-30 08:00:00.000000

ADR 0016. Tres columnas para que el producto sepa en que idioma hablar:

- workspaces.default_locale  NOT NULL, "es"  -> el idioma de quien no eligio
- users.locale               nullable        -> NULL = "sigue al workspace"
- portal_sessions.locale     nullable        -> idioma de un envio concreto

default_locale se rellena con "es" mediante el server_default: es lo que el
producto ya renderizaba, asi que la migracion no cambia ni una cadena. Las
otras dos quedan en NULL y el resolvedor (`app.core.i18n.resolve_locale`) las
trata como "sin preferencia".

El server_default se conserva en la columna en lugar de quitarse tras el
backfill: coincide con el del modelo, y alembic no vuelve a proponer una
diferencia en cada autogenerate.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c8a2d5f1e7b4'
down_revision: Union[str, None] = 'b7d24e1f9a03'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'workspaces',
        sa.Column(
            'default_locale',
            sa.String(length=10),
            nullable=False,
            server_default='es',
        ),
    )
    op.add_column('users', sa.Column('locale', sa.String(length=10), nullable=True))
    op.add_column(
        'portal_sessions', sa.Column('locale', sa.String(length=10), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('portal_sessions', 'locale')
    op.drop_column('users', 'locale')
    op.drop_column('workspaces', 'default_locale')
