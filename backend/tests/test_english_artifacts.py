"""
El PDF de factura y los nueve correos en ingles *real* (tarea 12 del plan de i18n).

Los tests de las tareas 10 y 11 usan un segundo idioma inventado (`EN(...)`, o en
MAYUSCULAS) porque entonces no habia otro: demuestran que el parametro `locale`
llega a todo el texto. Estos prueban lo que aquellos no pueden: que el catalogo `en`
que se envia es de verdad ingles y esta completo. Un catalogo `en` con una cadena
copiada del espanol pasaria la paridad de claves y se veria igual que uno roto.

Dos controles, sobre el texto que sale (el PDF se extrae con `pypdf`: el subset de
fuente embebida impide buscar literales en los bytes):

- **Lo esperado**: el asunto de cada correo y las etiquetas del PDF, literales.
- **Nada en espanol**: el vocabulario que solo existe en el catalogo `es` (sus
  palabras menos las del `en`) no aparece en lo que sale en `en`. Un texto que se
  quedo en espanol tiene palabras que ningun catalogo ingles contiene.

Lo que NO cubre: fechas e importes siguen sin seguir al idioma (ver tarea 10). El
idioma ya se ofrece (`SUPPORTED_LOCALES`), pero estos tests pasan `locale="en"` a
mano: no ejercitan la cadena de resolucion, que cubren `test_locale.py` y
`test_locale_resolution.py`.
"""
import re

import pytest

from app.core.i18n import catalogue
from app.modules.accounting.pdf import generate_invoice_pdf
from tests.test_email_templates import CASES, render
from tests.test_invoice_pdf_locale import STATUSES, _full_invoice, _party, _profile, _with_status
from tests.test_invoice_pdf_rendering import _text

pytestmark = pytest.mark.asyncio

# Placeholders `{x}` y etiquetas `<b>` no son vocabulario de ningun idioma.
_MARKUP = re.compile(r"\{[^{}]*\}|<[^<>]*>")
_WORD = re.compile(r"[^\W\d_]{3,}")


def _leaves(tree: dict):
    for value in tree.values():
        if isinstance(value, dict):
            yield from _leaves(value)
        else:
            yield value


def _vocabulary(domains: dict) -> set[str]:
    return {
        word.lower()
        for tree in domains.values()
        for message in _leaves(tree)
        for word in _WORD.findall(_MARKUP.sub(" ", message))
    }


# Palabras que los dos catalogos comparten de verdad (cognados, siglas, marca). Es una
# lista fija a proposito: restar el vocabulario del catalogo `en` que se esta probando
# seria circular, y una cadena copiada del espanol entraria en el y se daria por buena.
SHARED_WITH_SPANISH = {"cbos", "error", "platform", "sku", "stock", "subtotal", "total", "unit", "workflow"}


def spanish_only_words() -> set[str]:
    return _vocabulary(catalogue.load_catalogues()["es"]) - SHARED_WITH_SPANISH


def words_in(text: str) -> set[str]:
    return {word.lower() for word in _WORD.findall(_MARKUP.sub(" ", text))}


# Los datos de prueba de los correos llevan un motivo de rechazo en espanol
# ("Muy caro"): aqui es texto que escribio una persona y no se traduce.
ENGLISH_CASES = {
    name: (fn, {**kwargs, "reason": "Too expensive"} if "reason" in kwargs and kwargs["reason"] else kwargs)
    for name, (fn, kwargs) in CASES.items()
}

SUBJECTS = {
    "quote_portal_named": "Quote Q-100 from Acme",
    "quote_portal_anonymous": "Quote Q-100 from Acme",
    "quote_accepted": "Quote Q-100 accepted",
    "sales_order_created": "New sales order ORD-5",
    "workflow_failed": "Workflow failed: Sync",
    "invoice_overdue": "Overdue invoice: INV-9",
    "low_stock": "Low stock: Widget (W-1)",
    "seller_accept": "Ana <b> & Co accepted proposal Q-100",
    "seller_reject_with_reason": "Ana <b> & Co rejected proposal Q-100",
    "seller_reject_no_reason": "Ana rejected proposal Q-100",
    "client_confirmation": "Confirmation — Q-100 accepted",
}


# ── El control puede fallar ──────────────────────────────────────────────────


async def test_the_spanish_only_vocabulary_is_not_empty():
    # Si estuviera vacio, "no sale espanol" pasaria sin comprobar nada. Y tiene que
    # contener lo evidente: lo que dice una factura en espanol.
    spanish = spanish_only_words()
    assert len(spanish) > 60
    assert {"factura", "cotización", "propuesta", "vencida"} <= spanish


async def test_the_english_catalogue_has_no_spanish_words():
    # Directo sobre el catalogo: una cadena copiada del espanol tiene palabras que
    # solo existen en espanol, lleguen o no a un correo concreto.
    english = _vocabulary(catalogue.load_catalogues()["en"])
    assert english & spanish_only_words() == set()


async def test_the_check_detects_spanish_left_in_english_output(monkeypatch):
    # El mismo correo con el catalogo `en` reemplazado por el espanol debe fallar.
    real = catalogue.load_catalogues()
    monkeypatch.setattr(catalogue, "load_catalogues", lambda: {**real, "en": real["es"]})
    subject, text, html = render(ENGLISH_CASES["quote_accepted"], locale="en")
    assert "cotización" in words_in(subject + text + html)


# ── Correos ──────────────────────────────────────────────────────────────────


@pytest.mark.parametrize("case", sorted(CASES))
async def test_the_email_subject_is_english(case):
    subject, _, _ = render(ENGLISH_CASES[case], locale="en")
    assert subject == SUBJECTS[case]


@pytest.mark.parametrize("case", sorted(CASES))
async def test_no_email_has_spanish_left_in_english(case):
    subject, text, html = render(ENGLISH_CASES[case], locale="en")
    leaked = words_in(subject + " " + text + " " + html) & spanish_only_words()
    assert leaked == set()


@pytest.mark.parametrize("case", sorted(CASES))
async def test_an_english_email_differs_from_the_spanish_one_in_every_part(case):
    spanish = render(CASES[case], locale="es")
    english = render(ENGLISH_CASES[case], locale="en")
    assert all(es != en for es, en in zip(spanish, english, strict=True))


async def test_the_regional_english_tag_serves_the_english_catalogue():
    assert render(ENGLISH_CASES["quote_accepted"], locale="en-GB")[0] == SUBJECTS["quote_accepted"]


async def test_the_data_survives_in_english():
    subject, text, html = render(ENGLISH_CASES["seller_reject_with_reason"], locale="en")
    assert "Too expensive" in text
    assert "Too expensive" in html


# ── PDF ──────────────────────────────────────────────────────────────────────


def _english_pdf_text(invoice=None) -> str:
    inv = invoice or _full_invoice()
    inv.notes = "Thank you"
    return _text(generate_invoice_pdf(inv, profile=_profile(), party=_party(), locale="en"))


async def test_the_invoice_pdf_labels_are_english():
    text = _english_pdf_text()
    for label in ("INVOICE", "Issue date", "Due date", "Currency", "Description", "Unit price",
                  "Subtotal", "Discount", "TOTAL", "Paid", "Balance due", "Notes"):
        assert label in text, label
    assert "Invoice INV" in text and "Generated by CBOS" in text


async def test_the_invoice_pdf_has_no_spanish_left_in_english():
    spanish = spanish_only_words()
    # Los datos de la factura de prueba (cliente, emisor, lineas) no se traducen.
    leaked = {w for w in words_in(_english_pdf_text()) & spanish if w not in words_in(_data_text())}
    assert leaked == set()


# Lo que la factura de prueba trae de datos (cliente, emisor, linea, nota al pie):
# texto de una persona, que ningun catalogo traduce.
_INVOICE_DATA = (
    "INV-2026-0001", "Servicio de consultoria", "Comercial Norte SA", "Acme SA", "ana@c.co", "Pago a 30 dias",
)


def _data_text() -> str:
    return " ".join(_INVOICE_DATA)


@pytest.mark.parametrize("status,spanish", sorted(STATUSES.items()))
async def test_every_invoice_status_has_an_english_label(status, spanish):
    english = {
        "draft": "Draft", "sent": "Sent", "paid": "Paid", "partial": "Partially paid",
        "overdue": "Overdue", "cancelled": "Cancelled", "void": "Void",
    }[status]
    text = _text(generate_invoice_pdf(_with_status(status), locale="en"))
    assert english in text
    assert spanish not in text
