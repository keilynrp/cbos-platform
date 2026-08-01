#!/usr/bin/env python3
"""Validate that Event Registry V1 matches event constants in code.

This script intentionally avoids importing the application. It parses source
files and markdown directly so it can run in the lightweight governance job.
"""

from __future__ import annotations

import ast
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
EVENT_TYPES = ROOT / "backend" / "app" / "events" / "types.py"
EVENT_REGISTRY = ROOT / "docs" / "EVENT_REGISTRY_V1.md"
APP_DIR = ROOT / "backend" / "app"

EVENT_NAME_RE = re.compile(r"^[A-Z][A-Za-z0-9]+$")
REGISTRY_ROW_RE = re.compile(r"^\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|")


def load_event_constants() -> dict[str, str]:
    tree = ast.parse(EVENT_TYPES.read_text(encoding="utf-8"))
    constants: dict[str, str] = {}
    for node in tree.body:
        if not isinstance(node, ast.Assign) or len(node.targets) != 1:
            continue
        target = node.targets[0]
        if not isinstance(target, ast.Name) or not target.id.isupper():
            continue
        if not isinstance(node.value, ast.Constant) or not isinstance(node.value.value, str):
            continue
        constants[target.id] = node.value.value
    return constants


def load_registry_events() -> dict[str, str]:
    events: dict[str, str] = {}
    for line in EVENT_REGISTRY.read_text(encoding="utf-8").splitlines():
        match = REGISTRY_ROW_RE.match(line)
        if match:
            events[match.group(1)] = match.group(2)
    return events


def event_values_from_expr(expr: ast.expr, constants: dict[str, str]) -> set[str]:
    if isinstance(expr, ast.Constant) and isinstance(expr.value, str):
        return {expr.value}
    if isinstance(expr, ast.Name) and expr.id in constants:
        return {constants[expr.id]}
    if isinstance(expr, ast.IfExp):
        return event_values_from_expr(expr.body, constants) | event_values_from_expr(expr.orelse, constants)
    return set()


def load_published_events(constants: dict[str, str]) -> set[str]:
    published: set[str] = set()
    for path in APP_DIR.rglob("*.py"):
        if path == EVENT_TYPES:
            continue
        try:
            tree = ast.parse(path.read_text(encoding="utf-8"))
        except SyntaxError:
            continue
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call) or getattr(node.func, "id", None) != "Event":
                continue
            for keyword in node.keywords:
                if keyword.arg == "event_type":
                    published.update(event_values_from_expr(keyword.value, constants))
    return published


def main() -> int:
    constants = load_event_constants()
    constant_values = set(constants.values())
    registry = load_registry_events()
    registry_values = set(registry)
    published = load_published_events(constants)

    errors: list[str] = []

    duplicate_values = {
        value for value in constant_values if list(constants.values()).count(value) > 1
    }
    if duplicate_values:
        errors.append(f"Duplicate event constant values: {sorted(duplicate_values)}")

    invalid_names = sorted(value for value in constant_values if not EVENT_NAME_RE.match(value))
    if invalid_names:
        errors.append(f"Event names must be PascalCase: {invalid_names}")

    missing_from_registry = sorted(constant_values - registry_values)
    if missing_from_registry:
        errors.append(f"Event constants missing from docs/EVENT_REGISTRY_V1.md: {missing_from_registry}")

    missing_from_constants = sorted(registry_values - constant_values)
    if missing_from_constants:
        errors.append(f"Registry events missing from backend/app/events/types.py: {missing_from_constants}")

    bad_versions = sorted(event for event, version in registry.items() if version != "1.0")
    if bad_versions:
        errors.append(f"Registry events must use version 1.0 unless an ADR changes policy: {bad_versions}")

    published_missing = sorted(published - registry_values)
    if published_missing:
        errors.append(f"Published Event(event_type=...) values missing from registry: {published_missing}")

    if errors:
        print("Event registry check failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(
        f"Event registry checks passed: {len(constant_values)} constants, "
        f"{len(registry_values)} registry entries, {len(published)} statically detected publishers."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
