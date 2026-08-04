# Company Profile (Invoice Issuer) — Design Spec

**Date:** 2026-08-03
**Status:** Approved
**Sub-project:** A of 2 — prerequisite for `2026-08-03-invoice-export-preview-design.md`

---

## Goal

Give each workspace a configurable issuer identity (legal name, tax ID, address, logo) so that
printed and exported invoices carry real company data instead of the hardcoded literal `"CBOS"`,
and so that the customer block on an invoice is populated from existing CRM/identity records.

This spec covers **only** the issuer profile and customer resolution. Excel/PDF export and the
print preview are specified separately in sub-project B.

---

## Context: What Already Exists

### Backend
- `backend/app/modules/accounting/pdf.py` — `generate_invoice_pdf(invoice) -> bytes` using `fpdf2==2.8.2`.
  Renders a purple header bar with the literal string `"CBOS"` (line 98). No issuer data, no customer block.
- `backend/app/modules/accounting/router.py` — `GET /api/v1/accounting/invoices/{id}/pdf` already wired.
- `backend/app/modules/accounting/models.py` — `Invoice.contact_id -> persons.id`,
  `Invoice.organization_id -> organizations.id`. Both nullable. Neither is rendered anywhere today.

### Identity models available for customer resolution
| Model | Table | Usable fields |
|-------|-------|---------------|
| `Person` | `persons` | `full_name`, `email`, `phone` |
| `Organization` | `organizations` | `legal_name`, `brand_name`, `org_type`, `industry`, `country` |
| `Workspace` | `workspaces` | `name`, `slug` |

### Known gap — customer tax data does not exist
`Organization` has **no `tax_id` and no address columns**. The customer block on an invoice can
therefore render only: organization `legal_name` (or `brand_name`), `country`, and the contact's
`full_name` / `email` / `phone`.

Adding fiscal fields to `Organization` is **explicitly out of scope** for this spec — it belongs to
the identity module and affects CRM, portal and sales. It is recorded as a follow-up below.

### No file storage module exists
Backend modules are: `discovery`, `contracts`, `hr`, `portal`, `notifications`, `projects`,
`identity`, `analytics`, `workflows`, `inventory`, `accounting`, `sales`, `crm`. There is no
storage/uploads module and no static asset pipeline for user content.

---

## Decision: Logo Stored as a Base64 Data URI

The logo is stored in a `TEXT` column on `company_profiles` as a complete data URI
(`data:image/png;base64,...`).

**Rationale.** No storage subsystem exists. A disk volume would require mounting, nginx routes and a
backup story; S3/MinIO is disproportionate. A data URI needs zero new infrastructure: `fpdf2` embeds
it directly and the frontend renders it with `<img src>`. Migrating a single column to real object
storage later is trivial if a files module ever lands.

**Constraints enforced.**
- Accepted MIME types: `image/png`, `image/jpeg` only.
- Maximum decoded size: **200 KB**. Rejected with `400` and an actionable message above that.
- The column is validated on write, not on read — a malformed value must never break PDF generation.

---

## Data Model

New model in `backend/app/modules/accounting/models.py`:

```python
class CompanyProfile(Base):
    """Issuer identity for invoices — one per workspace."""
    __tablename__ = "company_profiles"

    workspace_id: Mapped[str] = mapped_column(
        String, ForeignKey("workspaces.id"), unique=True, index=True
    )

    legal_name:   Mapped[str | None] = mapped_column(String(255), nullable=True)
    tax_id:       Mapped[str | None] = mapped_column(String(50),  nullable=True)
    tax_id_label: Mapped[str]        = mapped_column(String(20),  default="RFC")

    address_line: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city:         Mapped[str | None] = mapped_column(String(100), nullable=True)
    state:        Mapped[str | None] = mapped_column(String(100), nullable=True)
    postal_code:  Mapped[str | None] = mapped_column(String(20),  nullable=True)
    country:      Mapped[str | None] = mapped_column(String(100), nullable=True)

    email:   Mapped[str | None] = mapped_column(String(320), nullable=True)
    phone:   Mapped[str | None] = mapped_column(String(50),  nullable=True)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)

    logo_data_uri: Mapped[str | None] = mapped_column(Text, nullable=True)

    default_currency:    Mapped[str]        = mapped_column(String(10), default="USD")
    default_tax_rate:    Mapped[float]      = mapped_column(Float, default=0.0)
    invoice_footer_note: Mapped[str | None] = mapped_column(Text, nullable=True)
```

`tax_id_label` is configurable text (RFC / NIT / CUIT / VAT) rather than a hardcoded `"RFC"`, because
the currency list already in the UI spans MXN, COP, BRL and EUR. Hardcoding a Mexican label onto a
multi-country product would be wrong on the printed document.

**Migration:** new Alembic revision in `backend/alembic/versions/`, down-revision chained onto the
current head. Creates `company_profiles` only. No changes to existing tables.

---

## API

Both endpoints are scoped by `get_current_workspace_id`, consistent with the rest of the module.

### `GET /api/v1/accounting/company-profile` → `CompanyProfileRead`

Returns the workspace's profile. **If no row exists, it is created on the fly with all-null fields
and returned.** The frontend never has to handle a 404 or distinguish "not configured" from "error".

### `PUT /api/v1/accounting/company-profile` → `CompanyProfileRead`

Upsert. Accepts the full `CompanyProfileUpdate` payload including `logo_data_uri`.

**Validation on `logo_data_uri`:**
1. Must match `data:image/(png|jpeg);base64,` prefix — otherwise `400`.
2. Base64 body must decode — otherwise `400`.
3. Decoded length ≤ 200 KB — otherwise `400` with the actual size in the message.
4. Explicit `null` clears the logo.

**Validation on `default_tax_rate`:** `0 <= rate <= 100`.

---

## Customer Resolution

New helper in `backend/app/modules/accounting/service.py`:

```python
async def resolve_invoice_party(db, workspace_id, invoice) -> InvoiceParty
```

Returns a plain dataclass consumed by the PDF/Excel generators, never serialized to the API:

| Field | Source |
|-------|--------|
| `name` | `Organization.brand_name or Organization.legal_name`, else `Person.full_name`, else `None` |
| `contact_name` | `Person.full_name` when both org and contact are set |
| `email` | `Person.email` |
| `phone` | `Person.phone` |
| `country` | `Organization.country` |

**Rules.**
- Both `contact_id` and `organization_id` null → returns an empty `InvoiceParty`; the customer block
  is omitted from the document entirely rather than printing empty labels.
- A referenced row that no longer exists is treated the same as null. A deleted contact must never
  raise on PDF generation.
- Both lookups are filtered by `workspace_id`. This is a cross-tenant leak vector if omitted.

---

## PDF Integration

`pdf.py` gains an optional issuer/customer render, keeping existing behaviour as the fallback:

- `generate_invoice_pdf(invoice, profile=None, party=None)` — both new args optional.
- `profile is None` **or** `profile.legal_name` empty → header renders the current literal `"CBOS"`.
  Existing behaviour is preserved exactly; nothing breaks for a workspace that never opens settings.
- Logo present → rendered at the left of the header bar, height-constrained to the 18mm bar with
  aspect ratio preserved, with the legal name beside it.
- Issuer block (tax ID, address, contact) renders under the header when populated. Empty fields are
  skipped, not printed as blank lines.
- Customer block renders opposite the dates grid when `party.name` is set.
- `invoice_footer_note` appends to the existing footer.

**A note on `fpdf2` and accents.** The current implementation uses built-in Helvetica, which is
latin-1 only — `pdf.py` already works around this with ASCII-safe substitutions (`"..."` not `"…"`).
User-entered company names and addresses will contain accented characters. All user-supplied strings
must therefore be passed through a latin-1 sanitiser before rendering, or a Unicode TTF font must be
registered. **Decision: register a Unicode TTF (DejaVuSans) via `pdf.add_font`.** Silently mangling
a company's legal name on its own invoice is not acceptable, and the sanitiser approach would have to
be applied at every call site forever.

**Implementation note:** `fpdf2` no longer bundles DejaVu fonts, so the TTF must be vendored into the
repo (e.g. `backend/app/modules/accounting/fonts/DejaVuSans.ttf` plus its bold variant) and included
in the Docker image. Registration happens once per `FPDF` instance via `add_font`, and the existing
`"Helvetica"` calls throughout `pdf.py` are switched to the registered family name. If the font file
is missing at runtime, generation falls back to Helvetica with latin-1 sanitisation rather than
raising — a missing asset must degrade the typography, never break invoice generation.

---

## Frontend

### Service — `composable-os/src/services/accounting.ts`

```ts
export interface CompanyProfile { /* mirrors CompanyProfileRead */ }

getCompanyProfile: () => api.get<CompanyProfile>("/accounting/company-profile"),
updateCompanyProfile: (dto: UpdateCompanyProfileDto) =>
  api.put<CompanyProfile>("/accounting/company-profile", dto),
```

### Page — `composable-os/src/pages/CompanyProfileSettings.tsx`

Follows the existing page conventions in `Invoicing.tsx`: shadcn `Card` / `Input` / `Button`,
`useQuery` + `useMutation`, `useToast` for feedback, `Skeleton` while loading.

Sections: **Identidad** (logo, legal name, tax ID + label), **Dirección**, **Contacto**,
**Valores por defecto de factura** (currency, tax rate, footer note).

**Logo uploader.** A file input that reads the file with `FileReader.readAsDataURL`, validates type
and size **client-side before upload** (so the user gets instant feedback rather than a round-trip
rejection), shows a preview of the current logo, and offers a "Quitar logo" action that sends
`logo_data_uri: null`.

Route registered alongside the other settings routes.

---

## Error Handling

| Condition | Behaviour |
|-----------|-----------|
| Profile row absent | `GET` creates and returns an empty one. No 404 path. |
| Logo wrong MIME | `400` with the accepted types listed. Blocked client-side first. |
| Logo over 200 KB | `400` naming the actual size. Blocked client-side first. |
| Profile empty when generating PDF | Falls back to `"CBOS"`. Not an error. |
| Contact/organization deleted | Customer block omitted. Not an error. |
| `default_tax_rate` out of 0–100 | `422` from Pydantic validation. |

---

## Testing

**Backend**
- `GET` on a workspace with no profile creates exactly one row; a second `GET` does not create another.
- `PUT` is a true upsert — creating then updating leaves one row.
- Logo validation: wrong MIME rejected, non-base64 rejected, 201 KB rejected, 199 KB accepted,
  explicit `null` clears the column.
- `resolve_invoice_party` returns empty for a null/null invoice, prefers `brand_name` over
  `legal_name`, and returns empty for an ID pointing at a deleted row rather than raising.
- **`resolve_invoice_party` does not resolve a contact belonging to another workspace.**
- `generate_invoice_pdf(invoice)` with no profile still produces valid PDF bytes containing `"CBOS"`
  — the regression guard for existing behaviour.
- A profile with an accented legal name (`"Compañía Ñandú S.A. de C.V."`) renders without raising
  and the text survives intact in the PDF.

**Frontend**
- The logo uploader rejects an oversized file without issuing a request.
- Loading and error states render.

---

## Out of Scope (recorded follow-ups)

1. **Fiscal fields on `Organization`** (`tax_id`, address). Needed for a fully compliant customer
   block. Belongs to the identity module and touches CRM, sales and portal — its own spec.
2. **Fiscal/legal compliance.** This produces a readable commercial document, not a CFDI, a stamped
   invoice, or anything with legal validity in any jurisdiction. No tax authority integration,
   no digital signature, no folio/serie control.
3. **Multiple issuer profiles per workspace** (e.g. several legal entities). One per workspace here.
4. Per-customer payment terms, bank details block, QR codes.

---

## Definition of Done

- [ ] `company_profiles` table created via Alembic migration; `alembic upgrade head` runs clean
- [ ] `GET` / `PUT` endpoints live, workspace-scoped, with logo validation
- [ ] `resolve_invoice_party` implemented and workspace-filtered
- [ ] `generate_invoice_pdf` renders issuer, logo and customer; still falls back to `"CBOS"`
- [ ] Unicode TTF registered — accented text renders correctly
- [ ] Settings page reachable, saves and clears the logo
- [ ] All tests above pass
