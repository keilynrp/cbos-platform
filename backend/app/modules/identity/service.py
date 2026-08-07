import secrets

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import status

from app.core.exceptions import CBOSException
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, verify_token
from app.events.bus import publish as publish_event
from app.events.types import USER_AUTHENTICATED, USER_REGISTERED, WORKSPACE_CREATED, Event
from app.modules.identity.models import Workspace, User, Person, Organization, PublicSite
from app.modules.identity.schemas import (
    RegisterRequest,
    LoginRequest,
    PublicSiteCreate,
    PublicSiteUpdate,
    TokenResponse,
    UserRead,
)


def _normalize_origin(origin: str) -> str:
    return origin.rstrip("/").lower()


def _normalize_origins(origins: list[str]) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()
    for origin in origins:
        value = _normalize_origin(origin.strip())
        if not value or value in seen:
            continue
        seen.add(value)
        normalized.append(value)
    return normalized


def _build_site_key(site_slug: str) -> str:
    return f"psk_{site_slug}_{secrets.token_urlsafe(24)}"


def _api_key_hint(api_key: str) -> str:
    if len(api_key) <= 8:
        return api_key
    return f"{api_key[:4]}...{api_key[-4:]}"


async def register(data: RegisterRequest, db: AsyncSession) -> TokenResponse:
    # Verificar que el slug no exista
    existing = await db.execute(
        select(Workspace).where(Workspace.slug == data.workspace_slug)
    )
    if existing.scalar_one_or_none():
        raise CBOSException(
            status_code=status.HTTP_409_CONFLICT,
            code="IDENTITY_WORKSPACE_SLUG_TAKEN",
            message="Workspace slug already exists.",
            detail={"slug": data.workspace_slug},
        )

    # Verificar que el email no exista
    existing_user = await db.execute(
        select(User).where(User.email == data.email)
    )
    if existing_user.scalar_one_or_none():
        raise CBOSException(
            status_code=status.HTTP_409_CONFLICT,
            code="IDENTITY_EMAIL_TAKEN",
            # Sin detail: el 409 ya revela que el email existe -comportamiento
            # previo, no de esta migracion-, pero devolverlo en el cuerpo lo
            # dejaria ademas en logs y trazas sin ganar nada.
            message="Email already registered.",
        )

    # Crear workspace
    workspace = Workspace(
        name=data.workspace_name,
        slug=data.workspace_slug,
        active_modules=["crm", "sales", "inventory", "portal"],
        feature_flags={"discovery_engine": False, "ai_assistant": False},
    )
    db.add(workspace)
    await db.flush()

    # Crear person
    person = Person(
        workspace_id=workspace.id,
        full_name=data.full_name,
        email=data.email,
        role_labels=["owner"],
    )
    db.add(person)
    await db.flush()

    # Crear user
    user = User(
        workspace_id=workspace.id,
        person_id=person.id,
        email=data.email,
        hashed_password=hash_password(data.password),
        role="admin",
        is_owner=True,
    )
    db.add(user)
    await db.flush()

    await db.commit()

    # Publish platform events
    await publish_event(Event(
        event_type=WORKSPACE_CREATED,
        source_module="identity",
        workspace_id=workspace.id,
        entity_id=workspace.id,
        actor_id=user.id,
        payload={
            "workspace_name": workspace.name,
            "workspace_slug": workspace.slug,
        },
    ))
    await publish_event(Event(
        event_type=USER_REGISTERED,
        source_module="identity",
        workspace_id=workspace.id,
        entity_id=user.id,
        actor_id=user.id,
        payload={
            "email": user.email,
            "role": user.role,
            "is_owner": user.is_owner,
        },
    ))

    token_payload = {
        "sub": user.id,
        "workspace_id": workspace.id,
        "role": user.role,
    }

    return TokenResponse(
        access_token=create_access_token(token_payload),
        refresh_token=create_refresh_token(token_payload),
    )


async def login(data: LoginRequest, db: AsyncSession) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        # Un solo codigo para "no existe" y "contrasena incorrecta". Separarlos
        # convertiria el login en un oraculo de que correos estan registrados.
        raise CBOSException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="IDENTITY_INVALID_CREDENTIALS",
            message="Invalid email or password.",
        )

    if not user.is_active:
        raise CBOSException(
            status_code=status.HTTP_403_FORBIDDEN,
            code="IDENTITY_ACCOUNT_DISABLED",
            message="Account is disabled.",
        )

    token_payload = {
        "sub": user.id,
        "workspace_id": user.workspace_id,
        "role": user.role,
    }

    await publish_event(Event(
        event_type=USER_AUTHENTICATED,
        source_module="identity",
        workspace_id=user.workspace_id,
        actor_id=user.id,
        entity_id=user.id,
        payload={"email": user.email, "role": user.role},
    ))

    return TokenResponse(
        access_token=create_access_token(token_payload),
        refresh_token=create_refresh_token(token_payload),
    )


async def refresh_tokens(refresh_token: str) -> TokenResponse:
    payload = verify_token(refresh_token, token_type="refresh")
    if not payload:
        raise CBOSException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="IDENTITY_REFRESH_TOKEN_INVALID",
            message="Invalid or expired refresh token.",
        )

    token_payload = {
        "sub": payload["sub"],
        "workspace_id": payload["workspace_id"],
        "role": payload["role"],
    }

    return TokenResponse(
        access_token=create_access_token(token_payload),
        refresh_token=create_refresh_token(token_payload),
    )


async def read_me(user: User, db: AsyncSession) -> UserRead:
    """Une el nombre de Person al usuario autenticado.

    La consulta se hace aqui y no en get_current_user a proposito: esa
    dependencia corre en cada ruta protegida y solo /auth/me necesita el
    nombre, asi que cargarlo alli seria un join por peticion para nada.
    """
    out = UserRead.model_validate(user)

    if user.person_id:
        result = await db.execute(
            select(Person.full_name).where(Person.id == user.person_id)
        )
        out.full_name = result.scalar_one_or_none()

    return out


async def create_person(workspace_id: str, data, db: AsyncSession) -> Person:
    person = Person(workspace_id=workspace_id, **data.model_dump())
    db.add(person)
    await db.flush()
    return person


async def create_organization(workspace_id: str, data, db: AsyncSession) -> Organization:
    org = Organization(workspace_id=workspace_id, **data.model_dump())
    db.add(org)
    await db.commit()
    await db.refresh(org)
    return org


async def list_organizations(workspace_id: str, db: AsyncSession) -> list[Organization]:
    result = await db.execute(
        select(Organization)
        .where(Organization.workspace_id == workspace_id)
        .order_by(Organization.created_at.desc())
    )
    return list(result.scalars().all())


async def list_public_sites(workspace_id: str, db: AsyncSession) -> list[PublicSite]:
    result = await db.execute(
        select(PublicSite)
        .where(PublicSite.workspace_id == workspace_id)
        .order_by(PublicSite.created_at.desc())
    )
    return list(result.scalars().all())


async def get_public_site(workspace_id: str, site_id: str, db: AsyncSession) -> PublicSite:
    result = await db.execute(
        select(PublicSite).where(
            PublicSite.id == site_id,
            PublicSite.workspace_id == workspace_id,
        )
    )
    site = result.scalar_one_or_none()
    if not site:
        raise CBOSException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="IDENTITY_PUBLIC_SITE_NOT_FOUND",
            message="Public site not found.",
            detail={"id": site_id},
        )
    return site


async def create_public_site(
    workspace_id: str,
    data: PublicSiteCreate,
    db: AsyncSession,
) -> PublicSite:
    existing = await db.execute(
        select(PublicSite).where(
            PublicSite.workspace_id == workspace_id,
            PublicSite.site_slug == data.site_slug,
        )
    )
    if existing.scalar_one_or_none():
        raise CBOSException(
            status_code=status.HTTP_409_CONFLICT,
            code="IDENTITY_PUBLIC_SITE_SLUG_TAKEN",
            message="Public site slug already exists.",
            detail={"slug": data.site_slug},
        )

    site = PublicSite(
        workspace_id=workspace_id,
        site_slug=data.site_slug,
        domain=data.domain,
        allowed_origins=_normalize_origins(data.allowed_origins),
        is_active=data.is_active,
        api_key=_build_site_key(data.site_slug),
    )
    db.add(site)
    await db.commit()
    await db.refresh(site)
    return site


async def update_public_site(
    workspace_id: str,
    site_id: str,
    data: PublicSiteUpdate,
    db: AsyncSession,
) -> PublicSite:
    site = await get_public_site(workspace_id, site_id, db)
    payload = data.model_dump(exclude_unset=True)

    if "allowed_origins" in payload and payload["allowed_origins"] is not None:
        payload["allowed_origins"] = _normalize_origins(payload["allowed_origins"])

    for field, value in payload.items():
        setattr(site, field, value)

    await db.commit()
    await db.refresh(site)
    return site


async def rotate_public_site_key(
    workspace_id: str,
    site_id: str,
    db: AsyncSession,
) -> PublicSite:
    site = await get_public_site(workspace_id, site_id, db)
    site.api_key = _build_site_key(site.site_slug)
    await db.commit()
    await db.refresh(site)
    return site
