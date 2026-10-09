"""
Fechas e importes del servidor segun el idioma (`core/i18n/format.py`, tarea 10).

Las reglas por defecto son las del frontend (`es` -> `es-MX`, `en` -> `en-US`), asi
que el mismo importe se ve igual en la interfaz y en el PDF.
"""
from datetime import date, datetime

import pytest

from app.core.i18n.format import format_date, format_money, format_number

AUG_3 = date(2026, 8, 3)


@pytest.mark.parametrize(
    "locale, expected",
    [
        ("es", "1,234,567.50"),
        ("es-MX", "1,234,567.50"),
        ("en", "1,234,567.50"),
        ("en-US", "1,234,567.50"),
        ("en_us", "1,234,567.50"),
        ("en-GB", "1,234,567.50"),
        ("es-ES", "1.234.567,50"),
        ("es-AR", "1,234,567.50"),  # sin regla propia: la del idioma
        ("fr", "1,234,567.50"),  # sin catalogo: la del idioma por defecto
        (None, "1,234,567.50"),
    ],
)
def test_number_separators_follow_the_region(locale, expected):
    assert format_number(1234567.5, locale) == expected


def test_spanish_of_spain_does_not_group_four_digits():
    assert format_number(1234.5, "es-ES") == "1234,50"
    assert format_number(12345.5, "es-ES") == "12.345,50"
    assert format_number(-1234.5, "es-ES") == "-1234,50"
    assert format_number(1234.5, "es-MX") == "1,234.50"


def test_small_and_negative_amounts_keep_their_shape():
    assert format_number(0, "en") == "0.00"
    assert format_number(999.999, "en") == "1,000.00"
    assert format_number(-1234.5, "en") == "-1,234.50"
    assert format_number(7, "es-ES", decimals=0) == "7"


def test_money_is_code_space_amount():
    assert format_money(1160, "USD", "en") == "USD 1,160.00"
    assert format_money(1160, "EUR", "es-ES") == "EUR 1160,00"


@pytest.mark.parametrize(
    "locale, expected",
    [
        ("es", "03/08/2026"),
        ("es-MX", "03/08/2026"),
        ("es-ES", "03/08/2026"),
        ("en", "08/03/2026"),
        ("en-US", "08/03/2026"),
        ("en-GB", "03/08/2026"),
        ("fr", "03/08/2026"),
        (None, "03/08/2026"),
    ],
)
def test_date_order_follows_the_language(locale, expected):
    assert format_date(AUG_3, locale) == expected


def test_a_datetime_formats_as_its_date():
    assert format_date(datetime(2026, 8, 3, 23, 59), "en") == "08/03/2026"


def test_an_iso_string_is_read_and_formatted():
    assert format_date("2026-08-03", "en") == "08/03/2026"
    assert format_date("2026-08-03T10:00:00+00:00", "es") == "03/08/2026"


def test_text_that_is_not_a_date_comes_out_untouched():
    assert format_date("pronto", "en") == "pronto"
    assert format_date("", "en") == ""
