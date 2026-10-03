"""
De donde sale el idioma del PDF (ADR 0016, punto 3 y tarea 10 del plan de i18n).

`GET /accounting/invoices/{id}/pdf` ya inyectaba al usuario y lo descartaba: el
idioma sale de ahi, no de negociacion. Orden: `user.locale` -> `workspace.default_locale`
-> `es`. Lo resuelve `resolve_user_locale`, que es tambien lo que usa `/auth/me`,
para que dos sitios no lean `users.locale` por su cuenta.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import update

from app.core.deps import resolve_user_locale
from app.modules.identity.models import User, Workspace

pytestmark = pytest.mark.asyncio

BASE = "/api/v1/accounting"
AUTH = "/api/v1/auth"


async def _invoice(client: AsyncClient, headers: dict) -> dict:
    resp = await client.post(
        f"{BASE}/invoices",
        headers=headers,
        json={
            "issue_date": "2026-04-11",
            "lines": [{"description": "Servicio", "quantity": 1.0, "unit_price": 100.0}],
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _set(session_factory, user: User, *, user_locale=None, workspace_locale="es"):
    async with session_factory() as session:
        await session.execute(update(User).where(User.id == user.id).values(locale=user_locale))
        await session.execute(
            update(Workspace).where(Workspace.id == user.workspace_id).values(default_locale=workspace_locale)
        )
        await session.commit()


@pytest.fixture
def captured(monkeypatch):
    """Sustituye el generador por uno que anota con que idioma lo llamaron."""
    calls: list[dict] = []

    def fake(invoice, profile=None, party=None, locale="es"):
        calls.append({"locale": locale})
        return b"%PDF-fake"

    monkeypatch.setattr("app.modules.accounting.router.generate_invoice_pdf", fake)
    return calls


# ── La ruta ──────────────────────────────────────────────────────────────────


async def test_the_real_pdf_is_served(client: AsyncClient, auth_headers: dict):
    inv = await _invoice(client, auth_headers)

    resp = await client.get(f"{BASE}/invoices/{inv['id']}/pdf", headers=auth_headers)

    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content.startswith(b"%PDF")


async def test_the_default_locale_is_spanish(client: AsyncClient, auth_headers: dict, captured):
    inv = await _invoice(client, auth_headers)

    await client.get(f"{BASE}/invoices/{inv['id']}/pdf", headers=auth_headers)

    assert captured == [{"locale": "es"}]


async def test_the_workspace_default_applies_when_the_user_has_no_preference(
    client: AsyncClient, auth_headers: dict, test_user: User, session_factory, captured
):
    await _set(session_factory, test_user, workspace_locale="es-419")
    inv = await _invoice(client, auth_headers)

    await client.get(f"{BASE}/invoices/{inv['id']}/pdf", headers=auth_headers)

    assert captured == [{"locale": "es-419"}]


async def test_the_users_own_locale_wins_over_the_workspace(
    client: AsyncClient, auth_headers: dict, test_user: User, session_factory, captured
):
    await _set(session_factory, test_user, user_locale="es-MX", workspace_locale="es-419")
    inv = await _invoice(client, auth_headers)

    await client.get(f"{BASE}/invoices/{inv['id']}/pdf", headers=auth_headers)

    assert captured == [{"locale": "es-MX"}]


async def test_accept_language_does_not_choose_the_pdf_language(
    client: AsyncClient, auth_headers: dict, captured
):
    # ADR 0016: la cabecera solo cuenta en el registro.
    inv = await _invoice(client, auth_headers)

    await client.get(
        f"{BASE}/invoices/{inv['id']}/pdf", headers={**auth_headers, "Accept-Language": "fr"}
    )

    assert captured == [{"locale": "es"}]


# ── resolve_user_locale ──────────────────────────────────────────────────────


async def test_resolve_user_locale_follows_the_chain(test_user: User, session_factory):
    async with session_factory() as session:
        assert await resolve_user_locale(session, test_user) == "es"

    await _set(session_factory, test_user, workspace_locale="es-419")
    async with session_factory() as session:
        user = await session.get(User, test_user.id)
        assert await resolve_user_locale(session, user) == "es-419"

    await _set(session_factory, test_user, user_locale="es-MX", workspace_locale="es-419")
    async with session_factory() as session:
        user = await session.get(User, test_user.id)
        assert await resolve_user_locale(session, user) == "es-MX"


async def test_a_stored_locale_without_catalogue_is_skipped(test_user: User, session_factory):
    # Retirar un idioma no puede dejar a nadie sin uno ni romper el render.
    await _set(session_factory, test_user, user_locale="fr", workspace_locale="es-419")

    async with session_factory() as session:
        user = await session.get(User, test_user.id)
        assert await resolve_user_locale(session, user) == "es-419"


async def test_auth_me_and_the_pdf_agree_on_the_locale(
    client: AsyncClient, auth_headers: dict, test_user: User, session_factory, captured
):
    await _set(session_factory, test_user, user_locale="es-MX", workspace_locale="es-419")
    inv = await _invoice(client, auth_headers)

    me = await client.get(f"{AUTH}/me", headers=auth_headers)
    await client.get(f"{BASE}/invoices/{inv['id']}/pdf", headers=auth_headers)

    assert me.json()["effective_locale"] == captured[0]["locale"] == "es-MX"
