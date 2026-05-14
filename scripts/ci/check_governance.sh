#!/usr/bin/env bash

set -euo pipefail

BASE_SHA="${1:-}"
HEAD_SHA="${2:-}"

if [[ -z "${BASE_SHA}" || -z "${HEAD_SHA}" ]]; then
  echo "usage: check_governance.sh <base_sha> <head_sha>" >&2
  exit 2
fi

if [[ "${BASE_SHA}" =~ ^0+$ ]]; then
  CHANGED_FILES="$(git diff-tree --no-commit-id --name-only -r "${HEAD_SHA}")"
else
  CHANGED_FILES="$(git diff --name-only "${BASE_SHA}" "${HEAD_SHA}")"
fi

echo "Governance diff range: ${BASE_SHA}..${HEAD_SHA}"
echo "Changed files:"
echo "${CHANGED_FILES}"

contains() {
  local pattern="$1"
  if grep -Eq "${pattern}" <<<"${CHANGED_FILES}"; then
    return 0
  fi
  return 1
}

has_any_docs_change=false
if contains '^docs/'; then
  has_any_docs_change=true
fi

has_runtime_change=false
if contains '^backend/app/' || contains '^backend/alembic/' || contains '^composable-os/src/'; then
  has_runtime_change=true
fi

has_router_surface_change=false
if contains '^backend/app/modules/.+/router\.py$' || contains '^backend/app/health\.py$' || contains '^composable-os/src/(pages|services)/'; then
  has_router_surface_change=true
fi

has_event_contract_change=false
if contains '^backend/app/events/types\.py$'; then
  has_event_contract_change=true
fi

has_capability_or_api_docs=false
if contains '^docs/API_CONVENTIONS\.md$' || contains '^docs/IMPLEMENTATION_ALIGNMENT\.md$' || contains '^docs/capabilities/.+\.md$'; then
  has_capability_or_api_docs=true
fi

has_event_registry_update=false
if contains '^docs/EVENT_REGISTRY_V1\.md$'; then
  has_event_registry_update=true
fi

fail=false

if [[ "${has_runtime_change}" == true && "${has_any_docs_change}" == false ]]; then
  echo "ERROR: Runtime/product code changed without any docs/ update." >&2
  echo "See docs/GOVERNANCE_MODEL.md." >&2
  fail=true
fi

if [[ "${has_event_contract_change}" == true && "${has_event_registry_update}" == false ]]; then
  echo "ERROR: backend/app/events/types.py changed without docs/EVENT_REGISTRY_V1.md." >&2
  fail=true
fi

if [[ "${has_router_surface_change}" == true && "${has_capability_or_api_docs}" == false ]]; then
  echo "ERROR: Route or product surface changed without API/alignment/capability doc updates." >&2
  echo "Expected at least one of: docs/API_CONVENTIONS.md, docs/IMPLEMENTATION_ALIGNMENT.md, docs/capabilities/*.md." >&2
  fail=true
fi

if [[ "${fail}" == true ]]; then
  exit 1
fi

echo "Governance checks passed."
