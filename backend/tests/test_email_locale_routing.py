"""
A quien se le escribe en que idioma (ADR 0016 y tarea 11 del plan de i18n).

Dos caminos distintos en el mismo fichero (`core/email.py`):

- **Correos internos** (los 5 del notificador y los 2 al vendedor): el idioma es el
  del *destinatario*, `users.locale` -> `workspaces.default_locale` -> `es`.
- **Correos externos** (`quote_portal_email`, `client_confirmation_email`): el
  idioma es el de la *sesion de portal*, `portal_sessions.locale` ->
  `workspaces.default_locale` -> `es`. Un cliente no tiene `users.locale`.

Hoy solo existe el catalogo `es`, asi que el idioma no se ve en el texto: estos
tests comprueban con que `locale` se llama a cada plantilla, y el contenido de las
plantillas lo comprueba `test_email_templates.py`.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import update

from app.core import email as templates
from app.core.deps import resolve_portal_locale
from app.core.security import hash_password
from app.modules.identity.models import User, Workspace
from app.modules.notifications import email_notifier
from app.modules.portal import service as portal_service
from tests.test_portal import _create_quote, _create_session

pytestmark = pytest.mark.asyncio

PORTAL = "/api/v1/portal"


async def _set_locales(session_factory, user: User, *, user_locale=None, workspace_locale="es"):
    async with session_factory() as session:
        await session.execute(update(User).where(User.id == user.id).values(locale=user_locale))
        await session.execute(
            update(Workspace).where(Workspace.id == user.workspace_id).values(default_locale=workspace_locale)
        )
        await session.commit()


def _spy(monkeypatch, module, name: str) -> list[dict]:
    """Envuelve una plantilla: anota los argumentos de cada llamada y devuelve lo de siempre."""
    calls: list[dict] = []
    real = getattr(module, name)

    def wrapper(*args, **kwargs):
        calls.append(kwargs)
        return real(*args, **kwargs)

    monkeypatch.setattr(module, name, wrapper)
    return calls


@pytest.fixture
def outbox(monkeypatch):
    """Sustituye el envio por una bandeja: nada sale por SMTP."""
    sent: list[dict] = []

    async def fake_send(to, subject, html_body, text_body=None):
        sent.append({"to": to, "subject": subject, "html": html_body, "text": text_body})
        return True

    monkeypatch.setattr(email_notifier, "send_email", fake_send)
    monkeypatch.setattr(portal_service, "send_email", fake_send)
    return sent


@pytest.fixture
def notifier_db(monkeypatch, session_factory):
    """El notificador abre su propia sesion global; en test apunta a la base de test."""
    monkeypatch.setattr(email_notifier, "AsyncSessionLocal", session_factory)


# ── resolve_portal_locale ────────────────────────────────────────────────────


async def test_resolve_portal_locale_follows_the_chain(test_user: User, session_factory):
    async with session_factory() as session:
        assert await resolve_portal_locale(session, test_user.workspace_id, None) == "es"
        assert await resolve_portal_locale(session, test_user.workspace_id, "es-MX") == "es-MX"

    await _set_locales(session_factory, test_user, workspace_locale="es-419")
    async with session_factory() as session:
        assert await resolve_portal_locale(session, test_user.workspace_id, None) == "es-419"
        # La sesion manda sobre el workspace.
        assert await resolve_portal_locale(session, test_user.workspace_id, "es-MX") == "es-MX"


async def test_a_portal_locale_without_catalogue_is_skipped(test_user: User, session_factory):
    await _set_locales(session_factory, test_user, workspace_locale="es-419")
    async with session_factory() as session:
        assert await resolve_portal_locale(session, test_user.workspace_id, "fr") == "es-419"


async def test_an_unknown_workspace_still_resolves(session_factory):
    async with session_factory() as session:
        assert await resolve_portal_locale(session, "no-such-workspace", None) == "es"


# ── Correos internos: el notificador ─────────────────────────────────────────

QUOTE_ACCEPTED = {
    "event_type": "QuoteAccepted",
    "payload": {"quote_number": "Q-1", "total": 100.0, "currency": "USD", "order_number": "ORD-1"},
}


async def _notify(workspace_id: str, event: dict):
    await email_notifier._send_event_email({**event, "workspace_id": workspace_id})


async def test_recipients_carry_their_locale(test_user: User, session_factory, notifier_db):
    await _set_locales(session_factory, test_user, user_locale="es-MX", workspace_locale="es-419")

    recipients = await email_notifier._get_eligible_recipients(test_user.workspace_id, "QuoteAccepted")

    assert recipients == [email_notifier.Recipient(email=test_user.email, locale="es-MX")]


async def test_a_recipient_without_preference_follows_the_workspace(test_user: User, session_factory, notifier_db):
    await _set_locales(session_factory, test_user, workspace_locale="es-419")

    [recipient] = await email_notifier._get_eligible_recipients(test_user.workspace_id, "QuoteAccepted")

    assert recipient.locale == "es-419"


async def test_notification_preferences_still_filter_recipients(test_user: User, session_factory, notifier_db):
    async with session_factory() as session:
        await session.execute(
            update(User).where(User.id == test_user.id).values(notification_preferences={"email_enabled": False})
        )
        await session.commit()

    assert await email_notifier._get_eligible_recipients(test_user.workspace_id, "QuoteAccepted") == []


async def test_the_email_is_built_in_the_recipients_language(
    test_user: User, session_factory, notifier_db, outbox, monkeypatch
):
    await _set_locales(session_factory, test_user, user_locale="es-MX", workspace_locale="es-419")
    calls = _spy(monkeypatch, email_notifier, "quote_accepted_email")

    await _notify(test_user.workspace_id, QUOTE_ACCEPTED)

    assert [c["locale"] for c in calls] == ["es-MX"]
    assert [m["to"] for m in outbox] == [test_user.email]
    assert outbox[0]["subject"] == "Cotización Q-1 aceptada"


async def test_each_event_type_passes_the_locale(
    test_user: User, session_factory, notifier_db, outbox, monkeypatch
):
    await _set_locales(session_factory, test_user, user_locale="es-MX")
    events = {
        "SalesOrderCreated": ("sales_order_created_email", {"order_number": "O-1"}),
        "WorkflowFailed": ("workflow_failed_email", {"workflow_name": "Sync", "error": "x"}),
        "InventoryLowThresholdDetected": ("low_stock_email", {"product_name": "W", "sku": "S"}),
        "InvoiceOverdue": ("invoice_overdue_email", {"invoice_number": "I-1"}),
    }

    for event_type, (template, payload) in events.items():
        calls = _spy(monkeypatch, email_notifier, template)
        await _notify(test_user.workspace_id, {"event_type": event_type, "payload": payload})
        assert [c["locale"] for c in calls] == ["es-MX"], event_type

    assert len(outbox) == len(events)


async def test_two_recipients_in_different_languages_each_get_their_own(
    test_user: User, session_factory, notifier_db, outbox, monkeypatch
):
    await _set_locales(session_factory, test_user, user_locale="es-MX")
    async with session_factory() as session:
        session.add(User(
            workspace_id=test_user.workspace_id, email="second@test.corp",
            hashed_password=hash_password("testpassword123"), role="admin", is_owner=True, locale="es-419",
        ))
        await session.commit()
    calls = _spy(monkeypatch, email_notifier, "quote_accepted_email")

    await _notify(test_user.workspace_id, QUOTE_ACCEPTED)

    assert sorted(c["locale"] for c in calls) == ["es-419", "es-MX"]
    assert sorted(m["to"] for m in outbox) == ["owner@test.corp", "second@test.corp"]


async def test_recipients_who_share_a_language_share_one_rendering(
    test_user: User, session_factory, notifier_db, outbox, monkeypatch
):
    async with session_factory() as session:
        session.add(User(
            workspace_id=test_user.workspace_id, email="second@test.corp",
            hashed_password=hash_password("testpassword123"), role="admin", is_owner=True,
        ))
        await session.commit()
    calls = _spy(monkeypatch, email_notifier, "quote_accepted_email")

    await _notify(test_user.workspace_id, QUOTE_ACCEPTED)

    assert len(calls) == 1
    assert len(outbox) == 2


async def test_missing_payload_fields_fall_back_to_words_in_the_recipients_language(
    test_user: User, session_factory, notifier_db, outbox
):
    # Antes: "Unknown" y "Unknown error", en ingles dentro de un correo en espanol.
    await _notify(test_user.workspace_id, {"event_type": "WorkflowFailed", "payload": {}})

    assert outbox[0]["subject"] == "Workflow falló: Desconocido"
    assert "Error desconocido" in outbox[0]["text"]
    assert "Unknown" not in outbox[0]["text"] + outbox[0]["html"] + outbox[0]["subject"]


async def test_an_event_without_a_template_sends_nothing(test_user: User, notifier_db, outbox):
    await _notify(test_user.workspace_id, {"event_type": "SomethingElse", "payload": {}})

    assert outbox == []


# ── Correos externos y al vendedor: el portal ────────────────────────────────


async def _shareable(client: AsyncClient, headers: dict, **session_kwargs) -> dict:
    quote = await _create_quote(client, headers)
    return await _create_session(client, headers, quote["id"], **session_kwargs)


async def test_the_share_email_uses_the_sessions_locale(
    client: AsyncClient, auth_headers: dict, outbox, monkeypatch
):
    session = await _shareable(client, auth_headers, client_email="cli@x.co", locale="es-MX")
    calls = _spy(monkeypatch, portal_service, "quote_portal_email")

    resp = await client.post(f"{PORTAL}/sessions/{session['id']}/send-email", headers=auth_headers)

    assert resp.status_code == 200, resp.text
    assert [c["locale"] for c in calls] == ["es-MX"]
    assert outbox[0]["to"] == "cli@x.co"


async def test_a_session_without_locale_follows_the_workspace_default(
    client: AsyncClient, auth_headers: dict, test_user: User, session_factory, outbox, monkeypatch
):
    await _set_locales(session_factory, test_user, workspace_locale="es-419")
    session = await _shareable(client, auth_headers, client_email="cli@x.co")
    calls = _spy(monkeypatch, portal_service, "quote_portal_email")

    await client.post(f"{PORTAL}/sessions/{session['id']}/send-email", headers=auth_headers)

    assert [c["locale"] for c in calls] == ["es-419"]


async def test_the_sellers_locale_does_not_decide_the_clients_email(
    client: AsyncClient, auth_headers: dict, test_user: User, session_factory, outbox, monkeypatch
):
    # El vendedor trabaja en es-MX; el cliente recibe el idioma de la sesion.
    await _set_locales(session_factory, test_user, user_locale="es-MX")
    session = await _shareable(client, auth_headers, client_email="cli@x.co", locale="es-419")
    calls = _spy(monkeypatch, portal_service, "quote_portal_email")

    await client.post(f"{PORTAL}/sessions/{session['id']}/send-email", headers=auth_headers)

    assert [c["locale"] for c in calls] == ["es-419"]


async def test_accepting_writes_to_the_seller_and_to_the_client_in_their_own_language(
    client: AsyncClient, auth_headers: dict, test_user: User, session_factory, outbox, monkeypatch
):
    await _set_locales(session_factory, test_user, user_locale="es-MX", workspace_locale="es-419")
    session = await _shareable(client, auth_headers, client_email="cli@x.co", locale="es")
    seller = _spy(monkeypatch, portal_service, "seller_accept_email")
    confirmation = _spy(monkeypatch, portal_service, "client_confirmation_email")

    resp = await client.post(f"{PORTAL}/quote/{session['token']}/accept", json={"client_name": "Ana"})

    assert resp.status_code == 200, resp.text
    assert [c["locale"] for c in seller] == ["es-MX"]          # idioma del vendedor
    assert [c["locale"] for c in confirmation] == ["es"]       # idioma de la sesion
    assert {m["to"] for m in outbox} == {test_user.email, "cli@x.co"}


async def test_a_client_without_name_is_called_cliente_in_the_sellers_language(
    client: AsyncClient, auth_headers: dict, outbox, monkeypatch
):
    session = await _shareable(client, auth_headers)
    seller = _spy(monkeypatch, portal_service, "seller_accept_email")

    await client.post(f"{PORTAL}/quote/{session['token']}/accept", json={})

    assert [c["client_name"] for c in seller] == ["Cliente"]


async def test_rejecting_writes_to_the_seller_in_the_sellers_language(
    client: AsyncClient, auth_headers: dict, test_user: User, session_factory, outbox, monkeypatch
):
    await _set_locales(session_factory, test_user, user_locale="es-MX")
    session = await _shareable(client, auth_headers, locale="es-419")
    seller = _spy(monkeypatch, portal_service, "seller_reject_email")

    resp = await client.post(f"{PORTAL}/quote/{session['token']}/reject", json={"reason": "Caro"})

    assert resp.status_code == 200, resp.text
    assert [c["locale"] for c in seller] == ["es-MX"]
    assert outbox[0]["to"] == test_user.email


async def test_the_catalogue_for_the_email_domain_exists():
    # Si el dominio falta, el primer correo lanza KeyError en produccion.
    assert templates.translate("email:workspaceFooter", "es", workspace="W") == "W · CBOS Platform"
