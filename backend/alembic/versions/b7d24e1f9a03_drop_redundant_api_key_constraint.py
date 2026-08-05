"""drop redundant api key constraint

Revision ID: b7d24e1f9a03
Revises: a3f1c72b8e40
Create Date: 2026-08-05 10:05:00.000000

La migracion e4f6a8b0c2d1 creo dos garantias de unicidad sobre
public_sites.api_key: un UniqueConstraint y, ademas, un indice unico. El
modelo declara `unique=True, index=True`, que en SQLAlchemy produce solo el
indice, asi que el constraint suelto quedaba fuera de Base.metadata y
autogenerate lo reportaba en cada corrida como algo a borrar.

Se borra el constraint y se conserva el indice. La unicidad de api_key sigue
garantizada por ix_public_sites_api_key, que es UNIQUE; lo que se elimina es
la duplicacion, no la restriccion.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b7d24e1f9a03'
down_revision: Union[str, None] = 'a3f1c72b8e40'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint('public_sites_api_key_key', 'public_sites', type_='unique')


def downgrade() -> None:
    op.create_unique_constraint('public_sites_api_key_key', 'public_sites', ['api_key'])
