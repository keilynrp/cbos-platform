"""Cadenas huerfanas de los catalogos del backend (plan de i18n, "Verificacion").

El check de paridad (`test_i18n_catalogue.py`) cubre el que falten claves en un
idioma. Este cubre lo contrario: una clave del catalogo que ningun codigo pide
se queda para siempre y se traduce por nada, y una clave que el codigo pide y no
existe revienta con `KeyError` solo cuando alguien llega a esa rama.

Es un barrido estatico con `ast`. Ve tres formas de pedir un texto:

- `translate("dominio:ruta", ...)` con un literal;
- `t("clave")` dentro de una funcion que hizo `t = _scope("grupo", locale)`, que
  es como `core/email.py` pide `email:grupo.clave`;
- `fallback_text("clave")`, que es `email:fallback.clave`.

Lo que arma la clave en runtime (un f-string) no se ve, y por eso `_scope` y
`fallback_text` son los unicos sitios autorizados a hacerlo: el barrido los
entiende y los marca. Una cuarta forma que aparezca debe dar un fallo aqui, no
pasar callada.

Los controles se prueban primero con fuentes inventadas: con un solo idioma, un
barrido que no encuentra nada pasa igual que uno que funciona.
"""
from __future__ import annotations

import ast
import re
from pathlib import Path

from app.core.i18n import DEFAULT_LOCALE
from app.core.i18n.catalogue import load_catalogues

APP = Path(__file__).resolve().parents[1] / "app"


def leaf_keys(tree: dict, prefix: str = "") -> list[str]:
    keys: list[str] = []
    for name, value in tree.items():
        path = f"{prefix}.{name}" if prefix else name
        keys.extend(leaf_keys(value, path) if isinstance(value, dict) else [path])
    return keys


def catalogue_keys() -> set[str]:
    return {
        f"{domain}:{path}"
        for domain, tree in load_catalogues()[DEFAULT_LOCALE].items()
        for path in leaf_keys(tree)
    }


def _literal(node: ast.AST) -> str | None:
    return node.value if isinstance(node, ast.Constant) and isinstance(node.value, str) else None


def _call_name(call: ast.Call) -> str | None:
    func = call.func
    if isinstance(func, ast.Name):
        return func.id
    if isinstance(func, ast.Attribute):
        return func.attr
    return None


# Dentro de estas funciones se arma la clave a proposito: son los constructores
# que el barrido entiende por su nombre (`email:<grupo>.<clave>` y
# `email:fallback.<clave>`), y sus llamadores se cuentan por separado.
BUILDERS = {"_scope", "fallback_text", "t"}

_FUNCTIONS = (ast.FunctionDef, ast.AsyncFunctionDef)


def _pattern(node: ast.JoinedStr) -> str:
    """`f"d:status.{s}"` -> `d:status.*`."""
    return "".join(
        part.value if isinstance(part, ast.Constant) else "*" for part in node.values
    )


def find_key_uses(source: str) -> tuple[list[tuple[str, int]], list[int]]:
    """`([(clave o patron, linea)...], [lineas con una clave que no se ve])`.

    Un patron (`d:status.*`) es una clave interpolada con un valor que llega en
    runtime, como el estado de una factura: usa todo lo que case. Un `translate`
    con una variable como clave solo se admite en una funcion que arma uno.
    """
    uses: set[tuple[str, int]] = set()
    opaque: set[int] = set()
    tree = ast.parse(source)
    scopes = [tree] + [n for n in ast.walk(tree) if isinstance(n, _FUNCTIONS)]

    # Lo que hay dentro de un constructor no se cuenta, ni desde su propio ambito
    # ni desde el que lo contiene: ahi la clave se arma a proposito.
    inside_builder = {
        id(node)
        for fn in ast.walk(tree)
        if isinstance(fn, _FUNCTIONS) and fn.name in BUILDERS
        for node in ast.walk(fn)
    }

    for scope in scopes:
        group = None
        patterns = 0
        calls = []
        for node in ast.walk(scope):
            if id(node) in inside_builder:
                continue
            if isinstance(node, ast.Call) and node.args:
                calls.append(node)
                # El grupo es de la funcion: en el modulo entero se mezclarian.
                if _call_name(node) == "_scope" and isinstance(scope, _FUNCTIONS):
                    group = _literal(node.args[0]) or group
            elif isinstance(node, ast.JoinedStr):
                text = _pattern(node)
                # `d:status.*` acota; `d:*` casaria con todo el dominio y haria
                # que el barrido diera por usado lo que nadie pide.
                if re.match(r"^[A-Za-z_]+:[^*\s]", text):
                    uses.add((text, node.lineno))
                    patterns += 1

        for call in calls:
            name, first = _call_name(call), call.args[0]
            key = _literal(first)
            if name == "translate":
                if key is not None:
                    uses.add((key, call.lineno))
                elif isinstance(first, ast.JoinedStr):
                    if not re.match(r"^[A-Za-z_]+:[^*\s]", _pattern(first)):
                        opaque.add(call.lineno)
                elif patterns == 0:
                    opaque.add(call.lineno)
            elif name == "fallback_text" and key is not None:
                uses.add((f"email:fallback.{key}", call.lineno))
            elif name == "t" and group is not None and key is not None:
                uses.add((f"email:{group}.{key}", call.lineno))
    return sorted(uses, key=lambda u: (u[1], u[0])), sorted(opaque)


def _matches(pattern: str, known: set[str]) -> set[str]:
    regex = re.compile("^" + ".*".join(re.escape(p) for p in pattern.split("*")) + "$")
    return {key for key in known if regex.match(key)}


def used_keys() -> tuple[set[str], list[str], list[str]]:
    used: set[str] = set()
    missing: list[str] = []
    opaque: list[str] = []
    known = catalogue_keys()
    for file in sorted(APP.rglob("*.py")):
        uses, hidden = find_key_uses(file.read_text(encoding="utf-8"))
        rel = file.relative_to(APP).as_posix()
        for key, line in uses:
            hits = _matches(key, known)
            used |= hits
            if not hits and key.split(":")[0] in {k.split(":")[0] for k in known}:
                missing.append(f"{rel}:{line} {key}")
        opaque.extend(f"{rel}:{line}" for line in hidden)
    return used, missing, opaque


# ── Los controles pueden fallar ──────────────────────────────────────────────


def test_the_scanner_sees_a_literal_translate_call():
    uses, opaque = find_key_uses('def f():\n    return translate("d:a.b", "es")\n')
    assert uses == [("d:a.b", 2)] and opaque == []


def test_the_scanner_sees_scoped_and_fallback_keys():
    source = (
        "def build(locale):\n"
        '    t = _scope("quotePortal", locale)\n'
        '    return t("subject"), fallback_text("clientName", locale)\n'
    )
    uses, _ = find_key_uses(source)
    assert sorted(key for key, _ in uses) == ["email:fallback.clientName", "email:quotePortal.subject"]


def test_the_scanner_flags_a_key_built_at_runtime():
    _, opaque = find_key_uses('def f(k):\n    return translate(f"d:{k}", "es")\n')
    assert opaque == [2]


def test_the_scanner_lets_the_two_known_builders_do_it():
    source = (
        "def _scope(group, locale):\n"
        "    def t(key):\n"
        '        return translate(f"email:{group}.{key}", locale)\n'
        "    return t\n"
    )
    assert find_key_uses(source)[1] == []


# ── Los catalogos reales ─────────────────────────────────────────────────────


def test_the_sweep_finds_the_keys_the_code_asks_for():
    used, _, _ = used_keys()
    # Si el barrido dejara de entender `_scope`, esto seria 0 y los dos checks de
    # abajo pasarian sin mirar nada.
    assert len(used) > 50
    assert "invoice_pdf:title" in used and "email:quotePortal.subject" in used


def test_no_key_is_built_in_a_way_the_sweep_cannot_see():
    _, _, opaque = used_keys()
    assert opaque == []


def test_the_code_asks_for_no_key_that_does_not_exist():
    _, missing, _ = used_keys()
    assert missing == []


def test_no_catalogue_key_is_orphaned():
    used, _, _ = used_keys()
    assert sorted(catalogue_keys() - used) == []
