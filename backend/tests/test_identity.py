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


async def test_get_me_includes_full_name_from_person(
    client: AsyncClient, auth_headers: dict
):
    # El nombre no esta en users: se une desde la Person enlazada.
    resp = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "Test Owner"


async def test_get_me_returns_the_name_used_at_registration(client: AsyncClient):
    # El recorrido que importa: lo que el usuario escribio al registrarse tiene
    # que poder leerlo despues, que es justo lo que no ocurria.
    tokens = await _register_fresh(client, "-mename")
    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "John Doe"


async def test_get_me_without_person_returns_null_full_name(
    client: AsyncClient, session_factory, workspace
):
    # person_id es nullable, asi que un usuario sin Person es legal y no tiene
    # nombre que dar. El contrato dice null, no una peticion rota.
    from app.core.security import create_access_token, hash_password
    from app.modules.identity.models import User

    async with session_factory() as session:
        user = User(
            workspace_id=workspace.id,
            person_id=None,
            email="nameless@test.corp",
            hashed_password=hash_password("testpassword123"),
            role="member",
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

    token = create_access_token({
        "sub": user.id,
        "workspace_id": workspace.id,
        "role": user.role,
    })
    resp = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    assert resp.json()["full_name"] is None


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


# ── Borrado de usuario ────────────────────────────────────────────────────────
#
# Endpoint destructivo y sin vuelta atras: cada barrera lleva su test, porque
# ninguna sustituye a las otras y un fallo silencioso en cualquiera de ellas
# solo se nota cuando ya se ha borrado a quien no tocaba.

async def _make_member(session_factory, workspace, email: str, is_owner: bool = False):
    from app.core.security import hash_password
    from app.modules.identity.models import User

    async with session_factory() as session:
        user = User(
            workspace_id=workspace.id,
            email=email,
            hashed_password=hash_password("memberpassword123"),
            role="member",
            is_owner=is_owner,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


async def test_admin_deletes_a_member(
    client: AsyncClient, auth_headers: dict, session_factory, workspace
):
    member = await _make_member(session_factory, workspace, "borrable@test.corp")

    resp = await client.delete(
        f"/api/v1/users/{member.id}?confirm_email=borrable@test.corp",
        headers=auth_headers,
    )
    assert resp.status_code == 204

    # Y deja de existir de verdad, no solo desactivado.
    again = await client.delete(
        f"/api/v1/users/{member.id}?confirm_email=borrable@test.corp",
        headers=auth_headers,
    )
    assert again.status_code == 404


async def test_delete_requires_the_confirmation_email_to_match(
    client: AsyncClient, auth_headers: dict, session_factory, workspace
):
    member = await _make_member(session_factory, workspace, "confirmar@test.corp")

    resp = await client.delete(
        f"/api/v1/users/{member.id}?confirm_email=otro@test.corp", headers=auth_headers
    )

    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "IDENTITY_DELETE_CONFIRMATION_MISMATCH"
    # Y no revela a quien apuntaba el id.
    assert "confirmar@test.corp" not in resp.text


async def test_delete_without_confirmation_is_rejected(
    client: AsyncClient, auth_headers: dict, session_factory, workspace
):
    # Sin el parametro no hay borrado posible: la barrera no es opcional.
    member = await _make_member(session_factory, workspace, "sinconfirmar@test.corp")

    resp = await client.delete(f"/api/v1/users/{member.id}", headers=auth_headers)

    assert resp.status_code == 422


async def test_cannot_delete_yourself(client: AsyncClient, auth_headers: dict, test_user):
    resp = await client.delete(
        f"/api/v1/users/{test_user.id}?confirm_email={test_user.email}",
        headers=auth_headers,
    )

    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "IDENTITY_CANNOT_DELETE_SELF"


async def test_cannot_delete_the_workspace_owner(
    client: AsyncClient, auth_headers: dict, session_factory, workspace
):
    owner = await _make_member(session_factory, workspace, "duena@test.corp", is_owner=True)

    resp = await client.delete(
        f"/api/v1/users/{owner.id}?confirm_email=duena@test.corp", headers=auth_headers
    )

    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "IDENTITY_CANNOT_DELETE_OWNER"


async def test_delete_requires_authentication(client: AsyncClient, session_factory, workspace):
    member = await _make_member(session_factory, workspace, "sinauth@test.corp")

    resp = await client.delete(f"/api/v1/users/{member.id}?confirm_email=sinauth@test.corp")

    assert resp.status_code == 401


async def test_cannot_delete_a_user_that_still_owns_records(
    client: AsyncClient, auth_headers: dict, session_factory, workspace
):
    # leads.owner_id apunta a users sin ON DELETE, asi que la base rechaza el
    # borrado. Sin esta barrera la peticion saldria como un 500 opaco.
    from app.modules.crm.models import Lead

    member = await _make_member(session_factory, workspace, "conleads@test.corp")
    async with session_factory() as session:
        session.add(Lead(
            workspace_id=workspace.id,
            first_name="Lead de alguien",
            source="manual",
            owner_id=member.id,
        ))
        await session.commit()

    resp = await client.delete(
        f"/api/v1/users/{member.id}?confirm_email=conleads@test.corp",
        headers=auth_headers,
    )

    assert resp.status_code == 409
    error = resp.json()["error"]
    assert error["code"] == "IDENTITY_USER_HAS_RECORDS"
    # La constraint que rechazo nombra la tabla donde mirar.
    assert error["detail"]["constraint"] == "leads_owner_id_fkey"
