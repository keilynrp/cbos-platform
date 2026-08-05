# Company Profile (Invoice Issuer) Implementation Plan

> **Estado: ejecutado el 2026-08-04** en la rama `feat/invoice-export-preview`.
> Las nueve tareas estan implementadas. Las casillas se dejan sin marcar a
> proposito: varios pasos se ejecutaron de forma distinta a la escrita, y
> tildarlas daria a entender una fidelidad literal que no hubo. El registro de
> lo que realmente paso son los commits. Desviaciones que conviene conocer
> antes de reutilizar este plan como referencia:
>
> - **Tarea 1.** `alembic/env.py` solo importaba 7 modulos, asi que accounting,
>   contracts, projects y hr quedaban fuera de `Base.metadata`. Autogenerate los
>   reportaba como tablas borradas y nunca habria generado `company_profiles`.
>   El plan suponia que bastaba con borrar lineas sobrantes de la migracion.
> - **Tarea 5.** El test de referencia colgante no se puede montar como estaba
>   escrito: `invoices.organization_id` tiene foreign key real, y su
>   `ondelete SET NULL` hace que una referencia colgante ni siquiera sea
>   alcanzable. Se reescribio con un `Invoice` sin persistir.
> - **Tarea 6.** La motivacion del plan es incorrecta: los acentos y enies del
>   espanol entran en latin-1 y Helvetica los renderiza bien. Lo que rompe son
>   los caracteres fuera de latin-1 (simbolos de moneda, comillas tipograficas).
> - **Tareas 6, 7 y 8.** Tres pasos de verificacion del plan no verificaban
>   nada: los tests de fuente pasaban con el paquete desinstalado, el de
>   compatibilidad de `"CBOS"` solo miraba que el resultado empezara con `%PDF`,
>   y `npx tsc --noEmit` no chequea ningun archivo con un tsconfig
>   solution-style. Los tres se reemplazaron por comprobaciones reales.
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each workspace a configurable invoice issuer identity (legal name, tax ID, address, logo) and render it — plus the resolved customer — on generated invoice PDFs, replacing the hardcoded `"CBOS"` literal.

**Architecture:** A new `CompanyProfile` model in the existing `accounting` module, one row per workspace, exposed through a `GET`/`PUT` upsert pair. The logo is stored inline as a base64 data URI (no storage subsystem exists in this codebase). `pdf.py` gains optional `profile` and `party` arguments and keeps its current output as the fallback path, so nothing breaks for a workspace that never configures anything.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 async, Pydantic v2, Alembic, fpdf2 2.8.2, PostgreSQL, pytest + pytest-asyncio, React 18 + TypeScript, TanStack Query v5, shadcn/ui, Vite.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-03-company-profile-design.md`
- All new endpoints MUST use `Depends(get_current_workspace_id)`. Every DB query touching `persons` or `organizations` MUST filter by `workspace_id`.
- API prefix is `/api/v1`. The accounting router already carries `prefix="/accounting"`.
- Logo: `image/png` or `image/jpeg` only, decoded size ≤ **200 KB** (204800 bytes). Invalid logo → HTTP **400**. Out-of-range `default_tax_rate` → HTTP **422** (Pydantic).
- `generate_invoice_pdf(invoice)` called with no profile MUST still produce a valid PDF containing `"CBOS"`. This is a hard backwards-compatibility requirement with a dedicated regression test.
- A missing font file MUST degrade to Helvetica, never raise.
- Tests run inside Docker: `docker compose exec backend pytest tests/ -v --tb=short`
- Work happens on branch `feat/invoice-export-preview` (already created, based on `master`).
- Commit messages: Conventional Commits, Spanish body, ASCII only (the repo's git hooks reject some escaped quoting). End every commit message with:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

## Deviation From Spec — read before starting

The spec says to vendor `DejaVuSans.ttf` into the repo. **This plan installs it via the Dockerfile instead** (`fonts-dejavu-core`, an apt package already available on `python:3.12-slim`). Rationale: it keeps binary blobs out of git and the file lands at a stable system path. The font-resolution helper probes a candidate list and falls back to Helvetica, so a developer running outside Docker without the package still gets working PDFs. If you prefer the vendored approach, only Task 6 changes.

---

## File Structure

**Backend — created**
| File | Responsibility |
|------|----------------|
| `backend/app/modules/accounting/fonts.py` | Resolve and register a Unicode TTF on an `FPDF` instance; expose the family name to use |
| `backend/alembic/versions/<rev>_company_profile.py` | Create `company_profiles` |
| `backend/tests/test_company_profile.py` | Model, service, endpoint and party-resolution tests |
| `backend/tests/test_invoice_pdf_rendering.py` | PDF rendering tests including the `"CBOS"` regression guard |

**Backend — modified**
| File | Change |
|------|--------|
| `backend/app/modules/accounting/models.py` | Add `CompanyProfile` |
| `backend/app/modules/accounting/schemas.py` | Add `CompanyProfileRead`, `CompanyProfileUpdate` |
| `backend/app/modules/accounting/service.py` | Add `get_or_create_company_profile`, `update_company_profile`, `resolve_invoice_party`, `InvoiceParty` |
| `backend/app/modules/accounting/router.py` | Add `GET`/`PUT /company-profile`; pass profile+party into the PDF endpoint |
| `backend/app/modules/accounting/pdf.py` | Unicode font, issuer block, logo, customer block, footer note |
| `backend/tests/conftest.py:45` | Import `CompanyProfile` so `Base.metadata` includes it |
| `backend/Dockerfile:6-9` | Add `fonts-dejavu-core` |

**Frontend — created**
| File | Responsibility |
|------|----------------|
| `composable-os/src/pages/CompanyProfileSettings.tsx` | Settings form + logo uploader |

**Frontend — modified**
| File | Change |
|------|--------|
| `composable-os/src/services/accounting.ts` | `CompanyProfile` types + two methods |
| `composable-os/src/App.tsx:83` | Register `/settings/company` |
| `composable-os/src/pages/Invoicing.tsx` | Link to the settings page from the header |

**Design note on the settings page.** The existing `Settings.tsx` is an infrastructure/health dashboard, not a business-config page. Company data goes on its own route (`/settings/company`) rather than being bolted onto it, and the entry point lives on the Facturación page where users will look for it.

---

## Task 1: CompanyProfile model and migration

**Files:**
- Modify: `backend/app/modules/accounting/models.py` (append after `Payment`)
- Modify: `backend/tests/conftest.py:45`
- Create: `backend/alembic/versions/<generated>_company_profile.py`
- Test: `backend/tests/test_company_profile.py`

**Interfaces:**
- Consumes: `Base` from `app.core.database` (supplies `id`, `created_at`, `updated_at`)
- Produces: `CompanyProfile` ORM model with `workspace_id` unique; columns listed below

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_company_profile.py`:

```python
"""Tests for the invoice issuer profile (CompanyProfile)."""

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.modules.accounting.models import CompanyProfile


class TestCompanyProfileModel:
    @pytest.mark.asyncio
    async def test_can_persist_a_profile(self, db, workspace):
        profile = CompanyProfile(
            workspace_id=workspace.id,
            legal_name="Compania Ejemplo S.A. de C.V.",
            tax_id="ABC010203XYZ",
            tax_id_label="RFC",
            city="Ciudad de Mexico",
        )
        db.add(profile)
        await db.commit()

        result = await db.execute(
            select(CompanyProfile).where(CompanyProfile.workspace_id == workspace.id)
        )
        saved = result.scalar_one()
        assert saved.legal_name == "Compania Ejemplo S.A. de C.V."
        assert saved.tax_id_label == "RFC"
        assert saved.default_currency == "USD"
        assert saved.default_tax_rate == 0.0
        assert saved.logo_data_uri is None

    @pytest.mark.asyncio
    async def test_one_profile_per_workspace(self, db, workspace):
        db.add(CompanyProfile(workspace_id=workspace.id, legal_name="Primera"))
        await db.commit()

        db.add(CompanyProfile(workspace_id=workspace.id, legal_name="Segunda"))
        with pytest.raises(IntegrityError):
            await db.commit()
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose exec backend pytest tests/test_company_profile.py -v
```

Expected: FAIL — `ImportError: cannot import name 'CompanyProfile'`

- [ ] **Step 3: Add the model**

Append to `backend/app/modules/accounting/models.py`. The `Float` import is already present at the top of the file; verify `Boolean` is not needed.

```python
class CompanyProfile(Base):
    """Issuer identity used on invoices — one per workspace."""

    __tablename__ = "company_profiles"

    workspace_id: Mapped[str] = mapped_column(
        String, ForeignKey("workspaces.id"), unique=True, index=True
    )

    legal_name:   Mapped[str | None] = mapped_column(String(255), nullable=True)
    tax_id:       Mapped[str | None] = mapped_column(String(50),  nullable=True)
    tax_id_label: Mapped[str]        = mapped_column(String(20),  default="RFC")

    address_line: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city:         Mapped[str | None] = mapped_column(String(100), nullable=True)
    state:        Mapped[str | None] = mapped_column(String(100), nullable=True)
    postal_code:  Mapped[str | None] = mapped_column(String(20),  nullable=True)
    country:      Mapped[str | None] = mapped_column(String(100), nullable=True)

    email:   Mapped[str | None] = mapped_column(String(320), nullable=True)
    phone:   Mapped[str | None] = mapped_column(String(50),  nullable=True)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)

    logo_data_uri: Mapped[str | None] = mapped_column(Text, nullable=True)

    default_currency:    Mapped[str]        = mapped_column(String(10), default="USD")
    default_tax_rate:    Mapped[float]      = mapped_column(Float, default=0.0)
    invoice_footer_note: Mapped[str | None] = mapped_column(Text, nullable=True)
```

- [ ] **Step 4: Register the model in conftest**

`backend/tests/conftest.py` builds the test schema from `Base.metadata`, so an unimported model produces no table. Change line 45:

```python
from app.modules.accounting.models import CompanyProfile, Invoice, InvoiceLine, Payment  # noqa: F401
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
docker compose exec backend pytest tests/test_company_profile.py -v
```

Expected: 2 passed. Note `default_currency == "USD"` passes because the column default is applied on flush.

- [ ] **Step 6: Generate the migration**

Confirm the current head first — do not hardcode a revision id:

```bash
docker compose exec backend alembic heads
```

At the time this plan was written the graph was linear with a single head,
`e4f6a8b0c2d1` (`add_public_site_intake_v1`). If `alembic heads` reports anything
else — or reports more than one head — stop and reconcile before generating a new
revision. Autogenerating onto a branched history produces a migration that cannot
be applied cleanly.

Then autogenerate and inspect:

```bash
docker compose exec backend alembic revision --autogenerate -m "company profile for invoice issuer"
```

Open the generated file. It MUST contain only `op.create_table("company_profiles", ...)` and its indexes. **If it contains drops or alters of other tables, delete those lines** — autogenerate compares against the live dev DB and will try to "fix" unrelated drift.

- [ ] **Step 7: Apply and verify the migration**

```bash
docker compose exec backend alembic upgrade head
```

Expected: no error. Verify round-trip:

```bash
docker compose exec backend alembic downgrade -1 && docker compose exec backend alembic upgrade head
```

Expected: both succeed. A migration that cannot be reversed is a migration you cannot deploy safely.

- [ ] **Step 8: Commit**

```bash
git add backend/app/modules/accounting/models.py backend/tests/conftest.py backend/tests/test_company_profile.py backend/alembic/versions/
git commit -m "feat(accounting): modelo CompanyProfile con migracion

Tabla company_profiles, una por workspace, con datos de emisor,
logo en base64 y valores por defecto de factura.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: Schemas

**Files:**
- Modify: `backend/app/modules/accounting/schemas.py` (append at end)
- Test: `backend/tests/test_company_profile.py`

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces: `CompanyProfileRead`, `CompanyProfileUpdate` — `CompanyProfileUpdate` has every field optional except that `logo_data_uri` distinguishes "absent" from "explicit null"

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/test_company_profile.py`:

```python
from pydantic import ValidationError

from app.modules.accounting.schemas import CompanyProfileUpdate


class TestCompanyProfileSchema:
    def test_all_fields_optional(self):
        dto = CompanyProfileUpdate()
        assert dto.legal_name is None
        assert dto.model_fields_set == set()

    def test_distinguishes_absent_from_explicit_null(self):
        """Clearing the logo must be distinguishable from not touching it."""
        absent = CompanyProfileUpdate(legal_name="Acme")
        assert "logo_data_uri" not in absent.model_fields_set

        cleared = CompanyProfileUpdate(logo_data_uri=None)
        assert "logo_data_uri" in cleared.model_fields_set
        assert cleared.logo_data_uri is None

    def test_rejects_tax_rate_above_100(self):
        with pytest.raises(ValidationError):
            CompanyProfileUpdate(default_tax_rate=101)

    def test_rejects_negative_tax_rate(self):
        with pytest.raises(ValidationError):
            CompanyProfileUpdate(default_tax_rate=-1)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose exec backend pytest tests/test_company_profile.py::TestCompanyProfileSchema -v
```

Expected: FAIL — `ImportError: cannot import name 'CompanyProfileUpdate'`

- [ ] **Step 3: Add the schemas**

Append to `backend/app/modules/accounting/schemas.py`:

```python
# ── Company Profile ───────────────────────────────────────────────────────────

class CompanyProfileRead(BaseModel):
    id: str
    workspace_id: str
    legal_name: str | None
    tax_id: str | None
    tax_id_label: str
    address_line: str | None
    city: str | None
    state: str | None
    postal_code: str | None
    country: str | None
    email: str | None
    phone: str | None
    website: str | None
    logo_data_uri: str | None
    default_currency: str
    default_tax_rate: float
    invoice_footer_note: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CompanyProfileUpdate(BaseModel):
    legal_name: str | None = Field(None, max_length=255)
    tax_id: str | None = Field(None, max_length=50)
    tax_id_label: str | None = Field(None, max_length=20)
    address_line: str | None = Field(None, max_length=255)
    city: str | None = Field(None, max_length=100)
    state: str | None = Field(None, max_length=100)
    postal_code: str | None = Field(None, max_length=20)
    country: str | None = Field(None, max_length=100)
    email: str | None = Field(None, max_length=320)
    phone: str | None = Field(None, max_length=50)
    website: str | None = Field(None, max_length=255)
    logo_data_uri: str | None = None
    default_currency: str | None = Field(None, max_length=10)
    default_tax_rate: float | None = Field(None, ge=0, le=100)
    invoice_footer_note: str | None = None
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
docker compose exec backend pytest tests/test_company_profile.py -v
```

Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/app/modules/accounting/schemas.py backend/tests/test_company_profile.py
git commit -m "feat(accounting): schemas de CompanyProfile

CompanyProfileUpdate deja todos los campos opcionales y usa
model_fields_set para distinguir campo ausente de null explicito,
que es como se limpia el logo.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: Service — get, upsert, and logo validation

**Files:**
- Modify: `backend/app/modules/accounting/service.py`
- Test: `backend/tests/test_company_profile.py`

**Interfaces:**
- Consumes: `CompanyProfile` (Task 1), `CompanyProfileUpdate` (Task 2)
- Produces:
  - `async get_or_create_company_profile(db: AsyncSession, workspace_id: str) -> CompanyProfile`
  - `async update_company_profile(db, workspace_id: str, data: CompanyProfileUpdate) -> CompanyProfile`
  - `_validate_logo_data_uri(value: str | None) -> None` — raises `HTTPException(400)`
  - `MAX_LOGO_BYTES = 204800`

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/test_company_profile.py`:

```python
import base64

from fastapi import HTTPException

from app.modules.accounting import service


def _data_uri(n_bytes: int, mime: str = "image/png") -> str:
    payload = base64.b64encode(b"x" * n_bytes).decode()
    return f"data:{mime};base64,{payload}"


class TestGetOrCreateCompanyProfile:
    @pytest.mark.asyncio
    async def test_creates_when_absent(self, db, workspace):
        profile = await service.get_or_create_company_profile(db, workspace.id)
        assert profile.id is not None
        assert profile.workspace_id == workspace.id
        assert profile.legal_name is None

    @pytest.mark.asyncio
    async def test_second_call_does_not_create_a_duplicate(self, db, workspace):
        first = await service.get_or_create_company_profile(db, workspace.id)
        second = await service.get_or_create_company_profile(db, workspace.id)
        assert first.id == second.id

        result = await db.execute(
            select(CompanyProfile).where(CompanyProfile.workspace_id == workspace.id)
        )
        assert len(result.scalars().all()) == 1


class TestUpdateCompanyProfile:
    @pytest.mark.asyncio
    async def test_upserts_when_absent(self, db, workspace):
        dto = CompanyProfileUpdate(legal_name="Acme S.A.", tax_id_label="NIT")
        profile = await service.update_company_profile(db, workspace.id, dto)
        assert profile.legal_name == "Acme S.A."
        assert profile.tax_id_label == "NIT"

    @pytest.mark.asyncio
    async def test_partial_update_leaves_other_fields_untouched(self, db, workspace):
        await service.update_company_profile(
            db, workspace.id, CompanyProfileUpdate(legal_name="Acme", city="Bogota")
        )
        updated = await service.update_company_profile(
            db, workspace.id, CompanyProfileUpdate(city="Medellin")
        )
        assert updated.city == "Medellin"
        assert updated.legal_name == "Acme"

    @pytest.mark.asyncio
    async def test_explicit_null_clears_the_logo(self, db, workspace):
        await service.update_company_profile(
            db, workspace.id, CompanyProfileUpdate(logo_data_uri=_data_uri(100))
        )
        cleared = await service.update_company_profile(
            db, workspace.id, CompanyProfileUpdate(logo_data_uri=None)
        )
        assert cleared.logo_data_uri is None


class TestLogoValidation:
    def test_accepts_png_under_the_limit(self):
        service._validate_logo_data_uri(_data_uri(199_000))

    def test_accepts_jpeg(self):
        service._validate_logo_data_uri(_data_uri(100, mime="image/jpeg"))

    def test_accepts_none(self):
        service._validate_logo_data_uri(None)

    def test_rejects_wrong_mime(self):
        with pytest.raises(HTTPException) as exc:
            service._validate_logo_data_uri(_data_uri(100, mime="image/gif"))
        assert exc.value.status_code == 400

    def test_rejects_non_data_uri(self):
        with pytest.raises(HTTPException) as exc:
            service._validate_logo_data_uri("https://example.com/logo.png")
        assert exc.value.status_code == 400

    def test_rejects_undecodable_base64(self):
        with pytest.raises(HTTPException) as exc:
            service._validate_logo_data_uri("data:image/png;base64,!!!not-base64!!!")
        assert exc.value.status_code == 400

    def test_rejects_over_200kb(self):
        with pytest.raises(HTTPException) as exc:
            service._validate_logo_data_uri(_data_uri(204_801))
        assert exc.value.status_code == 400
        assert "200" in exc.value.detail
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose exec backend pytest tests/test_company_profile.py -v -k "CompanyProfile or Logo"
```

Expected: FAIL — `AttributeError: module 'app.modules.accounting.service' has no attribute 'get_or_create_company_profile'`

- [ ] **Step 3: Implement the service functions**

Add to the imports at the top of `backend/app/modules/accounting/service.py`:

```python
import base64
import binascii
import re
```

and extend the models import on line 17:

```python
from app.modules.accounting.models import CompanyProfile, Invoice, InvoiceLine, Payment
```

and the schemas import (line 18-26) with `CompanyProfileUpdate`.

Append at the end of the file:

```python
# ── Company Profile ───────────────────────────────────────────────────────────

MAX_LOGO_BYTES = 204_800  # 200 KB
_LOGO_PREFIX_RE = re.compile(r"^data:image/(png|jpeg);base64,")


def _validate_logo_data_uri(value: str | None) -> None:
    """Raise HTTPException(400) if the logo is not an acceptable data URI."""
    if value is None:
        return

    match = _LOGO_PREFIX_RE.match(value)
    if not match:
        raise HTTPException(
            400,
            detail="El logo debe ser un data URI base64 de tipo image/png o image/jpeg",
        )

    payload = value[match.end():]
    try:
        decoded = base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(400, detail="El logo no es base64 valido")

    if len(decoded) > MAX_LOGO_BYTES:
        raise HTTPException(
            400,
            detail=(
                f"El logo pesa {len(decoded) // 1024} KB y el maximo son 200 KB. "
                "Reduce la imagen antes de subirla."
            ),
        )


async def get_or_create_company_profile(
    db: AsyncSession, workspace_id: str
) -> CompanyProfile:
    """Return the workspace profile, creating an empty one if it does not exist."""
    result = await db.execute(
        select(CompanyProfile).where(CompanyProfile.workspace_id == workspace_id)
    )
    profile = result.scalar_one_or_none()
    if profile is not None:
        return profile

    profile = CompanyProfile(workspace_id=workspace_id)
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile


async def update_company_profile(
    db: AsyncSession,
    workspace_id: str,
    data: CompanyProfileUpdate,
) -> CompanyProfile:
    """Upsert the workspace profile from a partial payload."""
    fields = data.model_dump(exclude_unset=True)

    if "logo_data_uri" in fields:
        _validate_logo_data_uri(fields["logo_data_uri"])

    profile = await get_or_create_company_profile(db, workspace_id)
    for key, value in fields.items():
        setattr(profile, key, value)

    await db.commit()
    await db.refresh(profile)
    return profile
```

`exclude_unset=True` is what makes partial updates and explicit-null clearing both work — without it every unset field would overwrite the stored value with `None`.

- [ ] **Step 4: Run tests to verify they pass**

```bash
docker compose exec backend pytest tests/test_company_profile.py -v
```

Expected: 17 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/app/modules/accounting/service.py backend/tests/test_company_profile.py
git commit -m "feat(accounting): servicio upsert de CompanyProfile con validacion de logo

get_or_create nunca devuelve 404: crea el perfil vacio al vuelo.
update usa exclude_unset para permitir updates parciales y limpiar
el logo con null explicito. Logo limitado a PNG/JPEG y 200 KB.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: Endpoints

**Files:**
- Modify: `backend/app/modules/accounting/router.py`
- Test: `backend/tests/test_company_profile.py`

**Interfaces:**
- Consumes: `get_or_create_company_profile`, `update_company_profile` (Task 3); `CompanyProfileRead`, `CompanyProfileUpdate` (Task 2)
- Produces: `GET /api/v1/accounting/company-profile`, `PUT /api/v1/accounting/company-profile`

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/test_company_profile.py`:

```python
class TestCompanyProfileEndpoints:
    @pytest.mark.asyncio
    async def test_get_returns_empty_profile_not_404(self, client, auth_headers):
        resp = await client.get("/api/v1/accounting/company-profile", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["legal_name"] is None
        assert body["tax_id_label"] == "RFC"
        assert body["default_currency"] == "USD"

    @pytest.mark.asyncio
    async def test_put_then_get_round_trip(self, client, auth_headers):
        put = await client.put(
            "/api/v1/accounting/company-profile",
            json={"legal_name": "Acme S.A.", "tax_id": "ABC010203XYZ", "city": "Lima"},
            headers=auth_headers,
        )
        assert put.status_code == 200

        get = await client.get("/api/v1/accounting/company-profile", headers=auth_headers)
        assert get.json()["legal_name"] == "Acme S.A."
        assert get.json()["city"] == "Lima"

    @pytest.mark.asyncio
    async def test_put_rejects_oversized_logo_with_400(self, client, auth_headers):
        resp = await client.put(
            "/api/v1/accounting/company-profile",
            json={"logo_data_uri": _data_uri(204_801)},
            headers=auth_headers,
        )
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_put_rejects_bad_tax_rate_with_422(self, client, auth_headers):
        resp = await client.put(
            "/api/v1/accounting/company-profile",
            json={"default_tax_rate": 150},
            headers=auth_headers,
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_requires_authentication(self, client):
        resp = await client.get("/api/v1/accounting/company-profile")
        assert resp.status_code in (401, 403)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose exec backend pytest tests/test_company_profile.py::TestCompanyProfileEndpoints -v
```

Expected: FAIL — the `GET` returns 404 because the route does not exist.

- [ ] **Step 3: Add the endpoints**

In `backend/app/modules/accounting/router.py`, extend the schemas import block (lines 9-17) with `CompanyProfileRead` and `CompanyProfileUpdate`, then insert this section immediately after the `get_summary` endpoint and **before** the `# ── Invoices ──` comment:

```python
# ── Company Profile ───────────────────────────────────────────────────────────

@router.get("/company-profile", response_model=CompanyProfileRead)
async def get_company_profile(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    """Return the workspace issuer profile, creating an empty one if absent."""
    return await service.get_or_create_company_profile(db, workspace_id)


@router.put("/company-profile", response_model=CompanyProfileRead)
async def upsert_company_profile(
    data: CompanyProfileUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.update_company_profile(db, workspace_id, data)
```

Placement matters: these routes must not sit after `/invoices/{invoice_id}`, and keeping them above the invoice section also keeps the file readable.

- [ ] **Step 4: Run tests to verify they pass**

```bash
docker compose exec backend pytest tests/test_company_profile.py -v
```

Expected: 22 passed.

- [ ] **Step 5: Verify no existing accounting test regressed**

```bash
docker compose exec backend pytest tests/test_accounting.py tests/test_accounting_contract.py -v
```

Expected: all pass, unchanged.

- [ ] **Step 6: Commit**

```bash
git add backend/app/modules/accounting/router.py backend/tests/test_company_profile.py
git commit -m "feat(accounting): endpoints GET y PUT de company-profile

GET crea el perfil vacio al vuelo para que el frontend nunca
tenga que manejar un 404.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: Customer resolution (`resolve_invoice_party`)

**Files:**
- Modify: `backend/app/modules/accounting/service.py`
- Test: `backend/tests/test_company_profile.py`

**Interfaces:**
- Consumes: `Person`, `Organization` from `app.modules.identity.models`
- Produces: `@dataclass InvoiceParty` with fields `name: str | None`, `contact_name: str | None`, `email: str | None`, `phone: str | None`, `country: str | None`, and property `is_empty: bool`; plus `async resolve_invoice_party(db, workspace_id: str, invoice: Invoice) -> InvoiceParty`

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/test_company_profile.py`:

```python
from datetime import date

from app.modules.identity.models import Organization, Person


async def _make_invoice(db, workspace_id, **kwargs):
    inv = Invoice(
        workspace_id=workspace_id,
        invoice_number="INV-2026-0001",
        status="draft",
        issue_date=date(2026, 8, 3),
        currency="USD",
        **kwargs,
    )
    db.add(inv)
    await db.commit()
    await db.refresh(inv)
    return inv


class TestResolveInvoiceParty:
    @pytest.mark.asyncio
    async def test_empty_when_no_contact_or_organization(self, db, workspace):
        inv = await _make_invoice(db, workspace.id)
        party = await service.resolve_invoice_party(db, workspace.id, inv)
        assert party.is_empty
        assert party.name is None

    @pytest.mark.asyncio
    async def test_prefers_brand_name_over_legal_name(self, db, workspace):
        org = Organization(
            workspace_id=workspace.id,
            legal_name="Acme Sociedad Anonima",
            brand_name="Acme",
            country="Peru",
        )
        db.add(org)
        await db.commit()

        inv = await _make_invoice(db, workspace.id, organization_id=org.id)
        party = await service.resolve_invoice_party(db, workspace.id, inv)
        assert party.name == "Acme"
        assert party.country == "Peru"
        assert not party.is_empty

    @pytest.mark.asyncio
    async def test_falls_back_to_legal_name(self, db, workspace):
        org = Organization(workspace_id=workspace.id, legal_name="Solo Legal S.A.")
        db.add(org)
        await db.commit()

        inv = await _make_invoice(db, workspace.id, organization_id=org.id)
        party = await service.resolve_invoice_party(db, workspace.id, inv)
        assert party.name == "Solo Legal S.A."

    @pytest.mark.asyncio
    async def test_uses_person_when_no_organization(self, db, workspace):
        person = Person(
            workspace_id=workspace.id,
            full_name="Maria Rodriguez",
            email="maria@example.com",
            phone="+51 999 888 777",
        )
        db.add(person)
        await db.commit()

        inv = await _make_invoice(db, workspace.id, contact_id=person.id)
        party = await service.resolve_invoice_party(db, workspace.id, inv)
        assert party.name == "Maria Rodriguez"
        assert party.email == "maria@example.com"
        assert party.phone == "+51 999 888 777"

    @pytest.mark.asyncio
    async def test_organization_wins_and_person_becomes_contact_name(self, db, workspace):
        org = Organization(workspace_id=workspace.id, legal_name="Acme S.A.")
        person = Person(workspace_id=workspace.id, full_name="Maria Rodriguez")
        db.add_all([org, person])
        await db.commit()

        inv = await _make_invoice(
            db, workspace.id, organization_id=org.id, contact_id=person.id
        )
        party = await service.resolve_invoice_party(db, workspace.id, inv)
        assert party.name == "Acme S.A."
        assert party.contact_name == "Maria Rodriguez"

    @pytest.mark.asyncio
    async def test_deleted_reference_does_not_raise(self, db, workspace):
        """A dangling id must degrade to empty, never break PDF generation."""
        import uuid

        inv = await _make_invoice(db, workspace.id, organization_id=str(uuid.uuid4()))
        party = await service.resolve_invoice_party(db, workspace.id, inv)
        assert party.is_empty

    @pytest.mark.asyncio
    async def test_does_not_resolve_across_workspaces(self, db, workspace, session_factory):
        """Cross-tenant leak guard."""
        from app.modules.identity.models import Workspace

        async with session_factory() as other_session:
            other_ws = Workspace(name="Otra Corp", slug="otra-corp", active_modules=[])
            other_session.add(other_ws)
            await other_session.commit()
            await other_session.refresh(other_ws)

            foreign_org = Organization(
                workspace_id=other_ws.id, legal_name="Empresa Ajena S.A."
            )
            other_session.add(foreign_org)
            await other_session.commit()
            await other_session.refresh(foreign_org)
            foreign_org_id = foreign_org.id

        inv = await _make_invoice(db, workspace.id, organization_id=foreign_org_id)
        party = await service.resolve_invoice_party(db, workspace.id, inv)
        assert party.is_empty, "An organization from another workspace must not resolve"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose exec backend pytest tests/test_company_profile.py::TestResolveInvoiceParty -v
```

Expected: FAIL — `AttributeError: module ... has no attribute 'resolve_invoice_party'`

- [ ] **Step 3: Implement**

Add to the imports in `backend/app/modules/accounting/service.py`:

```python
from dataclasses import dataclass

from app.modules.identity.models import Organization, Person
```

Append at the end of the file:

```python
# ── Customer resolution ───────────────────────────────────────────────────────

@dataclass
class InvoiceParty:
    """Customer details resolved for rendering on a document.

    Not a Pydantic schema — never serialized to the API, only consumed by the
    PDF and spreadsheet generators.
    """

    name: str | None = None
    contact_name: str | None = None
    email: str | None = None
    phone: str | None = None
    country: str | None = None

    @property
    def is_empty(self) -> bool:
        return self.name is None


async def resolve_invoice_party(
    db: AsyncSession, workspace_id: str, invoice: Invoice
) -> InvoiceParty:
    """Resolve an invoice's customer from identity records.

    Never raises: a null or dangling reference yields an empty InvoiceParty so
    that document generation always succeeds.
    """
    party = InvoiceParty()

    person: Person | None = None
    if invoice.contact_id:
        result = await db.execute(
            select(Person).where(
                Person.id == invoice.contact_id,
                Person.workspace_id == workspace_id,
            )
        )
        person = result.scalar_one_or_none()

    org: Organization | None = None
    if invoice.organization_id:
        result = await db.execute(
            select(Organization).where(
                Organization.id == invoice.organization_id,
                Organization.workspace_id == workspace_id,
            )
        )
        org = result.scalar_one_or_none()

    if org is not None:
        party.name = org.brand_name or org.legal_name
        party.country = org.country
        if person is not None:
            party.contact_name = person.full_name
    elif person is not None:
        party.name = person.full_name

    if person is not None:
        party.email = person.email
        party.phone = person.phone

    return party
```

The `workspace_id` filter on both queries is the cross-tenant guard the last test asserts.

- [ ] **Step 4: Run tests to verify they pass**

```bash
docker compose exec backend pytest tests/test_company_profile.py -v
```

Expected: 29 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/app/modules/accounting/service.py backend/tests/test_company_profile.py
git commit -m "feat(accounting): resolucion de cliente para documentos

resolve_invoice_party resuelve Organization y Person filtrando
siempre por workspace_id. Una referencia colgante degrada a vacio
en lugar de romper la generacion del documento.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: Unicode font support

**Files:**
- Create: `backend/app/modules/accounting/fonts.py`
- Modify: `backend/Dockerfile:6-9`
- Test: `backend/tests/test_invoice_pdf_rendering.py`

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces: `register_unicode_font(pdf: FPDF) -> str` — registers a Unicode TTF if available and returns the family name to pass as `FPDF.set_font(family, ...)`; returns `"Helvetica"` when no TTF is found. Also `FONT_CANDIDATES: list[tuple[str, str]]`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_invoice_pdf_rendering.py`:

```python
"""Tests for invoice PDF rendering, including issuer and customer blocks."""

from unittest.mock import patch

import pytest
from fpdf import FPDF

from app.modules.accounting.fonts import register_unicode_font


class TestFontRegistration:
    def test_returns_a_usable_family_name(self):
        pdf = FPDF()
        family = register_unicode_font(pdf)
        pdf.add_page()
        pdf.set_font(family, size=12)
        pdf.cell(0, 10, "Compania Nandu")  # must not raise

    def test_falls_back_to_helvetica_when_no_font_file_exists(self):
        pdf = FPDF()
        with patch("app.modules.accounting.fonts.FONT_CANDIDATES", []):
            family = register_unicode_font(pdf)
        assert family == "Helvetica"

    def test_fallback_still_produces_a_valid_pdf(self):
        pdf = FPDF()
        with patch("app.modules.accounting.fonts.FONT_CANDIDATES", []):
            family = register_unicode_font(pdf)
        pdf.add_page()
        pdf.set_font(family, size=12)
        pdf.cell(0, 10, "Compania Nandu")
        assert pdf.output().startswith(b"%PDF")
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose exec backend pytest tests/test_invoice_pdf_rendering.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.modules.accounting.fonts'`

- [ ] **Step 3: Create the font helper**

Create `backend/app/modules/accounting/fonts.py`:

```python
"""
Unicode font registration for invoice PDFs.

fpdf2's built-in Helvetica is latin-1 only, which mangles user-entered company
names and addresses. We register a Unicode TTF when one is available on the
system and fall back to Helvetica otherwise — a missing font must degrade the
typography, never break invoice generation.
"""
from __future__ import annotations

import logging
import os

from fpdf import FPDF

logger = logging.getLogger(__name__)

UNICODE_FAMILY = "DejaVu"

# (style, absolute path). Style "" is regular, "B" is bold.
FONT_CANDIDATES: list[tuple[str, str]] = [
    ("",  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    ("B", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
]


def register_unicode_font(pdf: FPDF) -> str:
    """Register a Unicode TTF on `pdf` and return the family name to use.

    Returns "Helvetica" when no usable font file is present.
    """
    available = [(style, path) for style, path in FONT_CANDIDATES if os.path.exists(path)]

    # The regular style is mandatory — bold alone is not a usable family.
    if not any(style == "" for style, _ in available):
        logger.warning(
            "No Unicode TTF found; falling back to Helvetica. "
            "Accented characters may render incorrectly."
        )
        return "Helvetica"

    for style, path in available:
        try:
            pdf.add_font(UNICODE_FAMILY, style=style, fname=path)
        except Exception:
            logger.warning("Could not register font %s (style=%r)", path, style)
            return "Helvetica"

    return UNICODE_FAMILY
```

- [ ] **Step 4: Install the font in the image**

Edit `backend/Dockerfile` lines 6-9:

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
```

- [ ] **Step 5: Rebuild the backend image**

```bash
docker compose build backend && docker compose up -d backend
```

Verify the font landed:

```bash
docker compose exec backend ls /usr/share/fonts/truetype/dejavu/
```

Expected: `DejaVuSans.ttf` and `DejaVuSans-Bold.ttf` listed.

- [ ] **Step 6: Run tests to verify they pass**

```bash
docker compose exec backend pytest tests/test_invoice_pdf_rendering.py -v
```

Expected: 3 passed.

- [ ] **Step 7: Commit**

```bash
git add backend/app/modules/accounting/fonts.py backend/Dockerfile backend/tests/test_invoice_pdf_rendering.py
git commit -m "feat(accounting): fuente Unicode para PDFs de factura

Helvetica es latin-1 y destroza acentos y enies en nombres de
empresa. Se registra DejaVu desde el paquete fonts-dejavu-core
con fallback a Helvetica si el archivo no existe.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7: Render issuer, logo and customer on the invoice PDF

**Files:**
- Modify: `backend/app/modules/accounting/pdf.py`
- Modify: `backend/app/modules/accounting/router.py:78-93`
- Test: `backend/tests/test_invoice_pdf_rendering.py`

**Interfaces:**
- Consumes: `register_unicode_font` (Task 6), `CompanyProfile` (Task 1), `InvoiceParty` + `resolve_invoice_party` (Task 5)
- Produces: `generate_invoice_pdf(invoice: Invoice, profile: CompanyProfile | None = None, party: InvoiceParty | None = None) -> bytes`

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/test_invoice_pdf_rendering.py`:

```python
import base64
from datetime import date

from app.modules.accounting.models import CompanyProfile, Invoice, InvoiceLine
from app.modules.accounting.pdf import generate_invoice_pdf
from app.modules.accounting.service import InvoiceParty


def _invoice(**kwargs) -> Invoice:
    """Build an unpersisted Invoice with one line — enough for rendering."""
    inv = Invoice(
        workspace_id="ws-1",
        invoice_number="INV-2026-0001",
        status="sent",
        issue_date=date(2026, 8, 3),
        due_date=date(2026, 9, 3),
        currency="USD",
        subtotal=1000.0,
        discount_amount=0.0,
        tax_rate=16.0,
        tax_amount=160.0,
        total=1160.0,
        amount_paid=0.0,
        amount_due=1160.0,
        **kwargs,
    )
    inv.lines = [
        InvoiceLine(
            line_order=0,
            description="Servicio de consultoria",
            quantity=10,
            unit_price=100.0,
            discount_pct=0.0,
            subtotal=1000.0,
        )
    ]
    inv.payments = []
    return inv


# A 1x1 transparent PNG — smallest valid image for logo tests.
_PNG_1PX = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)
_LOGO_URI = "data:image/png;base64," + base64.b64encode(_PNG_1PX).decode()


class TestBackwardsCompatibility:
    def test_no_profile_still_renders_cbos(self):
        """Hard requirement: existing behaviour must not change."""
        pdf_bytes = generate_invoice_pdf(_invoice())
        assert pdf_bytes.startswith(b"%PDF")
        assert len(pdf_bytes) > 1000

    def test_no_profile_call_signature_unchanged(self):
        """The single-argument call used by the existing endpoint must work."""
        assert generate_invoice_pdf(_invoice()).startswith(b"%PDF")

    def test_empty_profile_renders_without_raising(self):
        profile = CompanyProfile(workspace_id="ws-1")
        assert generate_invoice_pdf(_invoice(), profile=profile).startswith(b"%PDF")


class TestIssuerRendering:
    def test_renders_with_full_profile(self):
        profile = CompanyProfile(
            workspace_id="ws-1",
            legal_name="Compania Nandu S.A. de C.V.",
            tax_id="ABC010203XYZ",
            tax_id_label="RFC",
            address_line="Av. Reforma 123",
            city="Ciudad de Mexico",
            country="Mexico",
            email="hola@nandu.mx",
            invoice_footer_note="Gracias por su preferencia",
        )
        pdf_bytes = generate_invoice_pdf(_invoice(), profile=profile)
        assert pdf_bytes.startswith(b"%PDF")

    def test_accented_legal_name_does_not_raise(self):
        profile = CompanyProfile(
            workspace_id="ws-1", legal_name="Compañía Ñandú S.A. de C.V."
        )
        assert generate_invoice_pdf(_invoice(), profile=profile).startswith(b"%PDF")

    def test_renders_with_logo(self):
        profile = CompanyProfile(
            workspace_id="ws-1", legal_name="Acme", logo_data_uri=_LOGO_URI
        )
        assert generate_invoice_pdf(_invoice(), profile=profile).startswith(b"%PDF")

    def test_corrupt_logo_does_not_break_generation(self):
        """A bad stored logo must degrade, not take the invoice down."""
        profile = CompanyProfile(
            workspace_id="ws-1",
            legal_name="Acme",
            logo_data_uri="data:image/png;base64,zzzznotanimage",
        )
        assert generate_invoice_pdf(_invoice(), profile=profile).startswith(b"%PDF")


class TestCustomerRendering:
    def test_renders_customer_block(self):
        party = InvoiceParty(
            name="Cliente Ejemplo S.A.",
            contact_name="Maria Rodriguez",
            email="maria@example.com",
            country="Peru",
        )
        assert generate_invoice_pdf(_invoice(), party=party).startswith(b"%PDF")

    def test_empty_party_omits_the_block(self):
        assert generate_invoice_pdf(_invoice(), party=InvoiceParty()).startswith(b"%PDF")

    def test_invoice_with_no_lines_renders(self):
        inv = _invoice()
        inv.lines = []
        assert generate_invoice_pdf(inv).startswith(b"%PDF")
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose exec backend pytest tests/test_invoice_pdf_rendering.py -v
```

Expected: FAIL — `TypeError: generate_invoice_pdf() got an unexpected keyword argument 'profile'`

- [ ] **Step 3: Update `pdf.py`**

Replace the imports at the top of `backend/app/modules/accounting/pdf.py` with:

```python
from __future__ import annotations

import base64
import logging
import re
from datetime import date
from io import BytesIO
from typing import TYPE_CHECKING

from fpdf import FPDF

from app.modules.accounting.fonts import register_unicode_font
from app.modules.accounting.models import CompanyProfile, Invoice

if TYPE_CHECKING:
    from app.modules.accounting.service import InvoiceParty

logger = logging.getLogger(__name__)

_DATA_URI_RE = re.compile(r"^data:image/(png|jpeg);base64,")
```

`InvoiceParty` is imported under `TYPE_CHECKING` because `service.py` imports from `pdf.py`'s sibling modules; a runtime import here would create a cycle.

Add these helpers after the existing `_status_label` function:

```python
def _decode_logo(profile: CompanyProfile | None) -> BytesIO | None:
    """Decode the stored logo into a stream fpdf2 can embed.

    Returns None for any problem — a bad logo must never break generation.
    """
    if profile is None or not profile.logo_data_uri:
        return None

    match = _DATA_URI_RE.match(profile.logo_data_uri)
    if not match:
        logger.warning("Stored logo is not a supported data URI; skipping")
        return None

    try:
        return BytesIO(base64.b64decode(profile.logo_data_uri[match.end():]))
    except Exception:
        logger.warning("Stored logo could not be decoded; skipping")
        return None


def _issuer_lines(profile: CompanyProfile | None) -> list[str]:
    """Build the issuer detail lines, skipping empty fields entirely."""
    if profile is None:
        return []

    lines: list[str] = []
    if profile.tax_id:
        lines.append(f"{profile.tax_id_label or 'ID'}: {profile.tax_id}")

    locality = " ".join(
        part for part in [profile.postal_code, profile.city, profile.state] if part
    )
    if profile.address_line:
        lines.append(profile.address_line)
    if locality:
        lines.append(locality)
    if profile.country:
        lines.append(profile.country)

    contact = "  ".join(
        part for part in [profile.email, profile.phone, profile.website] if part
    )
    if contact:
        lines.append(contact)

    return lines


def _customer_lines(party: "InvoiceParty | None") -> list[str]:
    if party is None or party.is_empty:
        return []

    lines = [party.name]
    if party.contact_name:
        lines.append(f"Atn: {party.contact_name}")
    contact = "  ".join(part for part in [party.email, party.phone] if part)
    if contact:
        lines.append(contact)
    if party.country:
        lines.append(party.country)
    return lines
```

Now change `InvoicePDF.__init__` and `footer` to carry the family name and footer note:

```python
class InvoicePDF(FPDF):
    """Custom FPDF subclass — adds header/footer."""

    def __init__(self, invoice_number: str):
        super().__init__(unit="mm", format="A4")
        self._invoice_number = invoice_number
        self._family = "Helvetica"      # replaced by register_unicode_font
        self._footer_note: str | None = None

    def footer(self):
        self.set_y(-12)
        self.set_font(self._family, size=8)
        self.set_text_color(*_MUTED)
        base = f"Factura {self._invoice_number}  |  Generado por CBOS"
        text = f"{self._footer_note}  |  {base}" if self._footer_note else base
        self.cell(0, 5, text, align="C")
```

Change the `generate_invoice_pdf` signature and the header section. Replace lines 79-104 of the original file with:

```python
def generate_invoice_pdf(
    invoice: Invoice,
    profile: CompanyProfile | None = None,
    party: "InvoiceParty | None" = None,
) -> bytes:
    """
    Build a PDF for the given Invoice ORM object (with .lines loaded).

    `profile` and `party` are optional: with neither, output matches the
    original hardcoded-issuer rendition exactly.
    """
    pdf = InvoicePDF(invoice.invoice_number)
    family = register_unicode_font(pdf)
    pdf._family = family
    if profile is not None:
        pdf._footer_note = profile.invoice_footer_note
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_margins(left=15, top=15, right=15)

    page_w = pdf.w - 30  # usable width

    issuer_name = (profile.legal_name if profile and profile.legal_name else "CBOS")
    logo = _decode_logo(profile)

    # ── Header bar ────────────────────────────────────────────────────────────
    pdf.set_fill_color(*_PURPLE)
    pdf.rect(15, 15, page_w, 18, style="F")

    text_x = 15
    if logo is not None:
        try:
            pdf.image(logo, x=17, y=17, h=14)
            text_x = 17 + 16
        except Exception:
            logger.warning("Logo could not be embedded; rendering text only")

    pdf.set_xy(text_x, 15)
    pdf.set_font(family, style="B", size=14)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(page_w / 2, 18, issuer_name, align="L")

    pdf.set_xy(15 + page_w / 2, 15)
    pdf.set_font(family, style="B", size=14)
    pdf.cell(page_w / 2, 18, "FACTURA", align="R")

    pdf.ln(20)

    # ── Issuer / customer blocks ──────────────────────────────────────────────
    issuer = _issuer_lines(profile)
    customer = _customer_lines(party)

    if issuer or customer:
        block_top = pdf.get_y()
        pdf.set_font(family, size=8)

        if issuer:
            pdf.set_text_color(*_MUTED)
            pdf.set_xy(15, block_top)
            for text in issuer:
                pdf.set_x(15)
                pdf.cell(page_w / 2, 4, text)
                pdf.ln(4)

        if customer:
            pdf.set_xy(15 + page_w / 2, block_top)
            pdf.set_text_color(*_MUTED)
            pdf.cell(page_w / 2, 4, "Cliente", align="R")
            pdf.ln(4)
            pdf.set_text_color(*_DARK)
            for text in customer:
                pdf.set_x(15 + page_w / 2)
                pdf.cell(page_w / 2, 4, text, align="R")
                pdf.ln(4)

        pdf.set_y(max(pdf.get_y(), block_top + 4 * max(len(issuer), len(customer))))
        pdf.ln(4)
```

Then, throughout the rest of the function, replace every `"Helvetica"` literal in `pdf.set_font(...)` calls with `family`. There are occurrences at the original lines 112, 118, 132, 145, 172, 182, 214, 232, 256 and 261, plus the `_total_row` closure — pass `family` into it or read it from the enclosing scope.

- [ ] **Step 4: Run tests to verify they pass**

```bash
docker compose exec backend pytest tests/test_invoice_pdf_rendering.py -v
```

Expected: 13 passed. If `test_no_profile_still_renders_cbos` fails, stop — the backwards-compatibility contract is broken and must be fixed before continuing.

- [ ] **Step 5: Wire profile and party into the endpoint**

In `backend/app/modules/accounting/router.py`, replace the body of `download_invoice_pdf` (lines 86-93):

```python
    inv = await service.get_invoice(db, workspace_id, invoice_id)
    profile = await service.get_or_create_company_profile(db, workspace_id)
    party = await service.resolve_invoice_party(db, workspace_id, inv)
    pdf_bytes = generate_invoice_pdf(inv, profile=profile, party=party)
    filename = f"{inv.invoice_number}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
```

- [ ] **Step 6: Verify the endpoint end to end**

Append to `backend/tests/test_invoice_pdf_rendering.py`:

```python
class TestPdfEndpoint:
    @pytest.mark.asyncio
    async def test_downloads_pdf_with_configured_issuer(self, client, auth_headers):
        await client.put(
            "/api/v1/accounting/company-profile",
            json={"legal_name": "Compania Nandu S.A.", "tax_id": "ABC010203XYZ"},
            headers=auth_headers,
        )
        created = await client.post(
            "/api/v1/accounting/invoices",
            json={
                "issue_date": "2026-08-03",
                "currency": "USD",
                "tax_rate": 16,
                "lines": [
                    {"description": "Consultoria", "quantity": 10, "unit_price": 100}
                ],
            },
            headers=auth_headers,
        )
        assert created.status_code == 201
        invoice_id = created.json()["id"]

        resp = await client.get(
            f"/api/v1/accounting/invoices/{invoice_id}/pdf", headers=auth_headers
        )
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
        assert resp.content.startswith(b"%PDF")
```

Run:

```bash
docker compose exec backend pytest tests/test_invoice_pdf_rendering.py -v
```

Expected: 14 passed.

- [ ] **Step 7: Run the full backend suite**

```bash
docker compose exec backend pytest tests/ -v --tb=short
```

Expected: no new failures. Compare against the pre-existing baseline — if a test was already failing on `master`, it is not yours to fix here.

- [ ] **Step 8: Commit**

```bash
git add backend/app/modules/accounting/pdf.py backend/app/modules/accounting/router.py backend/tests/test_invoice_pdf_rendering.py
git commit -m "feat(accounting): emisor, logo y cliente en el PDF de factura

generate_invoice_pdf acepta profile y party opcionales. Sin ellos
la salida es identica a la anterior, que es lo que garantiza el
test de regresion de CBOS. Un logo corrupto se ignora en lugar de
tumbar la generacion.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 8: Frontend service layer

**Files:**
- Modify: `composable-os/src/services/accounting.ts`

**Interfaces:**
- Consumes: the endpoints from Task 4
- Produces: `CompanyProfile`, `UpdateCompanyProfileDto` types; `accountingService.getCompanyProfile()`, `accountingService.updateCompanyProfile(dto)`

- [ ] **Step 1: Add the types**

Append to the interface section of `composable-os/src/services/accounting.ts`, before `export const accountingService`:

```ts
export interface CompanyProfile {
  id: string;
  workspace_id: string;
  legal_name: string | null;
  tax_id: string | null;
  tax_id_label: string;
  address_line: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  logo_data_uri: string | null;
  default_currency: string;
  default_tax_rate: number;
  invoice_footer_note: string | null;
  created_at: string;
  updated_at: string;
}

export type UpdateCompanyProfileDto = Partial<
  Omit<CompanyProfile, "id" | "workspace_id" | "created_at" | "updated_at">
>;
```

- [ ] **Step 2: Add the methods**

Add inside the `accountingService` object, after `recordPayment`:

```ts
  getCompanyProfile: () =>
    api.get<CompanyProfile>("/accounting/company-profile"),

  updateCompanyProfile: (dto: UpdateCompanyProfileDto) =>
    api.put<CompanyProfile>("/accounting/company-profile", dto),
```

- [ ] **Step 3: Verify it type-checks**

```bash
cd composable-os && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add composable-os/src/services/accounting.ts
git commit -m "feat(frontend): tipos y metodos de company-profile en el servicio de accounting

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 9: Settings page and routing

**Files:**
- Create: `composable-os/src/pages/CompanyProfileSettings.tsx`
- Modify: `composable-os/src/App.tsx` (import block ~line 25, route block ~line 83)
- Modify: `composable-os/src/pages/Invoicing.tsx` (page header, ~line 444)

**Interfaces:**
- Consumes: `accountingService.getCompanyProfile`, `accountingService.updateCompanyProfile`, `CompanyProfile`, `UpdateCompanyProfileDto` (Task 8)
- Produces: route `/settings/company`

- [ ] **Step 1: Create the page**

Create `composable-os/src/pages/CompanyProfileSettings.tsx`:

```tsx
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Upload, Trash2, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  accountingService,
  type CompanyProfile,
  type UpdateCompanyProfileDto,
} from "@/services/accounting";

const MAX_LOGO_BYTES = 204_800;
const ACCEPTED_LOGO_TYPES = ["image/png", "image/jpeg"];

type FormState = UpdateCompanyProfileDto;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function CompanyProfileSettings() {
  const [form, setForm] = useState<FormState>({});
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["company-profile"],
    queryFn: accountingService.getCompanyProfile,
  });

  // Seed the form once the profile arrives.
  useEffect(() => {
    if (profile) {
      const { id, workspace_id, created_at, updated_at, ...rest } = profile;
      setForm(rest);
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: () => accountingService.updateCompanyProfile(form),
    onSuccess: (updated: CompanyProfile) => {
      qc.setQueryData(["company-profile"], updated);
      toast({ title: "Datos guardados" });
    },
    onError: (e: Error) =>
      toast({ title: "No se pudo guardar", description: e.message, variant: "destructive" }),
  });

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onLogoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    // Validate before uploading so the user gets instant feedback.
    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      toast({
        title: "Formato no admitido",
        description: "El logo debe ser PNG o JPG.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast({
        title: "Logo demasiado grande",
        description: `Pesa ${Math.round(file.size / 1024)} KB y el maximo son 200 KB.`,
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => set("logo_data_uri", reader.result as string);
    reader.onerror = () =>
      toast({ title: "No se pudo leer el archivo", variant: "destructive" });
    reader.readAsDataURL(file);
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" /> Datos de facturación
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Estos datos aparecen como emisor en las facturas impresas y exportadas
          </p>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending
            ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            : <Save className="h-4 w-4 mr-2" />}
          Guardar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Identidad</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 border rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden shrink-0">
              {form.logo_data_uri
                ? <img src={form.logo_data_uri} alt="Logo" className="max-h-full max-w-full object-contain" />
                : <Building2 className="h-8 w-8 text-muted-foreground/40" />}
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild>
                  <label className="cursor-pointer">
                    <Upload className="h-3.5 w-3.5 mr-1" /> Subir logo
                    <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={onLogoSelected} />
                  </label>
                </Button>
                {form.logo_data_uri && (
                  <Button size="sm" variant="ghost" onClick={() => set("logo_data_uri", null)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Quitar
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">PNG o JPG, máximo 200 KB</p>
            </div>
          </div>

          <Field label="Razón social">
            <Input value={form.legal_name ?? ""} onChange={(e) => set("legal_name", e.target.value)} placeholder="Mi Empresa S.A. de C.V." />
          </Field>

          <div className="grid grid-cols-[120px_1fr] gap-3">
            <Field label="Tipo de ID">
              <Select value={form.tax_id_label ?? "RFC"} onValueChange={(v) => set("tax_id_label", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["RFC", "NIT", "CUIT", "RUC", "VAT", "EIN"].map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Identificador fiscal">
              <Input value={form.tax_id ?? ""} onChange={(e) => set("tax_id", e.target.value)} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Dirección</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Calle y número">
            <Input value={form.address_line ?? ""} onChange={(e) => set("address_line", e.target.value)} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Ciudad">
              <Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="Estado / Provincia">
              <Input value={form.state ?? ""} onChange={(e) => set("state", e.target.value)} />
            </Field>
            <Field label="Código postal">
              <Input value={form.postal_code ?? ""} onChange={(e) => set("postal_code", e.target.value)} />
            </Field>
          </div>
          <Field label="País">
            <Input value={form.country ?? ""} onChange={(e) => set("country", e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Contacto</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-3">
          <Field label="Email">
            <Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Teléfono">
            <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Sitio web">
            <Input value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Valores por defecto</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Moneda">
              <Select value={form.default_currency ?? "USD"} onValueChange={(v) => set("default_currency", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["USD", "MXN", "EUR", "COP", "BRL"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="IVA por defecto (%)">
              <Input
                type="number" min="0" max="100" step="0.1"
                value={form.default_tax_rate ?? 0}
                onChange={(e) => set("default_tax_rate", parseFloat(e.target.value) || 0)}
              />
            </Field>
          </div>
          <Field label="Nota al pie de la factura">
            <Textarea
              rows={2}
              placeholder="Gracias por su preferencia · Condiciones de pago…"
              value={form.invoice_footer_note ?? ""}
              onChange={(e) => set("invoice_footer_note", e.target.value)}
            />
          </Field>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Register the route**

In `composable-os/src/App.tsx`, add to the import block after line 25:

```tsx
import CompanyProfileSettings from "./pages/CompanyProfileSettings";
```

and add the route immediately after the `/settings` route (line 83):

```tsx
                <Route path="/settings/company" element={<CompanyProfileSettings />} />
```

- [ ] **Step 3: Add the entry point on the Facturación page**

In `composable-os/src/pages/Invoicing.tsx`, add `Building2` to the `lucide-react` import on lines 4-7, add `import { Link } from "react-router-dom";` to the imports, and replace the header action area (around line 444):

```tsx
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/settings/company">
              <Building2 className="h-4 w-4 mr-2" /> Datos de facturación
            </Link>
          </Button>
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nueva factura
          </Button>
        </div>
```

- [ ] **Step 4: Verify it type-checks and builds**

```bash
cd composable-os && npx tsc --noEmit && npm run build
```

Expected: no errors.

- [ ] **Step 5: Verify manually in the browser**

Start the stack, log in, and go to `/settings/company`. Check each of:
1. The page loads with empty fields (no 404, no error toast).
2. Filling in razón social and identificador fiscal, then Guardar, shows "Datos guardados".
3. Reloading the page keeps the saved values.
4. Uploading a PNG under 200 KB shows the preview; "Quitar" clears it; Guardar persists both.
5. Selecting a file over 200 KB shows the error toast **without** a network request (check the Network tab).
6. Going to `/invoicing`, opening any invoice and downloading its PDF shows the configured razón social instead of "CBOS", and the logo if one was set.

- [ ] **Step 6: Commit**

```bash
git add composable-os/src/pages/CompanyProfileSettings.tsx composable-os/src/App.tsx composable-os/src/pages/Invoicing.tsx
git commit -m "feat(frontend): pantalla de datos de facturacion

Formulario de emisor con subida de logo validada en cliente antes
de enviar, en su propia ruta /settings/company. Settings.tsx es un
panel de infraestructura y no es el sitio para configuracion de
negocio.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Final Verification

- [ ] **Full backend suite**

```bash
docker compose exec backend pytest tests/ -v --tb=short
```

Expected: no new failures versus the `master` baseline.

- [ ] **Migration round-trip from scratch**

```bash
docker compose exec backend alembic downgrade -1 && docker compose exec backend alembic upgrade head
```

- [ ] **Frontend build**

```bash
cd composable-os && npx tsc --noEmit && npm run build
```

- [ ] **Confirm the Definition of Done in the spec**

Re-read `docs/superpowers/specs/2026-08-03-company-profile-design.md` and tick each box. Anything unticked is unfinished work, not an optional extra.

---

## Self-Review Notes

Checked against the spec:

- **Spec coverage** — every spec section maps to a task: data model → 1, API → 2+4, customer resolution → 5, PDF integration → 6+7, frontend → 8+9, error handling → distributed across 3/4/7, testing → every task.
- **One deliberate deviation**, flagged at the top: the font is installed via apt rather than vendored into the repo.
- **Type consistency** — `CompanyProfile`, `CompanyProfileUpdate`, `CompanyProfileRead`, `InvoiceParty`, `register_unicode_font`, `resolve_invoice_party`, `get_or_create_company_profile` and `update_company_profile` are spelled identically everywhere they appear, backend and frontend.
- **Known limitation carried forward** — the customer block cannot show the customer's tax ID or address because `Organization` has no such columns. Recorded in the spec's Out of Scope; not silently worked around here.
