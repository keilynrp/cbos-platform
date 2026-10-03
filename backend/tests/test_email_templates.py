"""
Los nueve correos en el idioma pedido (tarea 11 del plan de i18n).

Dos garantias, las mismas que el PDF de factura:

1. **En espanol no cambia nada.** `data/email_es_golden.json` es la salida exacta de
   cada plantilla tal y como estaba *antes* de pasar a catalogo (asunto, texto y
   HTML, byte a byte). Con o sin `locale`, en `es` o `es-MX`, sale lo mismo.
2. **El idioma llega a todo el texto.** Con un solo catalogo enviado, un texto que
   siempre sale en espanol se ve igual que uno que ignora el parametro. Los casos de
   segundo idioma inyectan un catalogo en MAYUSCULAS: cada letra de un mensaje del
   catalogo pasa a mayuscula, y los marcadores `{x}` y las etiquetas HTML quedan
   intactos. Los datos de prueba tambien van en mayusculas, asi que *cualquier* palabra
   en minusculas que sobreviva en el correo es texto cableado.

Lo que NO cubre: el formato de importes (`USD 1,234.50`) sigue sin seguir al idioma, como
en el PDF (ver el plan, tarea 10).
"""
import json
import re
from datetime import date
from pathlib import Path

import pytest

from app.core import email as templates
from app.core.i18n import catalogue

pytestmark = pytest.mark.asyncio

GOLDEN = json.loads((Path(__file__).parent / "data" / "email_es_golden.json").read_text(encoding="utf-8"))

# Los datos llevan caracteres que el HTML escapa, para que el golden fije tambien el
# escapado de las plantillas que lo hacen.
CASES: dict[str, tuple[str, dict]] = {
    "quote_portal_named": ("quote_portal_email", dict(
        contact_name="Ana", workspace_name="Acme", quote_number="Q-100", total=1234.5,
        currency="USD", valid_until=date(2026, 9, 1), portal_url="https://portal.test/t")),
    "quote_portal_anonymous": ("quote_portal_email", dict(
        contact_name=None, workspace_name="Acme", quote_number="Q-100", total=99.0,
        currency="MXN", valid_until=None, portal_url="https://portal.test/t")),
    "quote_accepted": ("quote_accepted_email", dict(
        contact_name="", quote_number="Q-100", total=1234.5, currency="USD", order_number="ORD-5")),
    "sales_order_created": ("sales_order_created_email", dict(
        order_number="ORD-5", total=1234.5, currency="USD")),
    "workflow_failed": ("workflow_failed_email", dict(workflow_name="Sync", error="boom")),
    "invoice_overdue": ("invoice_overdue_email", dict(
        invoice_number="INV-9", total=1160.0, amount_due=760.0, currency="USD", due_date="2026-09-01")),
    "low_stock": ("low_stock_email", dict(product_name="Widget", sku="W-1", current_stock=3, min_stock=10)),
    "seller_accept": ("seller_accept_email", dict(
        client_name="Ana <b> & Co", workspace_name="Acme & Sons", quote_number="Q-100",
        order_number="ORD-5", total=1234.5, currency="USD")),
    "seller_reject_with_reason": ("seller_reject_email", dict(
        client_name="Ana <b> & Co", workspace_name="Acme & Sons", quote_number="Q-100",
        reason="Muy caro <script>")),
    "seller_reject_no_reason": ("seller_reject_email", dict(
        client_name="Ana", workspace_name="Acme", quote_number="Q-100", reason=None)),
    "client_confirmation": ("client_confirmation_email", dict(
        workspace_name="Acme & Sons", quote_number="Q-100", order_number="ORD-5")),
}

# Mismos correos con datos en MAYUSCULAS y sin nada que el HTML escape.
SHOUT: dict[str, tuple[str, dict]] = {
    "quote_portal_named": ("quote_portal_email", dict(
        contact_name="ANA", workspace_name="ACME", quote_number="Q-100", total=1234.5,
        currency="USD", valid_until="2026-09-01", portal_url="P-URL")),
    "quote_portal_anonymous": ("quote_portal_email", dict(
        contact_name=None, workspace_name="ACME", quote_number="Q-100", total=99.0,
        currency="MXN", valid_until=None, portal_url="P-URL")),
    "quote_accepted": CASES["quote_accepted"],
    "sales_order_created": CASES["sales_order_created"],
    "workflow_failed": ("workflow_failed_email", dict(workflow_name="SYNC", error="BOOM")),
    "invoice_overdue": CASES["invoice_overdue"],
    "low_stock": ("low_stock_email", dict(product_name="WIDGET", sku="W-1", current_stock=3, min_stock=10)),
    "seller_accept": ("seller_accept_email", dict(
        client_name="ANA", workspace_name="ACME", quote_number="Q-100",
        order_number="ORD-5", total=1234.5, currency="USD")),
    "seller_reject_with_reason": ("seller_reject_email", dict(
        client_name="ANA", workspace_name="ACME", quote_number="Q-100", reason="TOO PRICEY")),
    "seller_reject_no_reason": ("seller_reject_email", dict(
        client_name="ANA", workspace_name="ACME", quote_number="Q-100", reason=None)),
    "client_confirmation": ("client_confirmation_email", dict(
        workspace_name="ACME", quote_number="Q-100", order_number="ORD-5")),
}

# El nombre del producto no se traduce.
BRAND_WORDS = {"Platform"}


def render(spec: tuple[str, dict], **extra) -> list[str]:
    name, kwargs = spec
    return list(getattr(templates, name)(**kwargs, **extra))


def shout(tree: dict) -> dict:
    """Cada letra de un mensaje pasa a mayuscula; `{x}` y `<etiqueta>` no se tocan."""
    protected = re.compile(r"(\{[^{}]*\}|<[^<>]*>)")

    def one(message: str) -> str:
        return "".join(
            part if protected.fullmatch(part) else part.upper() for part in protected.split(message)
        )

    return {k: shout(v) if isinstance(v, dict) else one(v) for k, v in tree.items()}


@pytest.fixture
def with_shouting_english(monkeypatch):
    real = catalogue.load_catalogues()
    monkeypatch.setattr(
        catalogue,
        "load_catalogues",
        lambda: {**real, "en": {d: shout(t) for d, t in real["es"].items()}},
    )


def lowercase_words(parts: list[str]) -> set[str]:
    """Palabras en minuscula que quedan en el texto visible de un correo."""
    visible = " ".join(re.sub(r"<[^>]*>", " ", part) for part in parts)
    return {w for w in re.findall(r"[^\W\d_]{2,}", visible) if w != w.upper()} - BRAND_WORDS


# ── En espanol, nada cambia ──────────────────────────────────────────────────


async def test_the_golden_file_covers_every_case():
    assert set(GOLDEN) == set(CASES)


@pytest.mark.parametrize("case", sorted(CASES))
async def test_spanish_output_is_byte_for_byte_what_it_always_was(case):
    assert render(CASES[case]) == GOLDEN[case]


@pytest.mark.parametrize("case", sorted(CASES))
async def test_the_spanish_locales_render_the_same(case):
    assert render(CASES[case], locale="es") == GOLDEN[case]
    assert render(CASES[case], locale="es-MX") == GOLDEN[case]


@pytest.mark.parametrize("case", sorted(CASES))
async def test_a_locale_without_catalogue_renders_in_spanish(case):
    assert render(CASES[case], locale="xx") == GOLDEN[case]


# ── En otro idioma ───────────────────────────────────────────────────────────


@pytest.mark.parametrize("case", sorted(SHOUT))
async def test_no_spanish_word_is_left_behind(with_shouting_english, case):
    """El control que importa: lo cableado sale en minusculas."""
    subject, text, html = render(SHOUT[case], locale="en")

    assert lowercase_words([subject]) == set(), "asunto"
    assert lowercase_words([text]) == set(), "texto"
    assert lowercase_words([html]) == set(), "html"


@pytest.mark.parametrize("case", sorted(SHOUT))
async def test_the_control_can_fail(case):
    """Sin el segundo idioma el mismo control encuentra el espanol: no es decorativo."""
    subject, text, html = render(SHOUT[case])

    assert lowercase_words([subject, text, html]) != set()


@pytest.mark.parametrize("case", sorted(SHOUT))
async def test_the_data_survives_in_the_second_language(with_shouting_english, case):
    _, kwargs = SHOUT[case]
    subject, text, html = render(SHOUT[case], locale="en")

    # Todo dato de la prueba (van en mayusculas) llega al correo: ningun marcador se pierde.
    wanted = {v for v in kwargs.values() if isinstance(v, str) and v == v.upper() and re.search(r"[A-Z]", v)}
    assert wanted, "el caso deberia llevar algun dato"
    for value in wanted:
        assert value in subject + text + html, value


async def test_html_escaping_is_kept_in_every_language(with_shouting_english):
    # Las plantillas que escapaban el nombre del cliente lo siguen haciendo.
    _, text, html = render(CASES["seller_accept"], locale="en")

    assert "Ana &lt;b&gt; &amp; Co" in html
    assert "<b>" not in html
    assert "Ana <b> & Co" in text  # el texto plano no escapa


async def test_a_message_missing_in_a_language_falls_back_to_spanish(monkeypatch):
    real = catalogue.load_catalogues()
    monkeypatch.setattr(catalogue, "load_catalogues", lambda: {**real, "en": {"email": {}}})

    assert render(CASES["quote_accepted"], locale="en") == GOLDEN["quote_accepted"]
