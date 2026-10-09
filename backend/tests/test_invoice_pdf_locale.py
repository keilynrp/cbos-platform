"""
El PDF de factura en el idioma pedido (tarea 10 del plan de i18n).

Con un solo catalogo enviado (`es`), "idioma" no se puede observar: un texto que
siempre sale en espanol se ve igual que uno que ignora el parametro. Por eso los
casos de segundo idioma inyectan un catalogo pseudo-localizado (`EN(<original>)`):
si una etiqueta del PDF sigue cableada, sale sin el prefijo y el test lo dice.

Las fechas y los importes siguen al idioma (`core/i18n/format.py`): las reglas estan en
`test_i18n_format.py` y el ultimo caso de aqui comprueba que llegan al PDF.
"""
import re
from datetime import date

import pytest

from app.core.i18n import catalogue
from app.modules.accounting.models import CompanyProfile
from app.modules.accounting.pdf import generate_invoice_pdf
from app.modules.accounting.service import InvoiceParty
from tests.test_invoice_pdf_rendering import _invoice, _text

pytestmark = pytest.mark.asyncio

STATUSES = {
    "draft": "Borrador",
    "sent": "Enviada",
    "paid": "Pagada",
    "partial": "Pago parcial",
    "overdue": "Vencida",
    "cancelled": "Cancelada",
    "void": "Anulada",
}


def _pseudo(tree: dict) -> dict:
    return {
        k: _pseudo(v) if isinstance(v, dict) else f"EN({v})" for k, v in tree.items()
    }


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


def _with_status(status: str):
    inv = _invoice()
    inv.status = status
    return inv


def _full_invoice():
    """Una factura con todo lo que puede aparecer: descuento, IVA, pago y notas."""
    inv = _invoice(notes="Gracias")
    inv.discount_amount = 50.0
    inv.amount_paid = 400.0
    inv.amount_due = 760.0
    return inv


def _profile() -> CompanyProfile:
    return CompanyProfile(
        workspace_id="ws-1",
        legal_name="Acme SA",
        tax_id="ABC123",
        tax_id_label="RFC",
        invoice_footer_note="Pago a 30 dias",
    )


def _party() -> InvoiceParty:
    return InvoiceParty(name="Comercial Norte SA", contact_name="Ana", email="ana@c.co", phone=None, country=None)


# ── En espanol, nada cambia ──────────────────────────────────────────────────


async def test_spanish_output_is_unchanged_with_or_without_the_parameter():
    inv = _full_invoice()
    default = _text(generate_invoice_pdf(inv, profile=_profile(), party=_party()))

    assert _text(generate_invoice_pdf(inv, profile=_profile(), party=_party(), locale="es")) == default
    assert _text(generate_invoice_pdf(inv, profile=_profile(), party=_party(), locale="es-MX")) == default


async def test_spanish_labels_are_the_ones_the_pdf_always_had():
    text = _text(generate_invoice_pdf(_full_invoice(), profile=_profile(), party=_party()))

    for label in (
        "FACTURA", "Cliente", "Atn: Ana", "Fecha de emisión", "Fecha de vencimiento", "Moneda",
        "Descripción", "Cant.", "Precio unit.", "Dto. %", "Subtotal", "Descuento", "IVA (16%)",
        "TOTAL", "Pagado", "Saldo pendiente", "Notas", "RFC: ABC123",
        "Factura INV-2026-0001  |  Generado por CBOS",
    ):
        assert label in text, label


@pytest.mark.parametrize("status,label", STATUSES.items())
async def test_each_status_in_spanish(status, label):
    assert label in _text(generate_invoice_pdf(_with_status(status)))


async def test_a_status_the_catalogue_does_not_know_falls_back_to_the_raw_value():
    # Un estado nuevo en el backend no debe romper el PDF ni dejar un hueco.
    assert "Archived" in _text(generate_invoice_pdf(_with_status("archived")))


async def test_the_default_tax_id_label():
    profile = CompanyProfile(workspace_id="ws-1", tax_id="XYZ", tax_id_label=None)
    assert "ID: XYZ" in _text(generate_invoice_pdf(_invoice(), profile=profile))


# ── En otro idioma ───────────────────────────────────────────────────────────


async def test_the_locale_reaches_every_label(with_pseudo_english):
    text = _text(generate_invoice_pdf(_full_invoice(), profile=_profile(), party=_party(), locale="en"))

    for label in (
        "FACTURA", "Cliente", "Fecha de emisión", "Fecha de vencimiento", "Moneda", "Descripción",
        "Cant.", "Precio unit.", "Dto. %", "Subtotal", "Descuento", "TOTAL", "Pagado",
        "Saldo pendiente", "Notas",
    ):
        assert f"EN({label})" in text, label


async def test_no_spanish_label_is_left_behind(with_pseudo_english):
    """El control que importa: lo cableado sale sin el prefijo."""
    text = _text(generate_invoice_pdf(_full_invoice(), profile=_profile(), party=_party(), locale="en"))
    leftover = re.sub(r"EN\([^)]*\)", "", text)

    spanish = [v for v in _leaves(catalogue.load_catalogues()["es"]["invoice_pdf"]) if "{" not in v]
    assert spanish, "el catalogo no deberia estar vacio"
    for value in spanish:
        assert value not in leftover, f"'{value}' sigue en espanol"


async def test_placeholders_are_filled_in_the_second_language(with_pseudo_english):
    text = _text(generate_invoice_pdf(_full_invoice(), profile=_profile(), party=_party(), locale="en"))

    assert "EN(Atn: Ana)" in text
    assert "EN(IVA (16%))" in text
    assert "EN(Factura INV-2026-0001  |  Generado por CBOS)" in text


async def test_each_status_in_the_second_language(with_pseudo_english):
    for status, label in STATUSES.items():
        assert f"EN({label})" in _text(generate_invoice_pdf(_with_status(status), locale="en"))


async def test_invoice_data_is_never_translated(with_pseudo_english):
    inv = _full_invoice()
    text = _text(generate_invoice_pdf(inv, profile=_profile(), party=_party(), locale="en"))

    for data in ("INV-2026-0001", "Servicio de consultoria", "Comercial Norte SA", "Acme SA", "ana@c.co", "Gracias", "Pago a 30 dias"):
        assert data in text, data
        assert f"EN({data})" not in text, data


async def test_dates_and_amounts_follow_the_language(with_pseudo_english):
    inv = _invoice()
    assert inv.issue_date == date(2026, 8, 3)
    # (locale, fecha, importe): en espanol nada cambia respecto a siempre.
    cases = [
        ("es", "03/08/2026", "$1,160.00"),
        ("es-MX", "03/08/2026", "$1,160.00"),
        ("en", "08/03/2026", "$1,160.00"),
        ("en-GB", "03/08/2026", "$1,160.00"),
        ("es-ES", "03/08/2026", "$1160,00"),
    ]
    for locale, day, amount in cases:
        text = _text(generate_invoice_pdf(inv, locale=locale))
        assert day in text, locale
        assert amount in text, locale


async def test_a_locale_without_catalogue_renders_in_spanish():
    assert "FACTURA" in _text(generate_invoice_pdf(_invoice(), locale="xx"))
