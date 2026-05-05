# Quote Line Editor — Design Spec

**Date:** 2026-05-04
**Status:** Approved

---

## Goal

Add a dedicated Quote Detail page (`/sales/quotes/:id`) where users can create and inline-edit line items for a cotización, view running totals, edit notes/terms, and see a change history log.

---

## Context: What Already Exists

### Backend (keep as-is)
- `GET /api/v1/sales/quotes/{id}` — returns `QuoteRead` with nested `lines: QuoteLineRead[]`
- `PATCH /api/v1/sales/quotes/{id}` — updates title, notes, terms, tax_rate, etc.
- `POST /api/v1/sales/quotes/{id}/lines` — adds a single line, returns `QuoteRead`
- `DELETE /api/v1/sales/quotes/{id}/lines/{line_id}` — removes a line, returns `QuoteRead`
- `PATCH /api/v1/sales/quotes/{id}/send|accept|reject` — state transitions
- `GET /api/v1/sales/quotes/{id}/pdf` — PDF export

### QuoteLine model (existing columns)
`line_order`, `description`, `quantity`, `unit_price`, `discount_percent`, `amount` (calculated), `product_id`

### QuoteLine schema gaps (new columns needed)
| Field | Type | Note |
|-------|------|------|
| `sku` | `str \| None` | Product code or reference |
| `unit` | `str \| None` | Unit of measure: hrs, pzas, kg, etc. |
| `tax_percent` | `float` default 0.0 | Per-line tax 0–100 |
| `notes` | `str \| None` | Free-text note per line |

---

## Amount Calculation (single authoritative definition)

### Per-line `amount` stored in DB
```
line_pretax = quantity × unit_price × (1 - discount_percent / 100)
amount      = line_pretax × (1 + tax_percent / 100)   ← tax-inclusive, this is what is stored
```

`amount` is the final line total including tax. It is the only calculated field stored per line.

### Quote totals — derived from raw line fields, NOT from `amount`
```
subtotal        = Σ (quantity_i × unit_price_i × (1 - discount_percent_i / 100))
tax_amount      = Σ (quantity_i × unit_price_i × (1 - discount_percent_i / 100) × tax_percent_i / 100)
discount_amount = quote-level discount (existing field, unchanged)
total           = subtotal - discount_amount + tax_amount
```

Quote totals are recomputed from raw line fields every time any line is written. The quote-level `tax_rate` field is **not removed** (it exists in the DB) but is no longer used for total calculation — it becomes a UI convenience for pre-filling `tax_percent` on new lines.

### Frontend display label
The "Subtotal" column in the lines table shows the tax-inclusive `amount` value for each line (i.e., what the customer pays for that line). The totals panel separately shows pre-tax subtotal, discount, tax, and grand total.

---

## New Backend Endpoints

### 1. `PATCH /sales/quotes/{id}/lines/{line_id}` → returns `QuoteRead`
Update a single line. Body: `QuoteLineUpdate` (any subset of: sku, description, unit, quantity, unit_price, discount_percent, tax_percent, notes, line_order).

**Guard:** Returns `409 Conflict` if `quote.status != "draft"`.

After saving, recalculates and persists `amount` on the line and recalculates all quote totals (`subtotal`, `tax_amount`, `total`) in the same transaction.

Returns the full `QuoteRead` (same pattern as existing line endpoints). Frontend invalidates `['quote', id]` cache key.

Logs a `line_updated` event to `quote_events`.

### 2. `PUT /sales/quotes/{id}/lines` → returns `QuoteRead`
Batch replace — used for reordering. Body: `list[QuoteLineUpsert]`.

`QuoteLineUpsert` is a new schema with an optional `id: str | None` field. Lines with a known `id` are updated in place; lines without an `id` are inserted; existing lines whose `id` is absent from the payload are deleted.

**Guard:** Returns `409 Conflict` if `quote.status != "draft"`.

Recalculates all quote totals in the same transaction. Returns `QuoteRead`. Logs a single `updated` event.

### 3. `GET /sales/quotes/{id}/history` → returns `list[QuoteEventRead]`
Returns change events for this quote ordered newest-first. No guard — readable in any state.

---

## New Backend: Quote History

### Table: `quote_events`
| Column | Type | Note |
|--------|------|------|
| `id` | str (ULID) | PK |
| `workspace_id` | str FK | |
| `quote_id` | str FK | CASCADE delete |
| `user_id` | str FK nullable | Who made the change |
| `event_type` | str | See values below |
| `description` | str | Human-readable: "Línea 2 modificada — cantidad: 1 → 3" |
| `metadata` | JSON nullable | Structured diff payload for future use (e.g. `{"field": "quantity", "from": 1, "to": 3}`) |
| `created_at` | datetime | |

### Event types
`created` · `updated` · `line_added` · `line_updated` · `line_removed` · `sent` · `accepted` · `rejected`

### When to log events
- Quote created → `created`
- `PATCH /quotes/{id}` → `updated`
- `POST /quotes/{id}/lines` → `line_added`
- `PATCH /quotes/{id}/lines/{line_id}` → `line_updated`
- `DELETE /quotes/{id}/lines/{line_id}` → `line_removed`
- `PATCH /quotes/{id}/send` → `sent`
- `PATCH /quotes/{id}/accept` → `accepted`
- `PATCH /quotes/{id}/reject` → `rejected`

**Note:** The existing `DELETE /lines/{line_id}` endpoint must also gain the `quote.status == "draft"` guard (same 409 pattern). Add the guard to the existing service function for `remove_line`.

---

## Frontend: New Files

### Shared component: `composable-os/src/components/sales/QuoteStatusBadge.tsx`
Extract `QuoteStatusBadge` from `Sales.tsx` into this shared file and export it. Both `Sales.tsx` and the new `QuoteDetail.tsx` import from here.

### `composable-os/src/pages/QuoteDetail.tsx`
Full-page component. Route: `/sales/quotes/:id`.

**Sections (top to bottom):**

1. **Header bar**
   - Back button `← Cotizaciones` (navigates to `/sales`)
   - Quote number + title (title editable inline on blur via `PATCH /quotes/{id}`)
   - `<QuoteStatusBadge>` from shared component
   - Action buttons — visible depending on status:
     - `draft`: [Enviar] [PDF] [Eliminar]
     - `sent`: [Aceptar] [Rechazar] [PDF]
     - `accepted` / `rejected` / `expired`: [PDF] (read-only)

2. **Lines table** (draft only — static `<td>` cells in other states)
   - Inline editable — each cell is an `<input>` that saves on `onBlur` via `PATCH /lines/{id}`
   - Columns: `#` | SKU | Descripción | Unidad | Cantidad | P. Unit | Desc% | IVA% | Total línea | Notas | ✕
   - "Total línea" shows the tax-inclusive `amount` — calculated client-side on each keystroke, persisted on blur
   - `[+ Agregar línea]` button below table — calls `POST /lines`, adds new blank row
   - Drag handle for reorder (saves via `PUT /lines` on drop)
   - In non-draft status: no inputs, no [+ Agregar línea], no ✕ buttons

3. **Totals panel** (right-aligned, always visible)
   - Subtotal (pre-tax sum), Descuentos (quote-level), Impuestos, **TOTAL**
   - Recalculated live in client state as user types; persisted values come from `QuoteRead` after each mutation

4. **Notas y Términos**
   - Two `<textarea>` fields: Notas generales, Términos y condiciones
   - Save on blur via `PATCH /quotes/{id}`
   - Disabled in non-draft status

5. **Historial**
   - `useQuery` → `GET /quotes/{id}/history`
   - List of events: `created_at` · user display name or email · `description`

### `composable-os/src/services/sales.ts` (extend existing)
Add new types:
- `QuoteLineUpdate` — partial fields for PATCH (sku, description, unit, quantity, unit_price, discount_percent, tax_percent, notes, line_order)
- `QuoteLineUpsert` — all `QuoteLineCreate` fields plus optional `id?: string`
- `QuoteEvent` — `{ id, event_type, description, user_id, created_at, metadata?: Record<string, unknown> | null }`

Add new service methods (the frontend `salesService` object does NOT yet have these):
- `salesService.getQuote(quoteId)` → `GET /quotes/{id}` (add — currently called from the existing list but no dedicated getter)
- `salesService.updateQuote(quoteId, data)` → `PATCH /quotes/{id}` (add — not yet in frontend service)
- `salesService.updateLine(quoteId, lineId, data)` → `PATCH /lines/{id}`
- `salesService.replaceLines(quoteId, lines)` → `PUT /lines`
- `salesService.getQuoteHistory(quoteId)` → `GET /history`

### `composable-os/src/App.tsx` (or router file — find where routes are declared)
Add route: `<Route path="/sales/quotes/:id" element={<QuoteDetail />} />`

### `composable-os/src/pages/Sales.tsx` (minor change)
- Import `QuoteStatusBadge` from the new shared component instead of defining it inline
- Make each quote row clickable: `onClick={() => navigate(\`/sales/quotes/${quote.id}\`)}`; add `cursor-pointer` class

---

## `expired` Status

The `expired` status already exists in the DB model (comment in `models.py`). How a quote reaches this state is **out of scope for this feature** — it may be set by a background job based on `valid_until`. The detail page simply renders it as read-only with a [PDF] button. No `expire` endpoint is introduced here.

---

## Error Handling

- Any `PATCH /lines/{id}` failure shows `toast.error(...)` and reverts the input to its previous value.
- If `GET /quotes/{id}` returns 404, show "Cotización no encontrada" with a back button.
- State transition failures (send/accept/reject) show `toast.error` with the API error message.
- `409 Conflict` from line mutation endpoints (non-draft quote): show `toast.error("Esta cotización ya no se puede editar.")`.

---

## Not In Scope (defer)

- Bulk import of lines from CSV/Excel
- Product catalog picker (autocomplete from inventory)
- Email sending on "Enviar"
- Quote templates
- Multi-currency conversion
- Undo/redo for line edits
- `expired` status transition endpoint or cron job

---

## Files to Create / Modify

| File | Action |
|------|--------|
| `backend/alembic/versions/<hash>_quote_line_and_events.py` | Create — (1) add sku, unit, tax_percent, notes to quote_lines; (2) create quote_events table |
| `backend/app/modules/sales/models.py` | Modify — add 4 columns to QuoteLine; add QuoteEvent model |
| `backend/app/modules/sales/schemas.py` | Modify — QuoteLineCreate/Read get new fields; add QuoteLineUpdate, QuoteLineUpsert, QuoteEventRead |
| `backend/app/modules/sales/service.py` | Modify — update_line(), replace_lines(), get_history(), recalc logic, draft guard on remove_line(), event logging |
| `backend/app/modules/sales/router.py` | Modify — PATCH /lines/{id}, PUT /lines, GET /history; add 409 guard to existing DELETE /lines/{line_id} |
| `backend/tests/test_sales_quote_lines.py` | Create — tests for new endpoints and guards |
| `composable-os/src/components/sales/QuoteStatusBadge.tsx` | Create — extract from Sales.tsx |
| `composable-os/src/pages/QuoteDetail.tsx` | Create — full detail page |
| `composable-os/src/services/sales.ts` | Modify — new types and service methods |
| `composable-os/src/App.tsx` | Modify — add /sales/quotes/:id route |
| `composable-os/src/pages/Sales.tsx` | Modify — import shared badge, rows clickable |
