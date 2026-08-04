# Invoice Export (Excel / PDF) and Print Preview — Design Spec

**Date:** 2026-08-03
**Status:** Approved
**Sub-project:** B of 2 — depends on `2026-08-03-company-profile-design.md`

---

## Goal

Let users of the Facturación module:
1. Export the invoice list to Excel (two related sheets) and to a printable PDF report.
2. Export a single invoice to Excel and to PDF.
3. Preview an invoice exactly as it will print, and print it, without leaving the app.

---

## Context: What Already Exists

### Backend
- `generate_invoice_pdf(invoice)` in `backend/app/modules/accounting/pdf.py` — a complete,
  working single-invoice PDF (header bar, dates grid, line-item table, totals block, notes).
- `GET /api/v1/accounting/invoices/{id}/pdf` in `router.py:78` — already returns the PDF with
  `Content-Disposition: attachment`.
- `service.list_invoices(db, workspace_id, status, limit, offset)` — filters by `status` only.
- `fpdf2==2.8.2` is in `requirements.txt`. **`openpyxl` is not.**

### Frontend
- `composable-os/src/pages/Invoicing.tsx` — list, KPI cards, detail panel, new-invoice dialog,
  payment dialog. **No export or preview affordance anywhere.**
- `composable-os/src/services/accounting.ts` — **has no method for the existing PDF endpoint.**
- `composable-os/src/lib/api.ts` — JSON only. `request<T>` always calls `res.json()`.
  No frontend spreadsheet or PDF library is installed.

### The single most important constraint
Authentication is a `Bearer` token in an `Authorization` header. **A plain `<a href="..." download>`
will not work** — the browser issues that request without the header and gets a 401. Every download
must go through `fetch` with the header and be delivered as a blob.

---

## Decision: Generate Both Formats Server-Side

**Excel is generated in the backend with `openpyxl`, not in the frontend with SheetJS.**

The frontend only ever holds the current page of the list (`limit` defaults to 50, max 200). A
client-side export would silently export a subset of what the user believes they are exporting —
a data-integrity bug in an accounting context that nobody notices until figures fail to reconcile.
Server-side generation also keeps one styling implementation and adds nothing to the JS bundle.

**New dependency:** `openpyxl==3.1.5` in `backend/requirements.txt`.

---

## Backend: `backend/app/modules/accounting/excel.py` (new)

Two generators, both returning `bytes`.

**Shared signature convention.** Single-document generators take `party: InvoiceParty | None`;
list generators take `parties: dict[str, InvoiceParty]` keyed by `invoice.id`, resolved in one
batched pass by the service rather than per-invoice inside the generator. Resolving parties one at a
time inside a 5 000-row loop would issue two queries per invoice. `filters: ExportFilters` is the
dataclass carrying `status`, `date_from` and `date_to`, and it is what renders the human-readable
filter description on both the workbook and the PDF report.

### `generate_invoices_workbook(invoices, profile, parties, filters) -> bytes`

**Sheet `Facturas`** — one row per invoice:

| Column | Notes |
|--------|-------|
| Número | `invoice_number` |
| Estado | Spanish label, not the raw enum |
| Cliente | from `InvoiceParty.name`, empty when unresolved |
| Emisión / Vencimiento | real dates |
| Moneda | |
| Subtotal, Descuento, IVA %, IVA importe, Total, Pagado, Por cobrar | numeric |
| Notas | |

**Sheet `Líneas`** — one row per line, joined to the first sheet by `Número`:
`Número`, `Orden`, `Descripción`, `Cantidad`, `Precio unitario`, `Descuento %`, `Subtotal`.

**Formatting requirements — these are functional, not cosmetic:**
- Money and date columns must be written as **native numeric/date cell values with a number format
  applied** (`'#,##0.00'`, `'dd/mm/yyyy'`). Writing `"$1,234.50"` as a string makes the column
  unsummable and destroys the entire purpose of an accounting export. This is the primary regression
  risk in this spec and has a dedicated test.
- Header row bold on a filled background; `freeze_panes="A2"`; `auto_filter` over the used range;
  column widths derived from content.
- The `Facturas` sheet ends with a totals row summing Total / Pagado / Por cobrar.
- Sheet 1 row 1 carries the filter description and generation date, above the header row.

### `generate_invoice_workbook(invoice, profile, party) -> bytes`

Single sheet: issuer block, customer block, invoice metadata, the line-item table, then the totals
block. Same numeric-cell rule.

---

## Backend: `pdf.py` — list report

### `generate_invoices_report_pdf(invoices, profile, parties, filters) -> bytes`

A4 **landscape**. One row per invoice (number, status, customer, issue, due, total, paid,
outstanding), zebra striping consistent with the existing invoice table, and a totals row at the foot.

The header carries the **human-readable filter description** and the generation timestamp — e.g.
`Estado: Vencidas · 01/01/2026 – 03/08/2026 · Generado 03/08/2026 14:32`. Without it, a filtered
report printed on paper is indistinguishable from a complete one, which is how wrong numbers end up
in a meeting.

Pagination via the existing `set_auto_page_break`; the column header row repeats on each page.

### Targeted refactor

`pdf.py` currently interleaves layout with formatting helpers in one 270-line module. Adding an
issuer block (spec A) plus a second document type would duplicate the header across two generators.

Extract into shared helpers used by both generators:
- `_render_document_header(pdf, profile, title)` — logo, issuer identity, purple bar, document title
- `_render_footer_note(pdf, profile)`
- the existing `_fmt_currency` / `_fmt_date` / `_status_label` helpers stay as-is

Scope is limited to what these two documents share. No unrelated restructuring.

---

## Backend: Service and Endpoints

### `service.list_invoices` gains date filtering

Add `date_from: date | None` and `date_to: date | None`, applied against `issue_date` inclusively.
The regular list endpoint gains the same optional query params — a small change that both features use.

### `service.list_invoices_for_export(db, workspace_id, filters) -> list[Invoice]`

Applies the same filters but **ignores `limit`/`offset`** and eager-loads `lines` (`selectinload`)
to avoid an N+1 across potentially thousands of invoices.

**Hard cap: 5 000 invoices.** Above that it raises a `400` telling the user to narrow by date range.
It does **not** truncate. A silently truncated accounting export is materially worse than a failed
one, because the failure is invisible.

### Endpoints

All are `Depends(get_current_workspace_id)`-scoped. Exports are the easiest place to leak data
across tenants, so workspace scoping is asserted by test, not just by inspection.

| Route | Media type | Filename |
|-------|-----------|----------|
| `GET /accounting/invoices/export.xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | `facturas-YYYY-MM-DD.xlsx` |
| `GET /accounting/invoices/export.pdf` | `application/pdf` | `facturas-YYYY-MM-DD.pdf` |
| `GET /accounting/invoices/{id}/excel` | as above | `{invoice_number}.xlsx` |
| `GET /accounting/invoices/{id}/pdf` | `application/pdf` | `{invoice_number}.pdf` |

List endpoints accept `status`, `date_from`, `date_to`.

**`GET /accounting/invoices/{id}/pdf` gains `?disposition=inline`** (default remains `attachment`)
so the preview iframe renders it in place instead of triggering a download.

**Route ordering caution:** `export.xlsx` and `export.pdf` must be declared **before**
`/invoices/{invoice_id}` in `router.py`, or FastAPI matches `export.xlsx` as an invoice ID.

---

## Frontend: `lib/api.ts`

### `api.getBlob(path): Promise<Blob>`

Same `fetch` with `Authorization`, same 401 handling (clear token, redirect to `/login`).

**Error handling needs one specific behaviour:** when the request fails, the backend responds with
JSON even though a binary was requested. `getBlob` must read the body as text and attempt to parse
it to extract `error.message` / `detail`, exactly as `request<T>` does. Without this the user sees
`HTTP 400` instead of "Demasiadas facturas, acota el rango de fechas" — which is the one message
that tells them how to recover.

### `downloadBlob(blob, filename): void`

Creates the object URL, clicks a synthetic anchor, and **calls `URL.revokeObjectURL`**. Without the
revoke, every export leaks its blob for the lifetime of the tab.

---

## Frontend: `services/accounting.ts`

```ts
downloadInvoicePdf:    (id: string) => api.getBlob(`/accounting/invoices/${id}/pdf`),
downloadInvoiceExcel:  (id: string) => api.getBlob(`/accounting/invoices/${id}/excel`),
previewInvoicePdf:     (id: string) => api.getBlob(`/accounting/invoices/${id}/pdf?disposition=inline`),
exportInvoicesExcel:   (f: ExportFilters) => api.getBlob(`/accounting/invoices/export.xlsx?${qs(f)}`),
exportInvoicesPdf:     (f: ExportFilters) => api.getBlob(`/accounting/invoices/export.pdf?${qs(f)}`),
```

---

## Frontend: `components/invoicing/InvoicePreviewDialog.tsx` (new)

Wide modal (`max-w-4xl`, tall) that fetches the inline PDF, converts it to an object URL and renders
it in an `<iframe className="w-full h-[70vh]">`.

Actions: **Imprimir**, **Descargar PDF**, **Cerrar**.

- **Imprimir** calls `iframe.contentWindow.print()`. This works because a `blob:` URL is same-origin,
  so the frame is scriptable; it opens the native print dialog over the exact PDF that would be
  downloaded. This is what makes the preview genuinely WYSIWYG rather than an approximation.
- The object URL is revoked in the effect cleanup when the modal closes.
- **Query key is `["invoice-pdf", id, invoice.updated_at]`.** Including `updated_at` is deliberate:
  without it, recording a payment leaves react-query serving the stale cached PDF showing the old
  balance, and the user prints a document with wrong figures.
- Loading: `Skeleton` filling the iframe area. Failure: an inline error block **with a retry button
  inside the modal** — not a toast, which vanishes and leaves an empty frame with no way forward.

---

## Frontend: `components/invoicing/ExportDialog.tsx` (new)

Fields: format (Excel / PDF), the active status filter shown as read-only context, and an
**optional date range**.

The date range is the reason this is a dialog rather than a plain dropdown: it is where the user
recovers from the 5 000-row cap. Surfacing that error as a toast would leave nowhere to act on it.
On a `400`, the message renders inside the dialog next to the date inputs.

---

## Frontend: Integration in `Invoicing.tsx`

| Location | Added |
|----------|-------|
| Page header, beside *Nueva factura* | **Exportar** button → `ExportDialog`, pre-filled with the active `statusFilter` |
| Row `DropdownMenu` | *Vista previa*, *Descargar PDF*, *Descargar Excel* alongside the existing items |
| Detail panel action bar | *Vista previa* and *Descargar PDF* |

Every download action shows a pending state on its trigger while the blob is in flight — these
requests are slower than the JSON calls the page currently makes, and an unresponsive button invites
double-clicks and duplicate exports.

---

## Error Handling

| Condition | Behaviour |
|-----------|-----------|
| Export exceeds 5 000 invoices | `400`; message rendered inside `ExportDialog` beside the date inputs |
| Export matches 0 invoices | Valid empty workbook/report with headers and the filter description. Not an error. |
| Invoice has no lines | PDF and Excel render the header and totals; the line table is omitted |
| PDF fetch fails in preview | Inline error block with retry, inside the modal |
| Any export returns 401 | Existing `api.ts` path: clear token, redirect to `/login` |
| Backend error on a binary request | `getBlob` parses the JSON body to surface the real message |

---

## Testing

**Backend**
- `generate_invoices_workbook` produces exactly two sheets named `Facturas` and `Líneas`, with row
  counts matching the input.
- **Amount cells are numeric, not strings** — assert `isinstance(cell.value, (int, float))` on the
  Total column. This is the highest-value test in the spec.
- Date cells are real dates with a date number format.
- The 5 001st invoice triggers `400`; 5 000 succeeds.
- An empty result set still yields a valid, openable workbook.
- **An export from workspace A contains no invoice belonging to workspace B.**
- `export.xlsx` resolves to the export route, not to `get_invoice` with `invoice_id="export.xlsx"`
  — the route-ordering regression guard.
- `?disposition=inline` returns `Content-Disposition: inline`; the default returns `attachment`.
- The list report PDF renders with a filter description in the header.

**Frontend**
- `getBlob` surfaces the message from a JSON error body rather than `HTTP 400`.
- `downloadBlob` calls `revokeObjectURL`.
- The preview query key changes when `invoice.updated_at` changes.

---

## Out of Scope

1. Emailing an invoice PDF to the customer.
2. Scheduled or recurring exports.
3. CSV. Excel with typed cells supersedes it for this use case.
4. Bulk PDF download (a ZIP of individual invoices) — the list report covers the reporting need.
5. Editing invoice layout/templates from the UI.
6. Anything fiscal or legally binding — see spec A, Out of Scope.

---

## Definition of Done

- [ ] `openpyxl==3.1.5` added and installed
- [ ] `excel.py` produces both workbooks with typed numeric and date cells
- [ ] `generate_invoices_report_pdf` implemented; shared header helper extracted from `pdf.py`
- [ ] Four export endpoints live, workspace-scoped, declared before `/invoices/{invoice_id}`
- [ ] 5 000-row cap returns `400` and never truncates
- [ ] `date_from` / `date_to` supported by `list_invoices` and both export endpoints
- [ ] `api.getBlob` + `downloadBlob` implemented, with JSON error extraction and URL revocation
- [ ] `InvoicePreviewDialog` renders the PDF, prints it, and keys its cache on `updated_at`
- [ ] `ExportDialog` handles the cap error inline
- [ ] Export and preview reachable from header, row menu and detail panel
- [ ] All tests above pass
