"""Catalogos de texto de los artefactos que renderiza el servidor.

El backend es neutral al idioma: responde codigos y datos, y el frontend los
traduce (ADR 0014). Las excepciones son lo que el servidor *dibuja* y entrega ya
hecho —el PDF de factura y los correos—, que no pasan por ningun catalogo del
frontend. Su texto vive aqui:

    core/i18n/locales/<idioma>/<dominio>.json

Misma disposicion que `composable-os/src/locales`, y por lo mismo: **enviar un
idioma es que aparezca su carpeta**. Un fichero por dominio (`invoice_pdf`, luego
`email`) y no uno por idioma, para que un diff se pueda revisar.

    translate("invoice_pdf:status.paid", "es")             -> "Pagada"
    translate("invoice_pdf:footer", "es-MX", number="7")   -> "Factura 7  |  ..."

Las claves son `dominio:ruta.anidada`. Los marcadores son `{nombre}` (`str.format`),
no `{{nombre}}` como en el frontend: el JSON de aqui no pasa por i18next.

Que hace cuando algo falta, y por que:

- **Un idioma sin catalogo, o con un tag regional** (`es-MX`, `fr`): cae al
  catalogo base y, si no hay, al por defecto (ADR 0016, punto 4). Nunca lanza:
  un locale guardado cuyo catalogo se retiro no puede romper una factura.
- **Una clave que falta en un idioma pero existe en el por defecto**: sale el
  texto por defecto y se avisa en el log. Mejor una etiqueta en otro idioma que
  un PDF que no se genera; el test de paridad impide que llegue a produccion.
- **Una clave que no existe en el catalogo por defecto**, o un marcador sin
  valor: `KeyError`. Es un error de programacion, y maquillarlo imprimiria
  `invoice_pdf:typo` en un documento que se le entrega a un cliente.

No hay plurales: ningun texto de estos artefactos cuenta cosas. Cuando uno lo
haga, es la hora de decidir entre reglas CLDR (`babel`) y una tabla propia, junto
con el formato de fechas e importes, que tampoco sigue al idioma todavia.
"""
from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path

from app.core.i18n import DEFAULT_LOCALE, catalogue_for

logger = logging.getLogger(__name__)

LOCALES_DIR = Path(__file__).parent / "locales"

# `idioma -> dominio -> arbol de cadenas`
Catalogues = dict[str, dict[str, dict]]


@lru_cache(maxsize=1)
def _read_catalogues() -> Catalogues:
    catalogues: Catalogues = {}
    for language_dir in sorted(p for p in LOCALES_DIR.iterdir() if p.is_dir()):
        catalogues[language_dir.name] = {
            file.stem: json.loads(file.read_text(encoding="utf-8"))
            for file in sorted(language_dir.glob("*.json"))
        }
    return catalogues


def load_catalogues() -> Catalogues:
    """Todos los catalogos enviados. Los tests lo sustituyen para anadir un idioma."""
    return _read_catalogues()


def _lookup(domains: dict[str, dict], key: str) -> str | None:
    """La cadena en `dominio:ruta.anidada`, o `None` si no hay una cadena ahi."""
    domain, separator, path = key.partition(":")
    if not separator or not path:
        return None

    node: object = domains.get(domain)
    for part in path.split("."):
        if not isinstance(node, dict) or part not in node:
            return None
        node = node[part]

    # Un grupo (`status`) no es un mensaje: pedirlo es un error, no un dict.
    return node if isinstance(node, str) else None


def _find(key: str, locale: str | None) -> str | None:
    catalogues = load_catalogues()
    language = catalogue_for(locale or DEFAULT_LOCALE, supported=tuple(catalogues))

    message = _lookup(catalogues.get(language, {}), key)
    if message is None and language != DEFAULT_LOCALE:
        message = _lookup(catalogues.get(DEFAULT_LOCALE, {}), key)
        if message is not None:
            logger.warning("i18n: '%s' is missing in the '%s' catalogue", key, language)
    return message


def exists(key: str, locale: str | None = DEFAULT_LOCALE) -> bool:
    """Si `translate` encontraria texto para la clave (en el idioma o en el por defecto)."""
    return _find(key, locale) is not None


def translate(key: str, locale: str | None = DEFAULT_LOCALE, **params: object) -> str:
    """El texto de `key` en el idioma de `locale`, con los marcadores rellenos."""
    message = _find(key, locale)
    if message is None:
        raise KeyError(key)
    return message.format(**params)
