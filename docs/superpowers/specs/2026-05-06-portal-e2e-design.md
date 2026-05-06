# Portal End-to-End Hardening — Design Spec

**Date:** 2026-05-06
**Status:** Approved
**Scope:** Sprint 6

---

## Problem

The portal module backend is ~80% complete (session creation, public quote view, accept/reject, email sending infrastructure). However, the end-to-end flow is broken for real clients because:

1. `QuoteDetail.tsx` has no "Share with client" button — there is no way for a seller to generate a portal link from the quote detail page
2. `CustomerPortal.tsx` lacks professional presentation — missing workspace branding, expiration countdown, full financial breakdown, and a "Sign & Accept" CTA appropriate for B2B proposals
3. No seller notification when a client accepts or rejects — sellers must manually check the app

This blocks the final step of the MVP wedge: `Quote → Portal → Customer Action → Revenue`.

---

## Goals

- Seller can generate and share a portal link directly from `QuoteDetail`
- Customer sees a professional, branded view of the proposal with all financial details
- Customer can accept or reject with a single clear action
- After accepting, customer sees order number confirmation
- Seller receives an email when client accepts or rejects
- Client receives a confirmation email when they accept
- All edge cases handled: expired links, already-used links, invalid tokens

---

## Out of Scope

- Visual website builder (PortalBuilder.tsx drag-and-drop) — Phase 3 feature
- Portal session management hub / analytics — post-MVP
- Custom domain for portal URLs — post-MVP
- WhatsApp / Slack integrations — post-MVP

---

## Architecture

### Files Changed

**Frontend**

| File | Change |
|------|--------|
| `composable-os/src/pages/QuoteDetail.tsx` | Add "Compartir con cliente" button + share dialog |
| `composable-os/src/pages/CustomerPortal.tsx` | Full redesign to Level C + post-action confirmation screen |

**Backend**

| File | Change |
|------|--------|
| `backend/app/modules/portal/service.py` | Add seller + client email notifications in `portal_accept` and `portal_reject` |
| `backend/app/core/email.py` | Add 3 email templates: seller accept, seller reject, client confirmation |

**No changes needed:** portal router, portal schemas, portal models, portal.ts service, database migrations.

---

## Feature Design

### 1. QuoteDetail — "Compartir con cliente" button

**Button placement:** Top-right header row, alongside existing "Editar" and "PDF" buttons.

**Button states:**
- `draft` or `sent` quote → button active, opens share dialog
- `accepted` or `rejected` quote → button disabled with tooltip "Cotización ya procesada"
- Active portal session exists → button replaced by green status banner

**Active session banner (shown when session exists):**
```
✓ Link activo — enviado a juan@empresa.com · expira en 12 días    [Reenviar / nuevo link]
```
Clicking "Reenviar / nuevo link" reopens the share dialog to create a new session.

**Share Dialog fields:**
- `Nombre del cliente` — text input, optional (pre-filled if quote has contact linked)
- `Email del cliente` — email input, required
- `Válida por` — pill selector: 7d / **14d** (default) / 30d
- Quote summary shown as subtitle: `Q-0042 · $4,872`

**Share Dialog actions:**
- `📋 Copiar link` — calls `POST /portal/sessions`, copies `portal_url` to clipboard, shows toast "Link copiado"
- `📧 Enviar email` — calls `POST /portal/sessions` then `POST /portal/sessions/{id}/send-email`, shows toast "Email enviado a juan@empresa.com"

Both actions create the session. If a session already exists and is active, the dialog reuses the existing URL or creates a new one (old one remains valid until expiry).

---

### 2. CustomerPortal — Level C redesign

**Route:** `/portal/:token` (existing, no change)

**Layout: three sections**

**Header (branded):**
- Gradient background (blue → purple)
- Workspace logo placeholder (initials fallback)
- Workspace name
- Subtitle: "Te envió una propuesta"

**Quote body:**
- Title + quote number
- Expiration countdown badge (red when < 3 days)
- Line items table with description + amount
- Financial breakdown: Subtotal / Tax (rate + amount) / **Total** (highlighted green)
- Notes block if present (italic, muted)

**Action section:**
- Primary CTA: `✓ Aceptar y firmar propuesta` (green, full width)
- Secondary: `✗ Rechazar propuesta` (muted, full width)
- Footer: "¿Preguntas? Contacta a {workspace_name}"

Clicking "Aceptar" opens an inline confirmation form (not a new page):
- `Tu nombre` — pre-filled from session client_name if set
- `Notas (opcional)` — text area
- `Confirmar aceptación` button

Clicking "Rechazar" opens inline form:
- `Motivo (opcional)` — text area
- `Confirmar rechazo` button

**Post-action confirmation screen (replaces portal view):**
- Large checkmark (accept) or X (reject)
- "¡Propuesta aceptada!" / "Propuesta rechazada"
- Order number box: `SO-0042` (only on accept)
- Next steps list (only on accept): email confirmation, contact message, reference number
- Footer: "Este link ya no está disponible para más acciones"

**Edge case screens:**
- `410 Expired` → "Este link expiró. Contacta a {workspace_name} para solicitar uno nuevo."
- `404 Not found` → "Link inválido. Verifica que hayas copiado la URL completa."
- `Already acted` → Shows the confirmation screen directly (idempotent)

---

### 3. Backend — Email notifications

**`portal_accept()` additions:**

After order creation, send two emails:

1. **Seller notification** (`seller_accept_email`):
   - To: creator of the portal session (`session.created_by_id → User.email`)
   - Subject: `{client_name} aceptó la propuesta {quote_number}`
   - Body: client name, quote number, order number, total, link to order in app

2. **Client confirmation** (`client_confirmation_email`):
   - To: `session.client_email` (only if set)
   - Subject: `Confirmación — {quote_number} aceptada`
   - Body: workspace name, quote number, order number SO-XXXX, "Guarda este número"

**`portal_reject()` additions:**

1. **Seller notification** (`seller_reject_email`):
   - To: creator of the portal session
   - Subject: `{client_name} rechazó la propuesta {quote_number}`
   - Body: client name, quote number, rejection reason if provided

**Dev mode behavior:** All emails logged to console (existing behavior, no change).

**Seller email resolution:**
```python
creator = await db.get(User, session.created_by_id)
seller_email = creator.email if creator else None
if seller_email:
    await send_email(...)
```

---

## Data Flow

```
Seller                    Backend                    Client
  │                          │                          │
  ├─ POST /portal/sessions ──►│                          │
  │◄─ {portal_url, token} ───┤                          │
  │                          │                          │
  ├─ POST .../send-email ────►│──── email ──────────────►│
  │◄─ {sent: true} ──────────┤                          │
  │                          │                          │
  │                          │◄── GET /portal/quote/token┤
  │                          ├─── PortalQuoteView ──────►│
  │                          │                          │
  │                          │◄── POST .../accept ───────┤
  │                          │  1. Quote → accepted      │
  │                          │  2. SalesOrder created    │
  │                          │  3. Inventory reserved    │
  │                          │  4. Email → seller        │
  │                          │  5. Email → client        │
  │                          ├─── {order_number} ───────►│
  │◄─── email notification ──┤                          │
```

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Email send fails | Log warning, do not block the accept/reject action |
| Inventory reservation fails | Already best-effort (existing behavior), order still created |
| Session expired | `410 Gone` from backend, friendly screen on frontend |
| Session already used | Backend returns current state, frontend shows confirmation screen |
| No seller email found | Skip seller notification, log warning |
| No client email in session | Skip client confirmation email |

---

## Testing

**Backend tests to add in `test_portal_contract.py`:**
- `test_accept_sends_seller_notification` — mock `send_email`, verify called with correct args
- `test_reject_sends_seller_notification` — same
- `test_accept_no_email_when_no_client_email` — session without client_email skips client email
- `test_expired_token_returns_410` — verify HTTP 410

**Frontend (manual verification):**
- Share dialog opens from QuoteDetail on draft quote
- Share dialog disabled on accepted quote
- Copy link copies to clipboard
- CustomerPortal renders branding, countdown, breakdown
- Accept flow → confirmation with order number
- Reject flow → confirmation screen
- Expired link → friendly error screen

---

## Acceptance Criteria

- [ ] "Compartir con cliente" button visible in QuoteDetail for draft/sent quotes
- [ ] Share dialog with name, email, days selector, copy/send actions
- [ ] Active session banner shows when link already exists
- [ ] CustomerPortal shows workspace branding, expiration countdown, line items, subtotal/tax/total
- [ ] "Aceptar y firmar" CTA triggers inline confirmation form
- [ ] Post-accept screen shows order number SO-XXXX
- [ ] Seller receives email on accept and reject
- [ ] Client receives confirmation email on accept
- [ ] Expired link shows friendly 410 screen
- [ ] Already-used link shows confirmation screen (idempotent)
- [ ] All backend tests pass
- [ ] TypeScript compiles without errors
