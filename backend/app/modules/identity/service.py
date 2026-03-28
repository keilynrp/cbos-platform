from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, verify_token
from app.events.bus import publish as publish_event
from app.events.types import USER_AUTHENTICATED, Event
from app.modules.identity.models import Workspace, User, Person, Organization
from app.modules.identity.schemas import RegisterRequest, LoginRequest, TokenResponse


async def register(data: RegisterRequest, db: AsyncSession) -> TokenResponse:
    # Verificar que el slug no exista
    existing = await db.execute(
        select(Workspace).where(Workspace.slug == data.workspace_slug)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Workspace slug already exists",
        )

    # Verificar que el email no exista
    existing_user = await db.execute(
        select(User).where(User.email == data.email)
    )
    if existing_user.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
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
    from fastapi import HTTPException, status

    payload = verify_token(refresh_token, token_type="refresh")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
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
