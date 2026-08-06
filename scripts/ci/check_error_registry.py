#!/usr/bin/env python3
"""Comprueba que todo codigo de CBOSException este registrado.

Mismo criterio que check_event_registry.py para los eventos: un identificador
que cruza la frontera hacia el frontend es un contrato, y un contrato que nadie
verifica se degrada solo.

Falla si:
  - un `code=` que aparece en los modulos no esta en el registro
  - un codigo del registro no lo levanta ningun modulo (entrada muerta)
  - el frontend no traduce un codigo ya registrado

El detector es estatico y solo ve literales. Un `code=` armado en runtime pasa
inadvertido, igual que en el registro de eventos; la alternativa seria importar
y ejecutar los modulos, que cuesta mucho mas de lo que aporta.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REGISTRY = ROOT / "docs" / "ERROR_CODE_REGISTRY_V1.md"
MODULES = ROOT / "backend" / "app" / "modules"
FRONTEND_MAP = ROOT / "composable-os" / "src" / "lib" / "errors.ts"

# core/deps.py no es un modulo pero levanta los errores de autenticacion que
# devuelve cualquier ruta protegida. Dejarlo fuera del barrido haria que sus
# codigos parecieran entradas muertas del registro.
EXTRA_SOURCES = [ROOT / "backend" / "app" / "core" / "deps.py"]

# Los genericos de core/exceptions.py no describen un caso concreto y no se
# traducen: quedan fuera del registro a proposito.
GENERIC = {"NOT_FOUND", "CONFLICT", "VALIDATION_ERROR", "FORBIDDEN"}

_REGISTRY_CODE = re.compile(r"^\|\s*`([A-Z][A-Z0-9_]+)`\s*\|", re.M)
_RAISED_CODE = re.compile(r'code\s*=\s*"([A-Z][A-Z0-9_]+)"')
_MAPPED_CODE = re.compile(r"^\s{2}([A-Z][A-Z0-9_]+):", re.M)


def main() -> int:
    if not REGISTRY.exists():
        print(f"ERROR: falta el registro en {REGISTRY.relative_to(ROOT)}")
        return 1

    registered = set(_REGISTRY_CODE.findall(REGISTRY.read_text(encoding="utf-8")))

    # Se barre todo el modulo, no solo service.py: hay codigos que se levantan
    # desde el router (workflows/router.py, por ejemplo) y quedarian invisibles.
    raised: dict[str, str] = {}
    sources = sorted(MODULES.glob("*/*.py")) + [p for p in EXTRA_SOURCES if p.exists()]
    for path in sources:
        for code in _RAISED_CODE.findall(path.read_text(encoding="utf-8")):
            raised.setdefault(code, path.relative_to(ROOT).as_posix())

    mapped = set(_MAPPED_CODE.findall(FRONTEND_MAP.read_text(encoding="utf-8"))) \
        if FRONTEND_MAP.exists() else set()

    problems: list[str] = []

    for code, where in sorted(raised.items()):
        if code in GENERIC:
            continue
        if code not in registered:
            problems.append(f"  {code} se levanta en {where} pero no esta en el registro")

    for code in sorted(registered - set(raised) - GENERIC):
        problems.append(f"  {code} esta en el registro pero ningun modulo lo levanta")

    for code in sorted(registered - mapped - GENERIC):
        problems.append(f"  {code} esta registrado pero el frontend no lo traduce")

    if problems:
        print("Error code registry checks failed:")
        print("\n".join(problems))
        print(f"\nRegistro: {REGISTRY.relative_to(ROOT)}")
        print(f"Mapa del frontend: {FRONTEND_MAP.relative_to(ROOT)}")
        return 1

    specific = [code for code in raised if code not in GENERIC]
    print(
        f"Error code registry checks passed: {len(registered)} codigos registrados, "
        f"{len(specific)} levantados, {len(mapped)} traducidos."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
