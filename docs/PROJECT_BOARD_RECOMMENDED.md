# Project Board Recommended

## Purpose

This document defines a practical GitHub Project setup for operating the MVP wedge backlog.

## Board Type

Use a single product-engineering board for the current quarter.

The board should prioritize visibility over complexity.

## Recommended Columns

### Backlog

Work not yet ready for active execution.

### Ready

Work that has:

- clear owner
- clear acceptance criteria
- no major unresolved dependency

### In Progress

Actively executed work.

Keep WIP low.

### Review

Work under technical review, product review, or validation.

### Done

Completed and accepted work.

## Recommended Fields

### Title

Short issue title.

### Epic

Parent initiative.

Recommended values:

- Foundation
- Identity and CRM
- Inventory and Orders
- Sales and Workflows
- Operational Risk
- Next Quarter Preparation

### Sprint

Recommended values:

- Sprint 1
- Sprint 2
- Sprint 3
- Sprint 4
- Sprint 5
- Sprint 6
- Buffer

### Capability

Recommended values:

- Identity
- CRM
- Sales
- Inventory
- Workflows
- Cross-cutting

### Priority

Recommended values:

- P0
- P1
- P2

Meaning:

- `P0`: blocks the wedge directly
- `P1`: materially strengthens wedge delivery or quality
- `P2`: useful but deferrable

### Architecture Impact

Recommended values:

- High
- Medium
- Low

### Wedge Relevance

Recommended values:

- Direct
- Supporting
- Exploratory

### Owner

Single accountable person.

### Status

Recommended values:

- Backlog
- Ready
- In Progress
- Review
- Done

## Prioritization Rules

- `P0` work always wins over exploratory work
- no exploratory item should enter `In Progress` if a `P0` wedge item is blocked
- architecture work should stay attached to delivery outcomes, not float separately

## Suggested Initial Board Population

### Ready

- Assign ownership for wedge-critical modules
- Define the executable wedge scenario
- Publish API conventions for MVP modules
- Create event registry v1 for wedge-critical events
- Audit frontend surfaces against wedge reality

### Backlog

- all Sprint 2 to Sprint 6 items from `docs/GITHUB_PROJECT_BACKLOG.md`

## Weekly Operating Rhythm

### Weekly Planning

- move only a small number of items into `Ready`
- ensure each selected item has acceptance criteria
- confirm owner and dependency status

### Midweek Check

- review blocked items
- check whether any exploratory work is bypassing wedge priorities
- reassign if ownership is unclear

### Sprint Close

- update `docs/IMPLEMENTATION_ALIGNMENT.md`
- update capability maturity understanding
- move incomplete work with explicit reason

## Anti-Patterns To Avoid

- too many active items at once
- architecture tickets disconnected from module delivery
- UI work that implies unsupported backend maturity
- promoting future-stack work into the current quarter without ADR and evidence

