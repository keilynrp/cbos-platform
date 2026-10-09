"""
El PDF de cotizacion en el idioma pedido (tarea 12 del plan de i18n).

Mismas garantias que el PDF de factura (`test_invoice_pdf_locale.py`):

1. **En espanol no cambia nada, salvo una cosa corregida.** `data/quote_pdf_es_golden.txt`
   es el texto del PDF tal y como salia *antes* de pasar a catalogo. La unica diferencia:
   el estado salia como el codigo en ingles en mayusculas (`SENT`) y ahora sale
   traducido (`ENVIADA`). El golden lleva ese cambio hecho a mano.
2. **El idioma llega a todo el texto.** Con el espanol solo no se puede observar: un
   texto cableado se ve igual que uno que ignora el parametro. Los casos de segundo
   idioma inyectan un catalogo pseudo-localizado (`EN(<original>)`).

La ruta toma el idioma de `get_current_locale`, como la de factura.
"""
from datetime import date
from pathlib import Path

import pytest
from httpx import AsyncClient
from sqlalchemy import update

from app.core.i18n import catalogue
from app.modules.identity.models import User, Workspace
from app.modules.sales.models import Quote, QuoteLine
from app.modules.sales.pdf import generate_quote_pdf
from tests.test_invoice_pdf_rendering import _text

pytestmark = pytest.mark.asyncio

GOLDEN = (Path(__file__).parent / "data" / "quote_pdf_es_golden.txt").read_text(encoding="utf-8")

STATUSES = {
    "draft": "Borrador",
    "sent": "Enviada",
    "accepted": "Aceptada",
    "rejected": "Rechazada",
    "expired": "Vencida",
}


def _quote(status: str = "sent") -> Quote:
    q = Quote(
        workspace_id="ws-1", quote_number="Q-2026-0001", title="Implementacion CRM",
        status=status, valid_until=date(2026, 9, 1), currency="USD",
        subtotal=1500.0, discount_amount=50.0, tax_rate=16.0, tax_amount=232.0, total=1682.0,
        notes="Gracias por su preferencia", terms="Pago a 30 dias",
    )
    q.lines = [
        QuoteLine(workspace_id="ws-1", line_order=1, description="Consultoria", quantity=10,
                  unit_price=100.0, discount_percent=0.0, amount=1000.0),
        QuoteLine(workspace_id="ws-1", line_order=2, description="Licencia", quantity=2.5,
                  unit_price=250.0, discount_percent=20.0, amount=500.0),
    ]
    return q


def _pdf(quote: Quote | None = None, locale: str | None = None) -> str:
    kwargs = {} if locale is None else {"locale": locale}
    return _text(generate_quote_pdf(quote or _quote(), "Acme SA", "Ana", "Comercial Norte SA", **kwargs))


def _pseudo(tree: dict) -> dict:
    return {k: _pseudo(v) if isinstance(v, dict) else f"EN({v})" for k, v in tree.items()}


def _leaves(tree: dict):
    for value in tree.values():
        if isinstance(value, dict):
            yield from _leaves(value)
        else:
            yield value


@pytest.fixture
def with_pseudo_english(monkeypatch):
    real = catalogue.load_catalogues()
    monkeypatch.setattr(
        catalogue,
        "load_catalogues",
        lambda: {**real, "en": {d: _pseudo(t) for d, t in real["es"].items()}},
    )


# ── En espanol, nada cambia ──────────────────────────────────────────────────


async def test_spanish_output_is_what_the_pdf_always_said():
    assert _pdf() == GOLDEN.rstrip("\n")


async def test_the_spanish_locales_render_the_same():
    assert _pdf(locale="es") == _pdf(locale="es-MX") == _pdf() == GOLDEN.rstrip("\n")


async def test_a_locale_without_catalogue_renders_in_spanish():
    assert _pdf(locale="xx") == GOLDEN.rstrip("\n")


async def test_each_status_is_translated_not_the_internal_code():
    for status, label in STATUSES.items():
        text = _pdf(_quote(status))
        assert f"Estado: {label.upper()}" in text, status


async def test_an_unknown_status_comes_out_as_it_is():
    # Como el resto de estados, en mayusculas: lo unico que cambia es que no se traduce.
    assert "Estado: ARCHIVED" in _pdf(_quote("archived"))


# ── El idioma llega a todo el texto ──────────────────────────────────────────


async def test_every_label_is_in_the_second_language(with_pseudo_english):
    text = _pdf(locale="en")
    es = catalogue.load_catalogues()["es"]["quote_pdf"]
    static = [
        m for m in _leaves({k: v for k, v in es.items() if k != "status"})
        if "{" not in m
    ]
    assert len(static) >= 15  # el control puede fallar: si no hay etiquetas, pasa sin mirar
    for message in static:
        assert f"EN({message})" in text, message
    assert "EN(Attn: Ana)" in text
    assert "EN(Impuesto (16%))" in text
    assert "EN(Página 1)" in text


async def test_the_second_language_leaves_no_spanish_label_behind(with_pseudo_english):
    text = _pdf(locale="en")
    for spanish in ("COTIZACIÓN", "CLIENTE", "NOTAS", "Descripción", "Importe", "Moneda"):
        assert spanish not in text.replace(f"EN({spanish})", ""), spanish


async def test_the_status_in_the_second_language(with_pseudo_english):
    for status, label in STATUSES.items():
        assert f"EN({label.upper()})" in _pdf(_quote(status), locale="en"), status


async def test_quote_data_is_never_translated(with_pseudo_english):
    text = _pdf(locale="en")
    for data in ("Q-2026-0001", "Implementacion CRM", "Acme SA", "Comercial Norte SA", "Consultoria",
                 "Licencia", "Gracias por su preferencia", "Pago a 30 dias"):
        assert data in text, data
        assert f"EN({data})" not in text, data


# ── Con el catalogo real en ingles ───────────────────────────────────────────


async def test_real_english_reads_as_english():
    text = _pdf(locale="en")
    for expected in ("QUOTE", "Number: Q-2026-0001", "Status: SENT", "Valid until: 09/01/2026",
                     "CUSTOMER", "Attn: Ana", "LINE ITEMS", "Qty.", "Unit price", "Amount",
                     "Discount: -USD 50.00", "Tax (16%): USD 232.00", "TOTAL: USD 1,682.00",
                     "NOTES", "TERMS AND CONDITIONS", "Page 1"):
        assert expected in text, expected


# ── Fechas e importes siguen al idioma ───────────────────────────────────────


async def test_dates_amounts_and_quantities_follow_the_language():
    cases = [
        ("es", "01/09/2026", "USD 1,500.00", "2.5"),
        ("en", "09/01/2026", "USD 1,500.00", "2.5"),
        ("en-GB", "01/09/2026", "USD 1,500.00", "2.5"),
        ("es-ES", "01/09/2026", "USD 1500,00", "2,5"),
    ]
    for locale, day, amount, quantity in cases:
        text = _pdf(locale=locale)
        assert day in text, locale
        assert amount in text, locale
        assert f"Licencia {quantity} " in text, locale


# ── La ruta ──────────────────────────────────────────────────────────────────

BASE = "/api/v1/sales"


async def _create_quote(client: AsyncClient, headers: dict) -> dict:
    resp = await client.post(f"{BASE}/quotes", headers=headers, json={
        "title": "Ruta", "currency": "USD", "tax_rate": 0.0, "discount_amount": 0.0,
        "lines": [{"description": "Widget", "quantity": 2, "unit_price": 100.0,
                   "discount_percent": 0.0, "line_order": 1}],
    })
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest.fixture
def captured(monkeypatch):
    calls: list[str] = []

    def fake(quote, workspace_name, contact_name=None, org_name=None, locale="es"):
        calls.append(locale)
        return b"%PDF-fake"

    monkeypatch.setattr("app.modules.sales.router.generate_quote_pdf", fake)
    return calls


async def test_the_route_defaults_to_spanish(client: AsyncClient, auth_headers: dict, captured):
    quote = await _create_quote(client, auth_headers)

    await client.get(f"{BASE}/quotes/{quote['id']}/pdf", headers=auth_headers)

    assert captured == ["es"]


async def test_the_route_follows_the_users_language(
    client: AsyncClient, auth_headers: dict, test_user: User, session_factory, captured
):
    async with session_factory() as session:
        await session.execute(update(User).where(User.id == test_user.id).values(locale="en-US"))
        await session.commit()
    quote = await _create_quote(client, auth_headers)

    await client.get(f"{BASE}/quotes/{quote['id']}/pdf", headers=auth_headers)

    assert captured == ["en-US"]


async def test_the_route_follows_the_workspace_default(
    client: AsyncClient, auth_headers: dict, test_user: User, session_factory, captured
):
    async with session_factory() as session:
        await session.execute(
            update(Workspace).where(Workspace.id == test_user.workspace_id).values(default_locale="en")
        )
        await session.commit()
    quote = await _create_quote(client, auth_headers)

    await client.get(f"{BASE}/quotes/{quote['id']}/pdf", headers=auth_headers)

    assert captured == ["en"]
