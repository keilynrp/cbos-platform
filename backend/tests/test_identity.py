"""
Identity module integration tests.
Covers: register, login, /auth/me, token refresh.
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


# ── Helpers ───────────────────────────────────────────────────────────────────

REGISTER_PAYLOAD = {
    "full_name": "John Doe",
    "email": "john@acme.example.com",
    "password": "securepass123",
    "workspace_name": "Acme Inc",
    "workspace_slug": "acme-inc",
}


async def _register_fresh(client: AsyncClient, slug_suffix: str = "") -> dict:
    payload = {**REGISTER_PAYLOAD, "workspace_slug": f"acme{slug_suffix}"}
    if slug_suffix:
        payload["email"] = f"john{slug_suffix}@acme.example.com"
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── Tests ─────────────────────────────────────────────────────────────────────

async def test_register_creates_workspace_and_returns_tokens(client: AsyncClient):
    data = await _register_fresh(client, "-reg1")
    assert "access_token" in data
    assert "refresh_token" in data


async def test_register_duplicate_slug_returns_409(client: AsyncClient):
    await _register_fresh(client, "-dup")
    resp = await client.post("/api/v1/auth/register", json={
        **REGISTER_PAYLOAD,
        "workspace_slug": "acme-dup",
        "email": "other@acme.example.com",
    })
    assert resp.status_code == 409


async def test_register_duplicate_email_returns_409(client: AsyncClient):
    await _register_fresh(client, "-email1")
    resp = await client.post("/api/v1/auth/register", json={
        **REGISTER_PAYLOAD,
        "workspace_slug": "acme-email2",
        "email": "john-email1@acme.example.com",
    })
    assert resp.status_code == 409


async def test_login_correct_credentials(client: AsyncClient):
    await _register_fresh(client, "-login1")
    resp = await client.post("/api/v1/auth/login", json={
        "email": "john-login1@acme.example.com",
        "password": "securepass123",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data


async def test_login_wrong_password_returns_401(client: AsyncClient):
    await _register_fresh(client, "-wrongpw")
    resp = await client.post("/api/v1/auth/login", json={
        "email": "johnwrongpw@acme.example.com",
        "password": "wrongpassword",
    })
    assert resp.status_code == 401


async def test_get_me_with_valid_token(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "owner@test.corp"


async def test_get_me_without_token_returns_401(client: AsyncClient):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


async def test_refresh_token(client: AsyncClient):
    tokens = await _register_fresh(client, "-refresh1")
    resp = await client.post("/api/v1/auth/refresh", json={
        "refresh_token": tokens["refresh_token"],
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


# ── Error envelope (ADR 0010) ────────────────────────────────────────────────
#
# Aqui el contrato tiene ademas una propiedad de seguridad: dos causas
# distintas deben ser indistinguibles desde fuera. Ver la regla 7 del registro.


def _error(resp) -> dict:
    body = resp.json()
    assert "error" in body, body
    return body["error"]


async def test_login_failures_are_indistinguishable(client: AsyncClient):
    """Email desconocido y contrasena incorrecta responden exactamente igual.

    Si algun dia se separan en dos codigos, el login pasa a ser un oraculo de
    que correos estan registrados. Este test es lo que lo impide.
    """
    await _register_fresh(client, "-oracle")

    unknown_email = await client.post("/api/v1/auth/login", json={
        "email": "nobody-here@acme.example.com",
        "password": "securepass123",
    })
    wrong_password = await client.post("/api/v1/auth/login", json={
        "email": "john-oracle@acme.example.com",
        "password": "definitely-not-the-password",
    })

    assert unknown_email.status_code == wrong_password.status_code == 401
    assert _error(unknown_email) == _error(wrong_password)
    assert _error(unknown_email)["code"] == "IDENTITY_INVALID_CREDENTIALS"
    # Sin detail: nada que permita inferir cual de las dos ramas se tomo.
    assert "detail" not in _error(unknown_email)


async def test_register_duplicate_slug_error_shape(client: AsyncClient):
    await _register_fresh(client, "-slugshape")
    resp = await client.post("/api/v1/auth/register", json={
        **REGISTER_PAYLOAD,
        "workspace_slug": "acme-slugshape",
        "email": "other-slugshape@acme.example.com",
    })

    assert resp.status_code == 409
    error = _error(resp)
    assert error["code"] == "IDENTITY_WORKSPACE_SLUG_TAKEN"
    assert error["detail"]["slug"] == "acme-slugshape"


async def test_register_duplicate_email_error_shape(client: AsyncClient):
    await _register_fresh(client, "-emailshape")
    resp = await client.post("/api/v1/auth/register", json={
        **REGISTER_PAYLOAD,
        "workspace_slug": "acme-emailshape2",
        "email": "john-emailshape@acme.example.com",
    })

    assert resp.status_code == 409
    error = _error(resp)
    assert error["code"] == "IDENTITY_EMAIL_TAKEN"
    # El correo no vuelve en el cuerpo: el 409 ya dice lo suficiente.
    assert "detail" not in error


async def test_refresh_with_garbage_token_error_shape(client: AsyncClient):
    resp = await client.post("/api/v1/auth/refresh", json={
        "refresh_token": "not-a-real-token",
    })

    assert resp.status_code == 401
    assert _error(resp)["code"] == "IDENTITY_REFRESH_TOKEN_INVALID"


async def test_missing_token_error_shape(client: AsyncClient):
    """Lo levanta core/deps.py, no el modulo, y conserva WWW-Authenticate."""
    resp = await client.get("/api/v1/auth/me")

    assert resp.status_code == 401
    assert _error(resp)["code"] == "AUTH_TOKEN_INVALID"
    assert resp.headers["www-authenticate"] == "Bearer"


async def test_invalid_token_error_shape(client: AsyncClient):
    resp = await client.get(
        "/api/v1/auth/me", headers={"Authorization": "Bearer garbage.token.value"}
    )

    assert resp.status_code == 401
    # Mismo codigo que el token ausente: no se distingue "no mandaste token" de
    # "mandaste uno malo".
    assert _error(resp)["code"] == "AUTH_TOKEN_INVALID"
