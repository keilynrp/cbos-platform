#!/usr/bin/env python3
"""Comprueba que el conteo de tests documentado coincida con el real.

Los cuatro documentos con puntuacion se desviaron dos veces del numero real,
la segunda pese a existir ya una regla escrita en el Gap Register que mandaba
re-derivarlo en el mismo cambio. Una regla que depende de que alguien la
recuerde en cada PR se salta sola; esta es la version que no se olvida.

Mismo criterio que check_event_registry.py y check_error_registry.py: lo que
cruza hacia fuera —aqui, la cifra con la que se juzga la madurez del proyecto—
es un contrato, y un contrato que nadie verifica se degrada.

El numero real sale de `pytest --collect-only -q`, no de contar funciones con
una expresion regular: parametrize y las clases de test harian que esa cuenta
mintiera.
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"

# Patrones de TOTAL. Deliberadamente estrictos para no confundirse con los
# conteos por modulo del README —"(41 tests)", "24 tests."— que son distintos
# a proposito y no deben seguir al total.
TOTAL_PATTERNS = [
    r"\*\*(\d+) tests\*\*",                    # README: **668 tests** en 39 archivos
    r"(\d+) tests \(pytest-asyncio\)",         # README: arbol del repositorio
    r"Test suite: (\d+) automated tests",      # IMPLEMENTATION_ALIGNMENT
    r"Codebase has (\d+) tests",               # IMPLEMENTATION_ALIGNMENT, gap register
    r"\*\*(\d+) tests across",                 # CAPABILITY_MATURITY_SCORECARD
]

FILE_PATTERNS = [
    r"en (\d+) archivos",
    r"across (\d+) test files",
]

DOCS = [
    ROOT / "README.md",
    ROOT / "docs" / "IMPLEMENTATION_ALIGNMENT.md",
    ROOT / "docs" / "CAPABILITY_MATURITY_SCORECARD.md",
]


def _collect_counts() -> tuple[int, int]:
    """Numero real de tests y de archivos de test."""
    proc = subprocess.run(
        [sys.executable, "-m", "pytest", "--collect-only", "-q"],
        cwd=BACKEND,
        capture_output=True,
        text=True,
    )
    # Un fallo de coleccion —un import roto, una dependencia sin instalar— hace
    # que pytest igual imprima "N tests collected" con el subconjunto que si
    # pudo cargar. Fiarse de ese numero es comparar contra un total truncado y
    # reportar una deriva que no existe, o peor, darla por buena. El codigo de
    # salida es lo unico que distingue una coleccion completa de una a medias.
    if proc.returncode != 0:
        print("ERROR: la coleccion de tests fallo, el conteo no es fiable.")
        print((proc.stdout or proc.stderr)[-1500:])
        raise SystemExit(1)

    match = re.search(r"(\d+) tests? collected", proc.stdout)
    if not match:
        print("ERROR: no se pudo leer el conteo de `pytest --collect-only -q`.")
        print(proc.stdout[-1500:] or proc.stderr[-1500:])
        raise SystemExit(1)
    return int(match.group(1)), len(list((BACKEND / "tests").glob("test_*.py")))


def main() -> int:
    tests, files = _collect_counts()
    problems: list[str] = []

    for doc in DOCS:
        if not doc.exists():
            problems.append(f"  falta {doc.relative_to(ROOT)}")
            continue
        text = doc.read_text(encoding="utf-8")
        rel = doc.relative_to(ROOT).as_posix()

        found = False
        for pattern, expected, label in (
            [(p, tests, "tests") for p in TOTAL_PATTERNS]
            + [(p, files, "archivos") for p in FILE_PATTERNS]
        ):
            for value in re.findall(pattern, text):
                found = True
                if int(value) != expected:
                    problems.append(
                        f"  {rel}: dice {value} {label}, el real es {expected}"
                    )

        # Sin esto el check se vuelve decorativo: bastaria reescribir la frase
        # para que dejara de encontrar nada y pasara siempre en verde, que es
        # justo el modo de fallo que se quiere evitar.
        if not found:
            problems.append(
                f"  {rel}: ningun patron reconocido. Si se reescribio la frase, "
                f"actualiza TOTAL_PATTERNS en {Path(__file__).name}"
            )

    if problems:
        print("Test count checks failed:")
        print("\n".join(problems))
        print(f"\nReal: {tests} tests en {files} archivos.")
        print("Re-derivalo con: docker compose exec backend pytest --collect-only -q")
        return 1

    print(f"Test count checks passed: {tests} tests en {files} archivos, "
          f"coherente en {len(DOCS)} documentos.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
