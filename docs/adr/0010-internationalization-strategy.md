# ADR 0010 — Internationalization Strategy

**Status:** Accepted — Option B implemented, Option C committed
**Date:** 2026-08-05 (Option B) · 2026-08-07 (product answer, Option C committed)
**Deciders:** Platform team

---

## Context

The platform is written in Spanish on the frontend and English on the backend. That
split is invisible until a request fails: the user reads a Spanish interface and
gets `Cannot delete a project in 'active' status. Only planning projects can be
deleted.` in a toast. Every mutation error surfaces the backend's own message,
so the mix is systematic rather than incidental.

The inconsistency became visible while auditing error handling. Two handlers had
been reading an axios-shaped `e.response.data.detail` that this codebase never
produces, so their users saw a generic fallback instead of the real reason; six
more discarded the error entirely. Fixing both made all 47 handlers surface the
backend message — which is correct behaviour, and which is what exposed the
language split across the whole product.

### What exists today

| Area | State |
|---|---|
| Frontend user-facing strings | ~470, hardcoded in Spanish across 19 active pages |
| i18n library | none |
| Backend error messages | 84 `raise HTTPException` with free-text English `detail` |
| `CBOSException` (`code` + `message` + `detail`) | defined in `core/exceptions.py`, wired into `main.py`, **not used by any module** |
| `Accept-Language` negotiation | none |
| Locale in the user or workspace model | none |

### Constraint from prior decisions

ADR 0002 freezes the MVP stack and states that technologies outside it "remain
future candidates only". The Implementation Alignment Gap Register repeats the
rule: *"Current stack remains frozen until justified — treat those areas as
target-state only unless promoted by ADR."* Adding an i18n runtime is exactly
that kind of expansion, which is why this ADR exists before any code.

No prior document — ADR, capability spec, scorecard or quarterly backlog —
mentions internationalization, locales or multi-language support. There is no
recorded product requirement for it.

---

## The question this ADR must answer — answered

**Is serving more than one language a product goal?**

**Yes.** Confirmed by the product owner on 2026-08-07. Serving more than one
language is a core requirement, not a possibility to keep open.

That settles what this ADR left deliberately unresolved, and it changes the
status of the options below: Option A is now ruled out rather than merely
cheaper, and Option C stops being a contingency and becomes committed work.

**Committed does not mean implemented.** Option C is roughly 470 user-facing
strings across 19 active pages, plus a locale on the user or workspace,
`Accept-Language` negotiation, and the server-rendered artifacts — invoice PDFs
and notification emails — which no frontend catalogue can reach. None of that
exists yet. What is done is Option B, which was chosen precisely because it
holds up under either answer.

---

## Options considered

### Option A — Single language, no i18n runtime

Translate the 84 backend messages to Spanish. No library, no locale
negotiation, no message catalogue.

- **Cost:** ~84 strings, one change set.
- **Fit:** correct if the product stays Spanish-only.
- **Risk:** if a second language is ever needed, this work is discarded and the
  hardcoded Spanish on the backend becomes a second migration.

### Option B — Error codes, translated in the frontend

Migrate the 84 `HTTPException` to `CBOSException` with stable snake_case codes.
The backend stops carrying user-facing prose; the frontend maps codes to text.

- **Cost:** 84 call sites across 11 modules, plus a code→text map. The
  `CBOSException` shape already exists and `api.ts` already reads
  `body.error.message`, so the plumbing is in place.
- **Fit:** the backend becomes language-neutral, which is right regardless of
  how many languages ship. It also makes error handling testable by code rather
  than by prose.
- **Risk:** if the frontend lacks a mapping for a code, the user sees the code.
  Needs a fallback.

### Option C — Full i18n on both sides

Option B plus an i18n runtime on the frontend, extraction of the ~470 strings
into catalogues, a language selector, a `locale` field on the user or workspace,
and `Accept-Language` negotiation for anything the backend renders directly —
notably invoice PDFs and notification emails, which are user-visible artifacts
generated server-side.

- **Cost:** the largest by a wide margin. ~470 strings is the extraction alone;
  the PDF and email paths need their own treatment.
- **Fit:** required if the product genuinely serves more than one language.
- **Risk:** a partial migration is worse than none — a screen half-translated
  reads as broken. This needs to be finished once started.

---

## Decision

**Option B is adopted and implemented.** Every module and `core/deps.py` raise
registered codes, CI enforces parity between the codes, the registry and the
frontend map, and the user-facing wording lives in
`composable-os/src/lib/errors.ts`.

**Option C is committed**, now that the product question is answered. It is not
scheduled here: this ADR records that multi-language is a core requirement and
that the backend must stay language-neutral, not when the catalogues get built.
Sequencing belongs to a backlog item, and the work is large enough to deserve
its own plan.

**Option A is ruled out.** Translating the backend's prose into Spanish would
have to be undone the moment a second language ships.

What Option B bought is precisely this: the decision arrived after the work,
and none of it has to be redone.

The reasoning is that Option B is the only work that is correct under *both*
answers to the product question. A backend that returns codes instead of prose
is better engineering whether the product ships one language or five: it stops
the server from deciding what the user reads, and it lets tests assert on a
stable identifier instead of a sentence someone may reword.

Option A is cheaper but bets on the answer. Option C is right only if the bet
goes the other way, and it is too large to undertake on a hypothesis.

Until Option B lands, translating the handful of most visible messages —
blocked deletions and invalid state transitions — relieves the immediate
symptom without committing to any of this.

---

## Consequences

**Positive:**
- The backend stops emitting user-facing prose; language becomes a frontend concern
- `CBOSException` starts being used for its stated purpose instead of sitting unused
- Error assertions in tests key on codes, so rewording a message stops breaking tests
- Option C becomes an additive step rather than a rewrite

**Negative:**
- 84 call sites change, touching every module
- A missing mapping degrades to showing a raw code; the fallback must be deliberate
- Error codes become a contract: renaming one is a breaking change for the frontend,
  in the same way event names are under ADR 0004

---

## Implementation plan

1. Define the code vocabulary and register it, in the spirit of
   `EVENT_REGISTRY_V1.md` — a code that is not registered should fail CI, the
   same way unregistered events do.
2. Migrate module by module, starting with the ones whose errors users hit most
   (`projects`, `hr`, `sales`), so the benefit is visible before the long tail.
3. Add the frontend map with an explicit fallback for unknown codes.
4. Extend `check_event_registry.py`, or add a sibling check, so that a
   `CBOSException` raised with an unregistered code fails the pipeline.

Each step is independently shippable; none of them requires committing to
Option C.

---

## Related

- ADR 0002: Freeze MVP stack — the constraint that makes this ADR necessary
- ADR 0004: Events as versioned domain contracts — the precedent for treating
  identifiers as a contract with registry enforcement in CI
- `docs/IMPLEMENTATION_ALIGNMENT.md`: "Frontend error surfacing" — the entry
  whose closure surfaced this
- `backend/app/core/exceptions.py`: the unused `CBOSException` shape
