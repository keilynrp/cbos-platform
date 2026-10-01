"""
Locale en el modelo y en la API (ADR 0016, tarea 2 del plan de i18n).

Cubre las tres columnas —`users.locale`, `workspaces.default_locale`,
`portal_sessions.locale`—, el PATCH del locale propio, el unico sitio donde
`Accept-Language` importa (el registro) y el campo en `PortalSessionCreate`.

Hasta la tarea 12 el unico catalogo enviado es `es`: los casos "valido" usan
`es` y `es-MX`, y "no soportado" usa `fr`. Ese `fr` dejara de servir el dia que
se envie un segundo idioma; el test de `test_locale_resolution.py` que fija
`SUPPORTED_LOCALES == ("es",)` es el aviso.
"""
import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

AUTH = "/api/v1/auth"
SALES = "/api/v1/sales"
PORTAL = "/api/v1/portal"

REGISTER = {
    "full_name": "Ana Lopez",
    "email": "ana@locale.example.com",
    "password": "securepass123",
    "workspace_name": "Locale Inc",
    "workspace_slug": "locale-inc",
}


# ── Defaults del modelo ──────────────────────────────────────────────────────


async def test_user_locale_is_null_by_default(client: AsyncClient, auth_headers: dict):
    resp = await client.get(f"{AUTH}/me", headers=auth_headers)
    assert resp.status_code == 200
    assert "locale" in resp.json()
    assert resp.json()["locale"] is None


async def test_workspace_default_locale_is_es(client: AsyncClient, auth_headers: dict):
    # El backfill de la migracion es "es": no cambia ni una cadena renderizada.
    resp = await client.get("/api/v1/workspaces/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["default_locale"] == "es"


# ── PATCH /auth/me ───────────────────────────────────────────────────────────


async def test_patch_own_locale_persists(client: AsyncClient, auth_headers: dict):
    resp = await client.patch(f"{AUTH}/me", json={"locale": "es"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["locale"] == "es"

    again = await client.get(f"{AUTH}/me", headers=auth_headers)
    assert again.json()["locale"] == "es"


async def test_patch_locale_keeps_the_region_subtag_canonicalised(
    client: AsyncClient, auth_headers: dict
):
    resp = await client.patch(
        f"{AUTH}/me", json={"locale": "es_mx"}, headers=auth_headers
    )
    assert resp.status_code == 200
    assert resp.json()["locale"] == "es-MX"


async def test_patch_null_returns_the_user_to_following_the_workspace(
    client: AsyncClient, auth_headers: dict
):
    await client.patch(f"{AUTH}/me", json={"locale": "es"}, headers=auth_headers)
    resp = await client.patch(f"{AUTH}/me", json={"locale": None}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["locale"] is None


@pytest.mark.parametrize("bad", ["fr", "xx", "spanish", "es-MX-extra", "", "  "])
async def test_patch_unsupported_locale_is_rejected_with_a_registered_code(
    client: AsyncClient, auth_headers: dict, bad: str
):
    # Rechazo explicito y no caida silenciosa: un ajuste de idioma que no hace
    # nada sin explicar por que es exactamente lo que el ADR 0016 quiere evitar.
    resp = await client.patch(f"{AUTH}/me", json={"locale": bad}, headers=auth_headers)
    assert resp.status_code == 422
    err = resp.json()["error"]
    assert err["code"] == "IDENTITY_LOCALE_UNSUPPORTED"
    assert err["detail"]["supported"] == ["es"]


async def test_rejected_locale_does_not_change_the_stored_one(
    client: AsyncClient, auth_headers: dict
):
    await client.patch(f"{AUTH}/me", json={"locale": "es"}, headers=auth_headers)
    await client.patch(f"{AUTH}/me", json={"locale": "fr"}, headers=auth_headers)
    resp = await client.get(f"{AUTH}/me", headers=auth_headers)
    assert resp.json()["locale"] == "es"


async def test_patch_me_requires_the_locale_key(client: AsyncClient, auth_headers: dict):
    # Ausente y `null` significan cosas distintas ("no toques" vs "sigue al
    # workspace"); con un cuerpo vacio no hay forma de saber cual se pidio.
    resp = await client.patch(f"{AUTH}/me", json={}, headers=auth_headers)
    assert resp.status_code == 422


async def test_patch_me_requires_auth(client: AsyncClient):
    resp = await client.patch(f"{AUTH}/me", json={"locale": "es"})
    assert resp.status_code == 401


# ── Registro: el unico sitio donde Accept-Language importa ───────────────────


async def _register(client: AsyncClient, accept_language: str | None) -> dict:
    headers = {"Accept-Language": accept_language} if accept_language else {}
    resp = await client.post(f"{AUTH}/register", json=REGISTER, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _workspace_and_me(client: AsyncClient, tokens: dict) -> tuple[dict, dict]:
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    ws = await client.get("/api/v1/workspaces/me", headers=headers)
    me = await client.get(f"{AUTH}/me", headers=headers)
    return ws.json(), me.json()


async def test_register_without_header_defaults_to_es(client: AsyncClient):
    ws, me = await _workspace_and_me(client, await _register(client, None))
    assert ws["default_locale"] == "es"
    assert me["locale"] is None


async def test_register_takes_the_default_from_accept_language(client: AsyncClient):
    ws, me = await _workspace_and_me(
        client, await _register(client, "es-MX,es;q=0.9,en;q=0.8")
    )
    assert ws["default_locale"] == "es-MX"
    # El usuario no expreso preferencia: sigue al workspace, no la copia.
    assert me["locale"] is None


async def test_register_with_an_unshipped_language_falls_back_to_es(
    client: AsyncClient,
):
    ws, _ = await _workspace_and_me(client, await _register(client, "fr-FR,fr;q=0.9"))
    assert ws["default_locale"] == "es"


# ── PortalSession.locale ─────────────────────────────────────────────────────


async def _quote(client: AsyncClient, headers: dict) -> str:
    resp = await client.post(f"{SALES}/quotes", headers=headers, json={
        "title": "Locale Quote",
        "currency": "USD",
        "tax_rate": 0.0,
        "discount_amount": 0.0,
        "lines": [{
            "description": "Service",
            "quantity": 1,
            "unit_price": 100.0,
            "discount_percent": 0.0,
            "line_order": 1,
        }],
    })
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


async def test_portal_session_locale_is_null_when_not_given(
    client: AsyncClient, auth_headers: dict
):
    quote_id = await _quote(client, auth_headers)
    resp = await client.post(
        f"{PORTAL}/sessions", json={"quote_id": quote_id}, headers=auth_headers
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["locale"] is None


async def test_portal_session_stores_the_locale_of_the_share(
    client: AsyncClient, auth_headers: dict
):
    quote_id = await _quote(client, auth_headers)
    resp = await client.post(
        f"{PORTAL}/sessions",
        json={"quote_id": quote_id, "locale": "es_mx"},
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["locale"] == "es-MX"

    listed = await client.get(f"{PORTAL}/sessions", headers=auth_headers)
    assert listed.json()[0]["locale"] == "es-MX"


async def test_portal_session_rejects_an_unsupported_locale(
    client: AsyncClient, auth_headers: dict
):
    quote_id = await _quote(client, auth_headers)
    resp = await client.post(
        f"{PORTAL}/sessions",
        json={"quote_id": quote_id, "locale": "fr"},
        headers=auth_headers,
    )
    assert resp.status_code == 422
    err = resp.json()["error"]
    assert err["code"] == "PORTAL_LOCALE_UNSUPPORTED"
    assert err["detail"]["supported"] == ["es"]
