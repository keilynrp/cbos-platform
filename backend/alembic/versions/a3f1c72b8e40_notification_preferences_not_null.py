"""notification preferences not null

Revision ID: a3f1c72b8e40
Revises: 7bd587f0f493
Create Date: 2026-08-05 09:20:00.000000

El modelo declara notification_preferences como no nulo, pero la columna se
creo con nullable=True en 1b07e0fdcc9f. Fue deliberado: es el patron seguro
para agregar una columna a una tabla que ya tiene filas, apoyandose en el
server_default para rellenarlas. Lo que falto fue ajustarla despues, asi que
la base quedo aceptando nulos que el modelo promete que no existen, y los
tres sitios que leen el campo se defienden con `or {}`.

Se rellena antes de restringir, de modo que la migracion es segura aunque
algun entorno tenga filas nulas: con el server_default cubriendo las
inserciones, la unica via para llegar a NULL es escribirlo explicitamente.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a3f1c72b8e40'
down_revision: Union[str, None] = '7bd587f0f493'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_DEFAULT = '{"email_enabled": true, "email_events": {}}'


def upgrade() -> None:
    op.execute(
        f"""
        UPDATE users
        SET notification_preferences = '{_DEFAULT}'::json
        WHERE notification_preferences IS NULL
        """
    )
    op.alter_column(
        'users',
        'notification_preferences',
        existing_type=sa.JSON(),
        nullable=False,
        existing_server_default=sa.text(f"'{_DEFAULT}'::json"),
    )


def downgrade() -> None:
    op.alter_column(
        'users',
        'notification_preferences',
        existing_type=sa.JSON(),
        nullable=True,
        existing_server_default=sa.text(f"'{_DEFAULT}'::json"),
    )
