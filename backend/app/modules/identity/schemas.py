from pydantic import BaseModel, EmailStr, Field
from datetime import datetime


# ── Workspace ──────────────────────────────────────────────

class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    slug: str = Field(..., min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$")


class WorkspaceRead(BaseModel):
    id: str
    name: str
    slug: str
    plan: str
    active_modules: list[str]
    feature_flags: dict
    is_active: bool
    default_locale: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Auth ───────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    workspace_name: str = Field(..., min_length=2, max_length=255)
    workspace_slug: str = Field(..., min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$")
    full_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


# ── User ───────────────────────────────────────────────────

class UserRead(BaseModel):
    id: str
    workspace_id: str
    email: str
    role: str
    is_active: bool
    is_owner: bool
    # Lo guardado, no lo efectivo: `None` significa "sigue al workspace". El
    # idioma que realmente se usa lo decide `app.core.i18n.resolve_locale`.
    locale: str | None = None
    # Lo efectivo: el idioma que el cliente debe usar, ya resuelto con la cadena
    # del ADR 0016 (user.locale -> workspace.default_locale -> "es"). El frontend
    # no reimplementa esa cadena, la lee de aqui.
    effective_locale: str | None = None
    created_at: datetime
    # Vive en Person, no en User, y por eso se une al leer. Opcional porque la
    # relacion lo es: un User sin person_id es legal y no tiene nombre que dar.
    full_name: str | None = None

    model_config = {"from_attributes": True}


class LocaleUpdate(BaseModel):
    # Sin default a proposito: la clave es obligatoria. Ausente ("no toques") y
    # `null` ("sigue al workspace") significan cosas distintas, y con un cuerpo
    # vacio no habria forma de saber cual se pidio.
    locale: str | None


class UserUpdate(BaseModel):
    role: str | None = None
    is_active: bool | None = None


# ── Person ─────────────────────────────────────────────────

class PersonCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr | None = None
    phone: str | None = None
    role_labels: list[str] = []


class PersonRead(BaseModel):
    id: str
    workspace_id: str
    full_name: str
    email: str | None
    phone: str | None
    role_labels: list[str]
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Organization ───────────────────────────────────────────

class OrganizationCreate(BaseModel):
    legal_name: str = Field(..., min_length=2, max_length=255)
    brand_name: str | None = None
    org_type: str = "customer"
    industry: str | None = None
    country: str | None = None


class OrganizationRead(BaseModel):
    id: str
    workspace_id: str
    legal_name: str
    brand_name: str | None
    org_type: str
    industry: str | None
    country: str | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


# Public Sites

class PublicSiteCreate(BaseModel):
    site_slug: str = Field(..., min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$")
    domain: str | None = Field(default=None, max_length=255)
    allowed_origins: list[str] = Field(default_factory=list)
    is_active: bool = True


class PublicSiteUpdate(BaseModel):
    domain: str | None = Field(default=None, max_length=255)
    allowed_origins: list[str] | None = None
    is_active: bool | None = None


class PublicSiteRead(BaseModel):
    id: str
    workspace_id: str
    site_slug: str
    domain: str | None
    allowed_origins: list[str]
    is_active: bool
    api_key_hint: str
    created_at: datetime
    updated_at: datetime


class PublicSiteSecretRead(PublicSiteRead):
    api_key: str
