"""
Tests del helper unico de resolucion de locale (ADR 0016).

Son funciones puras: no tocan la base ni el cliente HTTP. Los casos que
necesitan un segundo idioma pasan `supported=` a mano, porque hasta la tarea 12
del plan de i18n el unico catalogo enviado es `es` y un test que solo conociera
ese pasaria igual con el orden de resolucion roto.
"""
import pytest

from app.core.i18n import (
    DEFAULT_LOCALE,
    SUPPORTED_LOCALES,
    catalogue_for,
    normalize_locale,
    resolve_locale,
)

pytestmark = pytest.mark.asyncio

TWO = ("es", "en")


# ── normalize_locale ─────────────────────────────────────────


@pytest.mark.parametrize(
    "raw, expected",
    [
        ("es", "es"),
        ("ES", "es"),
        (" es ", "es"),
        ("es-MX", "es-MX"),
        ("es-mx", "es-MX"),
        ("es_MX", "es-MX"),
        # Region numerica UN M.49 (tres cifras): `es-419` es el espanol de
        # Latinoamerica y es un tag habitual en Accept-Language.
        ("es-419", "es-419"),
        ("ES_419", "es-419"),
    ],
)
async def test_normalize_canonicalises_case_and_separator(raw, expected):
    assert normalize_locale(raw) == expected


@pytest.mark.parametrize(
    "raw",
    [
        None, "", "   ", "fr", "xx", "spanish", "es-MX-extra", "es-", "-MX", "e", "es-M",
        # Una region numerica son exactamente tres cifras, ni mas ni menos ni mezcladas.
        "es-41", "es-4190", "es-4a9", "es-41M",
    ],
)
async def test_normalize_rejects_unsupported_or_malformed(raw):
    assert normalize_locale(raw) is None


async def test_normalize_checks_the_base_language_against_supported():
    assert normalize_locale("en-US") is None
    assert normalize_locale("en-US", supported=TWO) == "en-US"


async def test_shipped_catalogues_today_are_spanish_only():
    # Si esto cambia, la tarea 12 ya llego y varios tests de esta suite dejan
    # de ser el caso limite que pretenden ser: hay que revisarlos.
    assert SUPPORTED_LOCALES == ("es",)
    assert DEFAULT_LOCALE == "es"


# ── catalogue_for ────────────────────────────────────────────


async def test_catalogue_falls_back_from_region_to_base_language():
    assert catalogue_for("es-MX") == "es"
    assert catalogue_for("es") == "es"


async def test_catalogue_of_an_unshipped_language_is_the_default():
    assert catalogue_for("fr-FR") == DEFAULT_LOCALE


# ── resolve_locale: orden de resolucion ──────────────────────


async def test_nothing_known_resolves_to_the_deployment_default():
    assert resolve_locale() == DEFAULT_LOCALE


async def test_user_locale_beats_everything_else():
    got = resolve_locale(
        user_locale="en",
        portal_locale="es",
        accept_language="es",
        workspace_default="es",
        supported=TWO,
    )
    assert got == "en"


async def test_portal_locale_applies_when_there_is_no_user():
    got = resolve_locale(
        portal_locale="en",
        accept_language="es",
        workspace_default="es",
        supported=TWO,
    )
    assert got == "en"


async def test_accept_language_beats_the_workspace_default():
    got = resolve_locale(
        accept_language="en-US,en;q=0.9",
        workspace_default="es",
        supported=TWO,
    )
    assert got == "en-US"


async def test_workspace_default_applies_when_nothing_more_specific_is_set():
    assert resolve_locale(workspace_default="en", supported=TWO) == "en"


async def test_null_user_locale_follows_the_workspace():
    # NULL significa "sigue al workspace", no "sin idioma": cambiar el default
    # del workspace tiene que mover a quien nunca expreso preferencia.
    assert resolve_locale(user_locale=None, workspace_default="en", supported=TWO) == "en"


async def test_stored_value_without_a_catalogue_falls_through():
    # Un catalogo retirado no debe dejar al usuario sin idioma ni romper el
    # render: se ignora el valor guardado y se sigue la cadena.
    got = resolve_locale(user_locale="fr", workspace_default="en", supported=TWO)
    assert got == "en"


async def test_region_subtag_is_preserved_for_formatting():
    assert resolve_locale(user_locale="es-MX") == "es-MX"
    assert resolve_locale(workspace_default="es-MX") == "es-MX"


# ── resolve_locale: Accept-Language ──────────────────────────


async def test_accept_language_honours_q_values():
    got = resolve_locale(accept_language="es;q=0.5,en;q=0.9", supported=TWO)
    assert got == "en"


async def test_accept_language_ignores_zero_q():
    got = resolve_locale(accept_language="en;q=0,es", supported=TWO)
    assert got == "es"


async def test_accept_language_skips_unsupported_languages():
    got = resolve_locale(accept_language="fr-FR,fr;q=0.9,es;q=0.8", supported=TWO)
    assert got == "es"


async def test_accept_language_with_nothing_shipped_falls_to_workspace():
    got = resolve_locale(
        accept_language="fr-FR,fr;q=0.9", workspace_default="es", supported=TWO
    )
    assert got == "es"


async def test_accept_language_keeps_a_numeric_region():
    # `es-419` es valido y la region importa para el formato: antes se reducia a
    # `es` en el registro mientras el PATCH del locale propio lo rechazaba.
    assert resolve_locale(accept_language="es-419") == "es-419"
    assert resolve_locale(accept_language="es-419,en;q=0.5", supported=TWO) == "es-419"


async def test_accept_language_reduces_a_tag_it_cannot_parse_to_the_base_language():
    # Escritura + region (`es-Latn-419`) no se admite hoy, pero el idioma si esta.
    assert resolve_locale(accept_language="es-Latn-419") == "es"


@pytest.mark.parametrize("header", ["*", "", "   ", "q=0.9", ";;;", "es;q=abc,", "🙂"])
async def test_accept_language_garbage_never_raises(header):
    assert resolve_locale(accept_language=header, workspace_default="es") == "es"
