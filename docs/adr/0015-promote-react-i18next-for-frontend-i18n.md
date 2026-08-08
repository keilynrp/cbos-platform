# ADR 0015 — Promote react-i18next for Frontend Internationalization

**Status:** Accepted
**Date:** 2026-08-07
**Deciders:** Platform team

---

## Context

ADR 0014 committed multi-language support as a core product requirement. The
frontend half of that work is 514 hardcoded Spanish strings across 19 active
pages, and it cannot start until the runtime that will hold them is chosen.

ADR 0002 freezes the MVP stack and states that technologies outside it "remain
future candidates only". The Implementation Alignment Gap Register repeats the
rule: *"Current stack remains frozen until justified — treat those areas as
target-state only unless promoted by ADR."* An i18n runtime is exactly that kind
of expansion, so it needs a promotion rather than a package install.

### What the codebase already tells us

The question is not academic. The existing code already tries to solve
pluralization three different ways, and all three are wrong:

| Location | Code | What breaks |
|---|---|---|
| `Workflows.tsx:75` | `{n} condition{n > 1 ? "s" : ""}` | Renders "0 condition"; also English in a Spanish UI |
| `Invoicing.tsx:473`, `:503` | `{summary.paid_count} facturas pagadas` | Reads wrong at 1 — "1 facturas pagadas" |
| `PortalBuilder.tsx:1004` | `{sessions.length} sesiones de portal` | Same, at 1 |
| `Settings.tsx:537` | `` `... of ${...length} event types active` `` | Concatenated, and English |

These are not hypothetical future needs. They are four bugs that exist today
because there is no plural mechanism, and any solution that does not provide one
leaves them in place.

Two dependencies relevant to the decision are already in the stack:
`date-fns@^3.6.0` (currently used in exactly one file) and the browser `Intl`
API, used in 54 scattered call sites. Neither is an i18n runtime, but both mean
date and currency formatting needs no new dependency.

---

## Options considered

### Option 1 — `react-i18next`

The de facto standard for React. Provides interpolation, CLDR-backed
pluralization, namespaced and lazily loaded catalogues, and a `useTranslation`
hook that fits the existing component style. No build step, so Vite configuration
is unaffected.

- **Cost:** two runtime dependencies (`i18next`, `react-i18next`), roughly 40KB
  gzipped combined.
- **Risk:** it is a large API surface, and most of it will go unused. That is
  acceptable — the unused parts cost nothing at runtime beyond bundle size.

### Option 2 — A hand-rolled module (~50 lines)

A `t()` function over plain JSON objects, with a React context for the active
locale. Zero dependencies, and genuinely defensible on size.

- **Cost:** ~50 lines, plus the plural rules.
- **Why it loses:** the plural rules are the whole problem. Spanish and English
  both have two plural forms, so a naive `n === 1` looks sufficient — until a
  language with different rules is added, at which point the rules have to be
  written per language by hand. The four bugs above are what hand-rolled plural
  logic looks like in this codebase already. Writing a fifth version of it, more
  carefully, is not obviously better than adopting the CLDR data.

### Option 3 — `FormatJS` / `react-intl`

More rigorous: ICU MessageFormat covers plurals, genders, and nested selects,
with number and date formatting integrated rather than left to `Intl` calls.

- **Cost:** comparable bundle size, but a heavier authoring format.
- **Why it loses:** ICU message syntax is markedly harder to review in a diff
  than a flat JSON string, and reviewability matters here specifically — 514
  strings will land across a dozen pull requests, and the plan's governing rule
  is that a surface ships complete or not at all. Reviewers need to be able to
  read the catalogue. The extra expressive power of ICU is not needed for a
  product whose two languages have the same plural cardinality.

---

## Decision

**Adopt `react-i18next`**, promoted into the frozen stack under ADR 0002 for the
frontend tier only.

Scope of the promotion:

- `i18next` and `react-i18next` are added to `composable-os/package.json`
- Catalogues live in `composable-os/src/locales/<lang>/`, split by domain
  (`common`, `crm`, `sales`, …) rather than one file per language — 514 strings
  in a single JSON is not reviewable in a diff
- The existing `src/lib/errors.ts` code→text map is **integrated, not
  duplicated**: it stops mapping error codes to Spanish text and starts mapping
  them to translation keys
- Date and currency formatting does **not** use i18next. It uses the `date-fns`
  and `Intl` already in the stack, behind helpers that read the active locale

**This promotion does not extend to the backend.** The backend renders two
artifacts a frontend catalogue cannot reach — invoice PDFs and notification
emails — and those get plain Python dictionaries in
`backend/app/core/i18n/<lang>.py`. That is ~173 strings with no pluralization,
which does not justify a second i18n dependency in a second language.

---

## Consequences

**Positive:**
- The four existing plural bugs get fixed by the mechanism rather than patched
  individually
- Lazy catalogue loading means adding languages does not grow the initial bundle
- `useTranslation` is a hook, so it composes with the existing component
  patterns without a wrapper layer
- Interpolation replaces string concatenation, which is what makes word order
  translatable at all

**Negative:**
- Two new runtime dependencies and ~40KB gzipped, on a frontend that currently
  has none for this purpose
- A missing key renders the key itself unless a fallback is configured
  deliberately — the same failure mode the error-code map already has, and it
  needs the same explicit handling
- The library's API is much larger than what this product uses, so conventions
  have to be set by review rather than by the library

---

## Verification

The check that matters is the one that fails when the abstraction is hollow. A
`t("key")` that always returns Spanish is indistinguishable from a broken one
until a second catalogue exists, so:

- CI fails if a key used in code is missing from the catalogue, or if a
  catalogue key is used by nobody — same criterion as the event and error-code
  registries
- CI fails if one language has keys another lacks
- At least one test renders in the second language, not only the development one

---

## Related

- ADR 0002: Freeze MVP stack — the constraint this ADR exists to satisfy
- ADR 0014: Internationalization strategy — the commitment this implements
- ADR 0016: Locale ownership and resolution — where the active locale comes from
- `docs/superpowers/plans/2026-08-07-i18n-full.md`: the sequenced plan, task 1
- `docs/ERROR_CODE_REGISTRY_V1.md`: the registry-enforced-in-CI pattern being reused
