# Sprint 1 Kickoff Pack

## Purpose

This document gives the team an immediate operating guide for Sprint 1.

Use it to start execution without reopening architecture debates that are already resolved by the governing docs.

## Sprint 1 Goal

Lock the execution foundation for the MVP wedge by clarifying ownership, contracts, and implementation truth.

## Sprint 1 Success Condition

Sprint 1 is successful if the team finishes the sprint with:

- clear ownership for all wedge-critical modules
- one explicit executable wedge scenario
- documented API conventions
- event registry v1 for wedge-critical events
- a truthful view of frontend surfaces versus real capability maturity

## Sprint 1 Priority Order

Execute work in this order:

1. Assign ownership for wedge-critical modules
2. Define the executable wedge scenario
3. Publish API conventions for MVP modules
4. Create event registry v1 for wedge-critical events
5. Audit frontend surfaces against wedge reality

Do not start lower-priority work while higher-priority work remains ambiguous.

## Week 1 Sequence

### Day 1

- review `docs/FOUNDATIONAL_ARCHITECTURE.md`
- review `docs/CAPABILITY_MATRIX_MVP.md`
- review `docs/IMPLEMENTATION_ALIGNMENT.md`
- confirm the Sprint 1 issue owners
- confirm the wedge-critical modules

### Day 2

- write the executable wedge scenario
- map wedge steps to modules
- identify ambiguity points

### Day 3

- define API conventions
- review conventions against existing module reality
- record mismatches

### Day 4

- define event registry v1
- list wedge-critical producers
- identify missing event versions or naming inconsistencies

### Day 5

- classify frontend surfaces
- identify exploratory pages that need staging or deprioritization
- update `docs/IMPLEMENTATION_ALIGNMENT.md` with Sprint 1 findings

## Daily Checklist

- confirm which Sprint 1 issue is the current top priority
- verify that active work still strengthens the wedge
- identify any architecture gap discovered in code
- record new findings in the appropriate governing doc
- avoid starting exploratory work

## Definition Of Ready

A Sprint 1 issue is ready when:

- it has a clear owner
- the issue body and acceptance criteria are understood
- required documents are linked
- blockers are known

## Definition Of Done

A Sprint 1 issue is done when:

- the acceptance criteria are met
- the output exists in the correct governing doc
- any discovered gap is reflected in `docs/IMPLEMENTATION_ALIGNMENT.md`
- the team can reuse the output without extra verbal explanation

## Sprint 1 Deliverables

- updated ownership view for wedge-critical modules
- executable wedge scenario
- API conventions baseline
- event registry v1
- frontend surface classification

## Risks To Watch In Sprint 1

- drifting into feature building before contract clarification
- reopening future-stack debates
- treating exploratory pages as delivery commitments
- leaving ownership implicit

## Escalation Rule

If the team finds a disagreement that affects architecture, domain boundaries, or stack direction:

- pause implementation on that decision
- resolve it through the governing docs
- add an ADR if the decision changes the current baseline

## End Of Sprint 1 Review Questions

- Do we know exactly what the wedge is in implementation terms?
- Do we know who owns each wedge-critical module?
- Do current APIs follow one set of conventions?
- Do wedge-critical events have a named registry entry?
- Does the UI surface reflect capability maturity honestly?

