"""
Catalogos del backend (tarea 10 del plan de i18n).

El backend es neutral al idioma salvo en los artefactos que renderiza el servidor
—los PDF de factura y los correos—, que leen su texto de `core/i18n/locales/`.
Aqui se fija el mecanismo; lo que cada artefacto dice lo comprueba su propio test.

Hasta la tarea 12 solo existe `es`. Los casos de "otro idioma" usan un catalogo
pseudo-localizado (`EN(<original>)`) inyectado en el cargador, como hace el
frontend: es la unica forma de probar que el mecanismo distingue idiomas antes
de que haya un segundo.
"""
import pytest

from app.core.i18n import DEFAULT_LOCALE, SUPPORTED_LOCALES, UNRELEASED_LOCALES, normalize_locale, resolve_locale
from app.core.i18n import catalogue
from app.core.i18n.catalogue import exists, translate

# El conftest limpia la base antes de cada test, aunque estos no la usen.
pytestmark = pytest.mark.asyncio


def pseudo_localize(tree: dict, prefix: str = "EN") -> dict:
    """Cada cadena pasa a `EN(<original>)`; los marcadores `{x}` se conservan."""
    return {
        key: pseudo_localize(value, prefix) if isinstance(value, dict) else f"{prefix}({value})"
        for key, value in tree.items()
    }


def flatten(tree: dict, prefix: str = "") -> set[str]:
    keys: set[str] = set()
    for key, value in tree.items():
        path = f"{prefix}{key}"
        if isinstance(value, dict):
            keys |= flatten(value, f"{path}.")
        else:
            keys.add(path)
    return keys


@pytest.fixture
def with_pseudo_english(monkeypatch):
    """Anade un `en` pseudo-localizado a los catalogos reales."""
    real = catalogue.load_catalogues()
    monkeypatch.setattr(
        catalogue,
        "load_catalogues",
        lambda: {**real, "en": {d: pseudo_localize(t) for d, t in real["es"].items()}},
    )


# ── Los catalogos enviados ───────────────────────────────────────────────────


async def test_the_default_locale_has_a_catalogue():
    assert DEFAULT_LOCALE in catalogue.load_catalogues()


async def test_supported_locales_are_exactly_the_shipped_catalogues():
    # Cada carpeta de `locales/` esta en una de las dos listas de `core/i18n`:
    # ofrecida (`SUPPORTED_LOCALES`) o completa pero aun sin ofrecer
    # (`UNRELEASED_LOCALES`). Ni una carpeta suelta, ni un idioma listado sin texto.
    assert set(catalogue.load_catalogues()) == set(SUPPORTED_LOCALES) | set(UNRELEASED_LOCALES)


async def test_a_language_is_either_offered_or_unreleased_not_both():
    assert not set(SUPPORTED_LOCALES) & set(UNRELEASED_LOCALES)


async def test_an_unreleased_language_is_not_reachable_on_its_own():
    # Tiene catalogo y `translate` lo sirve, pero nadie llega a el solo: ni por el
    # PATCH del locale, ni por `Accept-Language`, ni por el workspace.
    assert normalize_locale("en") is None
    assert resolve_locale(user_locale="en", accept_language="en-US,en;q=0.9") == DEFAULT_LOCALE
    assert translate("invoice_pdf:title", "en") == "INVOICE"


async def test_every_catalogue_has_the_same_keys_as_the_default():
    catalogues = catalogue.load_catalogues()
    expected = {d: flatten(t) for d, t in catalogues[DEFAULT_LOCALE].items()}

    for language, domains in catalogues.items():
        assert {d: flatten(t) for d, t in domains.items()} == expected, language


async def test_every_message_is_a_string():
    # Un valor que no sea cadena (una lista, un numero) rompe `str.format`.
    for domains in catalogue.load_catalogues().values():
        for tree in domains.values():
            assert all(isinstance(v, str) for v in _leaves(tree))


def _leaves(tree: dict):
    for value in tree.values():
        if isinstance(value, dict):
            yield from _leaves(value)
        else:
            yield value


# ── translate ────────────────────────────────────────────────────────────────


async def test_translates_a_key_in_the_default_language():
    assert translate("invoice_pdf:title", "es") == "FACTURA"


async def test_the_locale_defaults_to_the_default_language():
    assert translate("invoice_pdf:title") == "FACTURA"


async def test_interpolates_parameters():
    assert translate("invoice_pdf:footer", "es", number="INV-7") == "Factura INV-7  |  Generado por CBOS"


async def test_a_regional_tag_uses_the_base_catalogue():
    # ADR 0016, punto 4: el catalogo cae de `es-MX` a `es`.
    assert translate("invoice_pdf:title", "es-MX") == "FACTURA"
    assert translate("invoice_pdf:title", "es-419") == "FACTURA"


async def test_a_language_without_catalogue_falls_back_to_the_default():
    assert translate("invoice_pdf:title", "fr") == "FACTURA"


async def test_garbage_locales_fall_back_instead_of_raising():
    for locale in ("", "not a locale", "--", "ES_mx"):
        assert translate("invoice_pdf:title", locale) == "FACTURA"


async def test_an_unknown_key_is_a_bug_and_raises():
    # Maquillar una clave inexistente imprimiria "invoice_pdf:typo" en una factura.
    with pytest.raises(KeyError):
        translate("invoice_pdf:no.such.key", "es")
    with pytest.raises(KeyError):
        translate("no_such_domain:title", "es")


async def test_a_key_that_points_at_a_group_is_not_a_message():
    with pytest.raises(KeyError):
        translate("invoice_pdf:status", "es")


async def test_a_missing_parameter_is_a_bug_and_raises():
    with pytest.raises(KeyError):
        translate("invoice_pdf:footer", "es")


async def test_exists():
    assert exists("invoice_pdf:title", "es")
    assert exists("invoice_pdf:status.paid", "es-MX")
    assert not exists("invoice_pdf:status.archived", "es")
    assert not exists("invoice_pdf:status", "es")
    assert not exists("no_such_domain:title", "es")
    assert not exists("title", "es")


# ── Con un segundo idioma ────────────────────────────────────────────────────


async def test_each_language_reads_its_own_catalogue(with_pseudo_english):
    assert translate("invoice_pdf:title", "es") == "FACTURA"
    assert translate("invoice_pdf:title", "en") == "EN(FACTURA)"
    assert translate("invoice_pdf:title", "en-US") == "EN(FACTURA)"


async def test_the_placeholders_survive_in_the_second_language(with_pseudo_english):
    assert translate("invoice_pdf:footer", "en", number="INV-7") == "EN(Factura INV-7  |  Generado por CBOS)"


async def test_a_key_missing_in_a_language_falls_back_to_the_default(monkeypatch):
    real = catalogue.load_catalogues()
    partial = {"invoice_pdf": {"title": "INVOICE"}}
    monkeypatch.setattr(catalogue, "load_catalogues", lambda: {**real, "en": partial})

    assert translate("invoice_pdf:title", "en") == "INVOICE"
    # No hay `footer` en `en`: sale el texto en espanol, no un error en una factura.
    assert translate("invoice_pdf:footer", "en", number="INV-7") == "Factura INV-7  |  Generado por CBOS"
    assert exists("invoice_pdf:footer", "en")
