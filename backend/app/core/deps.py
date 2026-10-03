from fastapi import Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.exceptions import CBOSException
from app.core.security import verify_token

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
):
    from app.modules.identity.models import User

    # Un unico codigo para las cuatro razones por las que el token no sirve
    # -ausente, invalido, sin sub, usuario inexistente o inactivo-. Distinguirlas
    # le diria a quien prueba tokens cual de sus intentos se acerco mas.
    credentials_exception = CBOSException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        code="AUTH_TOKEN_INVALID",
        message="Invalid or expired token.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise credentials_exception

    payload = verify_token(credentials.credentials, token_type="access")
    if not payload:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if not user_id:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise credentials_exception

    return user


async def get_current_workspace_id(
    current_user=Depends(get_current_user),
) -> str:
    return current_user.workspace_id


async def resolve_user_locale(db: AsyncSession, user) -> str:
    """El idioma efectivo de un usuario autenticado (ADR 0016, punto 3).

    `users.locale` -> `workspaces.default_locale` -> `"es"`. Es el unico sitio
    que une el usuario con su workspace para decidirlo: `/auth/me` y los
    artefactos que renderiza el servidor (el PDF de factura) lo llaman, para que
    dos lecturas de `users.locale` no puedan divergir.

    Sin `Accept-Language`: con un usuario autenticado ya hay preferencia guardada
    o workspace del que heredar, y la cabecera solo cuenta en el registro.
    """
    from app.core.i18n import resolve_locale
    from app.modules.identity.models import Workspace

    result = await db.execute(
        select(Workspace.default_locale).where(Workspace.id == user.workspace_id)
    )
    return resolve_locale(
        user_locale=user.locale,
        workspace_default=result.scalar_one_or_none(),
    )


async def get_current_locale(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> str:
    return await resolve_user_locale(db, current_user)


async def get_current_admin_user(
    current_user=Depends(get_current_user),
):
    if current_user.is_owner or current_user.role == "admin":
        return current_user

    raise CBOSException(
        status_code=status.HTTP_403_FORBIDDEN,
        code="AUTH_ADMIN_REQUIRED",
        message="Admin access required.",
    )
