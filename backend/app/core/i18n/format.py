"""Formato de fechas e importes de lo que el servidor dibuja (tarea 10 del plan de i18n).

El frontend deja esto a `Intl` (`composable-os/src/i18n/format.ts`). El servidor no
lo tiene: un PDF o un correo se arman con texto y no con un runtime del navegador. En
vez de anadir `babel` por dos idiomas, una tabla propia con las mismas reglas por
defecto que el frontend (`REGION_DEFAULTS`: `es` -> `es-MX`, `en` -> `en-US`):

    format_number(1160, "es-MX")  -> "1,160.00"
    format_number(1160, "es-ES")  -> "1160,00"        # el espanol de Espana no agrupa 4 cifras
    format_date(date(2026, 8, 3), "en")  -> "08/03/2026"
    format_date(date(2026, 8, 3), "es")  -> "03/08/2026"

Una region que no esta en la tabla (`es-AR`, `en-AU`) usa la regla por defecto de su
idioma, igual que el catalogo cae de `es-MX` a `es`. Una region con reglas propias se
anade a `_RULES`. Si el dia de manana el producto atiende muchas regiones, ese es el
momento de cambiar la tabla por `babel`; el contrato de estas funciones no cambia.

Una fecha ISO (`"2026-09-01"`) que llega como texto —los eventos la traen asi— se
interpreta y se formatea; un texto que no es una fecha sale tal cual, porque un
documento con un dato raro es mejor que un documento que no se genera.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime

from app.core.i18n import DEFAULT_LOCALE


@dataclass(frozen=True)
class _Rule:
    group: str
    decimal: str
    date_pattern: str
    # Cifras enteras minimas para agrupar (CLDR `minimumGroupingDigits`): en espanol
    # de Espana `1234,50` no lleva separador y `12.345,50` si.
    min_grouping: int = 1


_RULES: dict[str, _Rule] = {
    "es-MX": _Rule(group=",", decimal=".", date_pattern="%d/%m/%Y"),
    "es-ES": _Rule(group=".", decimal=",", date_pattern="%d/%m/%Y", min_grouping=2),
    "en-US": _Rule(group=",", decimal=".", date_pattern="%m/%d/%Y"),
    "en-GB": _Rule(group=",", decimal=".", date_pattern="%d/%m/%Y"),
}

# La region que se asume cuando solo hay idioma. La misma tabla que el frontend.
_LANGUAGE_DEFAULTS: dict[str, str] = {"es": "es-MX", "en": "en-US"}


def _rule_for(locale: str | None) -> _Rule:
    tag = (locale or DEFAULT_LOCALE).replace("_", "-")
    parts = tag.split("-")
    language = parts[0].lower()
    if len(parts) > 1:
        full = f"{language}-{parts[1].upper()}"
        if full in _RULES:
            return _RULES[full]
    default = _LANGUAGE_DEFAULTS.get(language, _LANGUAGE_DEFAULTS[DEFAULT_LOCALE])
    return _RULES[default]


def format_number(
    value: float, locale: str | None = DEFAULT_LOCALE, *, decimals: int | None = 2
) -> str:
    """`1160` -> `1,160.00` en `es`/`en`, con los separadores de la region.

    `decimals=None` no fija decimales: `10` -> `10`, `2.5` -> `2.5` (una cantidad).
    """
    rule = _rule_for(locale)
    if decimals is None:
        text = f"{value:,.6f}".rstrip("0").rstrip(".")
    else:
        text = f"{value:,.{decimals}f}"
    integer_digits = len(text.split(".")[0].lstrip("-").replace(",", ""))
    if integer_digits < rule.min_grouping + 3:
        text = text.replace(",", "")
    # Dos pasos: cambiar `,` por `.` y `.` por `,` en uno solo se pisaria.
    return text.replace(",", "\0").replace(".", rule.decimal).replace("\0", rule.group)


def format_money(
    value: float, currency: str, locale: str | None = DEFAULT_LOCALE, *, decimals: int = 2
) -> str:
    """`USD 1,160.00`: el codigo de moneda, un espacio y el importe segun el idioma."""
    return f"{currency} {format_number(value, locale, decimals=decimals)}"


def format_date(value: date | datetime | str, locale: str | None = DEFAULT_LOCALE) -> str:
    """La fecha en el orden y el separador del idioma (`03/08/2026` o `08/03/2026`)."""
    if isinstance(value, str):
        try:
            value = date.fromisoformat(value[:10])
        except ValueError:
            return value
    return value.strftime(_rule_for(locale).date_pattern)
