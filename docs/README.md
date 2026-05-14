# Docs Index

## Governing Documentation

The documents in this section are the active source of truth for architecture and implementation decisions:

- `FOUNDATIONAL_ARCHITECTURE.md`
- `CAPABILITY_MATRIX_MVP.md`
- `IMPLEMENTATION_ALIGNMENT.md`
- `TECHNICAL_BACKLOG_30_60_90.md`
- `SPRINT_BACKLOG_8_WEEKS.md`
- `GITHUB_PROJECT_BACKLOG.md`
- `GITHUB_ISSUES_READY.md`
- `PROJECT_BOARD_RECOMMENDED.md`
- `SPRINT_1_KICKOFF_PACK.md`
- `API_CONVENTIONS.md`
- `EVENT_REGISTRY_V1.md`
- `PUBLIC_SITE_LEAD_INTAKE_V1.md`
- `SPRINT_1_API_EVENTS_AUDIT.md`
- `EVENT_REGISTRY_V1_TEMPLATE.md`
- `API_CONVENTIONS_TEMPLATE.md`
- `capabilities/`
- `adr/`

## Strategic Integration Documents

The following document is intentionally **not** a governing runtime contract:

- `cbos_sdd_portal_integration_contract.md`

Use it as target-state guidance for external brand-site integration. If it conflicts with active routes, event names, envelopes, or implemented capability behavior, the governing documentation listed above wins.

## Rule Of Use

- Use the governing documentation first
- Treat `archive/` as historical reference only
- Do not reintroduce archived architectural directions into active implementation unless promoted by ADR

## Intent

This structure exists to keep architecture, roadmap, and code aligned around the current CBOS foundation and MVP wedge.
