"""Resolucion de locale: el unico sitio que decide de quien es el idioma.

ADR 0016. El orden, resuelto una vez y con el primer acierto ganando:

    1. locale del usuario autenticado     (`users.locale`)
    2. locale de la sesion de portal      (`portal_sessions.locale`)
    3. cabecera `Accept-Language`
    4. locale por defecto del workspace   (`workspaces.default_locale`)
    5. `DEFAULT_LOCALE`

Todo lo que necesite un idioma pasa por `resolve_locale`. Dos sitios leyendo
`user.locale` directamente reintroducen la divergencia que este modulo existe
para quitar: `users.locale` es nulo a proposito ("sigue al workspace"), y solo
un lugar puede saber lo que eso significa.

Se reciben valores y no modelos para que `core` no dependa de ningun modulo, y
porque leer `user.workspace` en un contexto async dispara una carga perezosa.

Dos consultas distintas salen de un mismo valor guardado (ADR 0016, punto 4):

- el catalogo cae de `es-MX` a `es`   -> `catalogue_for`
- el formateo usa el tag completo     -> el retorno de `resolve_locale`
"""
from __future__ import annotations

from collections.abc import Sequence

# Idiomas que el producto ofrece: lo que acepta el PATCH del locale propio, lo
# que lee `Accept-Language` al registrarse y lo que resuelve `resolve_locale`.
SUPPORTED_LOCALES: tuple[str, ...] = ("es", "en")

# Idiomas con catalogo en el repo que aun no se ofrecen. Hoy ninguno: `en` paso a
# `SUPPORTED_LOCALES` en el ultimo paso de la tarea 12, cuando estuvo completo en las
# *dos* capas, el servidor (`locales/<idioma>/`, aqui) y la interfaz
# (`composable-os/src/locales`). Con solo una de las dos listas, un usuario con el
# navegador en ese idioma se registraria con el y recibiria el PDF y los correos en un
# idioma que la interfaz no habla, o al reves. Un idioma nuevo vuelve a entrar aqui
# mientras se traduce y sale cuando esta completo en las dos capas.
UNRELEASED_LOCALES: tuple[str, ...] = ()

DEFAULT_LOCALE = "es"

# Una cabecera hostil puede traer miles de entradas; ninguna persona declara
# mas de un puñado de idiomas.
_MAX_ACCEPT_LANGUAGE_ENTRIES = 20


def _is_alpha(value: str, lengths: tuple[int, ...]) -> bool:
    # isascii(): `str.isalpha` acepta letras de cualquier alfabeto y un tag BCP
    # 47 son solo ASCII.
    return len(value) in lengths and value.isascii() and value.isalpha()


def normalize_locale(
    raw: str | None, *, supported: Sequence[str] = SUPPORTED_LOCALES
) -> str | None:
    """Devuelve el tag canonico (`es`, `es-MX`) o `None` si no sirve.

    `None` cubre dos casos distintos a proposito —mal formado y bien formado
    pero sin catalogo— porque quien llama hace lo mismo en ambos: rechazar, o
    seguir la cadena de resolucion.

    Solo admite `idioma` o `idioma-REGION`, donde la region son dos letras
    (`MX`) o tres cifras (`419`, UN M.49: el espanol de Latinoamerica). Los
    subtags de escritura (`zh-Hant`) o variantes no se necesitan hoy, y
    aceptarlos sin uso es aceptar entrada que nadie ha probado.
    """
    if not isinstance(raw, str):
        return None

    parts = raw.strip().replace("_", "-").split("-")
    if len(parts) > 2:
        return None

    language = parts[0]
    if not _is_alpha(language, (2, 3)):
        return None
    language = language.lower()
    if language not in supported:
        return None

    if len(parts) == 1:
        return language

    region = parts[1]
    if _is_alpha(region, (2,)):
        return f"{language}-{region.upper()}"
    # isascii(): `str.isdigit` acepta cifras de otros alfabetos.
    if len(region) == 3 and region.isascii() and region.isdigit():
        return f"{language}-{region}"
    return None


def catalogue_for(
    locale: str, *, supported: Sequence[str] = SUPPORTED_LOCALES
) -> str:
    """Catalogo que sirve a un locale: el idioma base, o el por defecto."""
    base = locale.replace("_", "-").split("-")[0].lower()
    return base if base in supported else DEFAULT_LOCALE


def _parse_accept_language(header: str) -> list[str]:
    """Tags de la cabecera, del preferido al menos preferido.

    Tolerante: una cabecera mal formada nunca debe romper una peticion, y no
    hay nada que negociar con basura. Las entradas con `q=0` ("no lo quiero") y
    con un `q` ilegible se descartan; `*` no dice nada util.
    """
    ranked: list[tuple[float, int, str]] = []
    for index, entry in enumerate(header.split(",")[:_MAX_ACCEPT_LANGUAGE_ENTRIES]):
        segments = entry.split(";")
        tag = segments[0].strip()
        if not tag or tag == "*":
            continue

        quality = 1.0
        for segment in segments[1:]:
            segment = segment.strip().lower()
            if segment.startswith("q="):
                try:
                    quality = float(segment[2:])
                except ValueError:
                    quality = 0.0
        if quality <= 0:
            continue

        ranked.append((quality, index, tag))

    ranked.sort(key=lambda item: (-item[0], item[1]))
    return [tag for _, _, tag in ranked]


def _from_accept_language(header: str, supported: Sequence[str]) -> str | None:
    for tag in _parse_accept_language(header):
        match = normalize_locale(tag, supported=supported)
        if match is None:
            # Un tag que no sabemos leer entero (`es-Latn-419`, con escritura)
            # tiene aun un idioma que se sirve: mejor el catalogo base que ninguno.
            match = normalize_locale(tag.replace("_", "-").split("-")[0], supported=supported)
        if match is not None:
            return match
    return None


def resolve_locale(
    *,
    user_locale: str | None = None,
    portal_locale: str | None = None,
    accept_language: str | None = None,
    workspace_default: str | None = None,
    supported: Sequence[str] = SUPPORTED_LOCALES,
) -> str:
    """El locale efectivo, segun el orden del ADR 0016.

    Un valor guardado cuyo catalogo ya no existe se trata como ausente y sigue
    la cadena: retirar un idioma no puede dejar a nadie sin uno ni romper el
    render.
    """
    for candidate in (user_locale, portal_locale):
        match = normalize_locale(candidate, supported=supported)
        if match is not None:
            return match

    if accept_language:
        match = _from_accept_language(accept_language, supported)
        if match is not None:
            return match

    match = normalize_locale(workspace_default, supported=supported)
    if match is not None:
        return match

    return DEFAULT_LOCALE
