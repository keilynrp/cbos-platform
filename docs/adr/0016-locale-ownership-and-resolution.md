# ADR 0016 — Locale Ownership and Resolution

**Status:** Accepted
**Date:** 2026-08-07
**Deciders:** Platform team (product decision)

---

## Context

ADR 0014 committed multi-language support; ADR 0015 chose the frontend runtime.
Neither answers the question that blocks the work: **whose language is it, and
where is it stored?**

Nothing in the system records a language today. There is no `locale` column on
any model and no `Accept-Language` handling anywhere in `backend/app/`. Every
user-facing string is Spanish by construction, and the four date/currency
formatting sites that do specify a locale hardcode `"es-MX"`.

This is a product decision before it is an implementation one, which is why it
is recorded rather than assumed.

### Two populations, not one

The i18n plan treated "the language of someone who is not a user" as its hardest
open question. Reading the code narrows it sharply.

Of the nine email templates in `core/email.py`, **seven go to authenticated
users**:

- `quote_accepted_email`, `sales_order_created_email`, `workflow_failed_email`,
  `low_stock_email`, `invoice_overdue_email` — recipients resolved by
  `email_notifier._get_eligible_recipients()`, which selects `User` rows in the
  workspace filtered by `notification_preferences`
- `seller_accept_email`, `seller_reject_email` — sent to `creator.email`, also a
  `User`

**Two go to external clients**: `quote_portal_email` and
`client_confirmation_email`. Both are sent from `portal/service.py`, and both
already have a `PortalSession` in hand — a model that stores `client_name` and
`client_email`, set at creation time through `PortalSessionCreate`.

So the external-recipient problem is not a new concept in search of a home. It
is one nullable column on a model that already exists to carry exactly this kind
of per-share client data.

---

## Decision

### 1. The authenticated user owns their locale

Two columns:

| Column | Type | Default |
|---|---|---|
| `users.locale` | `String(10)`, nullable | `NULL` → falls back to workspace |
| `workspaces.default_locale` | `String(10)`, not null | `"es"` |

`users.locale` is nullable on purpose: `NULL` means "follow the workspace"
rather than "no language", so changing a workspace default moves every user who
never expressed a preference, which is the behaviour a workspace admin expects.

**A workspace default alone was rejected.** A workspace can operate across
countries, and forcing one language per tenant solves the simple case while
blocking the real one. **A user column alone was also rejected**: it leaves no
answer for the moments when there is no authenticated user, and registration is
one of them.

### 2. The external recipient's locale is decided when the link is shared

One nullable column, `portal_sessions.locale`, set through
`PortalSessionCreate` and defaulted in the share dialog to the workspace
default. The two client-facing emails read it.

The alternative — a language field on `Organization`/`Person` — was rejected for
now, not on cost but on who knows the answer and when. It requires whoever
creates a CRM contact to know that contact's language before anyone needs it,
and the field then rots silently when it is wrong. Deciding at share time puts
the choice at the moment the sender is actually thinking about the recipient.

This is a reversible decision. If per-client language turns out to be a real
attribute rather than a per-share one, `PortalSession.locale` becomes the
default-from-contact rather than default-from-workspace, and nothing built on it
has to be undone.

### 3. Resolution order

Resolved once per request, in this order, first match wins:

1. `user.locale` — when the request is authenticated
2. `portal_session.locale` — when rendering for an external portal recipient
3. `Accept-Language` — matched against the shipped catalogues
4. `workspace.default_locale`
5. `"es"` — the deployment default

**`Accept-Language` matters in exactly one place**, which is smaller than the
plan assumed: user registration. `identity.service.register()` creates the
workspace and the user in the same call, so there is no stored preference to read
and no workspace to inherit from — the request header is the only signal
available. Everywhere else an authenticated user or a portal session is already
in scope.

Notably, `GET /invoices/{id}/pdf` already injects the user and discards it
(`_: User = Depends(get_current_user)` in `accounting/router.py:110`). The PDF's
locale comes from that binding, not from negotiation.

### 4. Locale values are BCP 47 tags, validated at the boundary

Stored as BCP 47 language tags (`"es"`, `"en"`). Region subtags (`"es-MX"`) are
permitted and preserved, because formatting legitimately varies by region even
when the catalogue does not — which is what the four hardcoded `"es-MX"` call
sites were reaching for.

Two different lookups follow from one stored value:

- **Catalogue lookup** falls back from tag to base language: `"es-MX"` resolves
  the `es` catalogue. Shipping a catalogue per region is not planned.
- **Formatting** (`Intl`, `date-fns`) uses the full stored tag.

The endpoint that sets a user's locale validates against the set of shipped
catalogues and rejects anything else with a registered error code, rather than
silently falling back. A silent fallback here is how a user ends up unable to
explain why their language setting does nothing.

---

## Consequences

**Positive:**
- Two users in one workspace can work in different languages, which is the case
  that motivated i18n
- `core/email.py` is unblocked — the plan's task 11 was gated on this ADR, and
  the seven internal templates need no new concept at all
- The four hardcoded `"es-MX"` formatting sites get a real source of truth
  instead of a second, contradictory one
- Registration is the only place that parses `Accept-Language`, so the
  negotiation surface is one function rather than a middleware concern

**Negative:**
- Three new columns across two modules, and a migration touching `users`,
  `workspaces` and `portal_sessions`
- `PortalSession.locale` records the language of a share, not of a client, so a
  workspace that re-shares with the same client repeatedly will re-pick it each
  time. Accepted as the cost of not guessing.
- The nullable-means-inherit rule on `users.locale` has to be honoured in one
  resolution helper. Two code paths reading the column directly would reintroduce
  the divergence this ADR exists to remove.

---

## Implementation notes

Sequenced in `docs/superpowers/plans/2026-08-07-i18n-full.md`, task 2. In short:

1. One Alembic migration for all three columns, with
   `workspaces.default_locale` backfilled to `"es"` — matching current behaviour,
   so the migration changes no rendered output
2. A single resolution helper that implements the order above; nothing reads
   `user.locale` directly
3. `PATCH` on the user's own locale, validated against shipped catalogues
4. `locale` on `PortalSessionCreate`, plus the field in the share dialog

---

## Related

- ADR 0014: Internationalization strategy — the commitment
- ADR 0015: react-i18next promotion — the frontend runtime that consumes this
- `docs/superpowers/plans/2026-08-07-i18n-full.md`: tasks 2 and 11
- `backend/app/modules/portal/models.py`: `PortalSession`, which already carries
  per-share client data
- `backend/app/modules/notifications/email_notifier.py`: the seven internal
  recipients resolved from `User` rows
