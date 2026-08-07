# Error Code Registry v1

Every `CBOSException` raised by a module must use a code registered here. CI
enforces it: `scripts/ci/check_error_registry.py` fails when a raised code is
missing from this table, in the same spirit as `EVENT_REGISTRY_V1.md` does for
event names.

Adopted by [ADR 0010](adr/0010-internationalization-strategy.md). The backend
sends a code plus a developer-facing English message; the frontend maps the code
to user-facing Spanish. A code the frontend does not know falls back to the
backend message, so an unregistered mapping degrades to English prose rather
than to a bare identifier.

---

## Rules

1. **Codes are a contract.** Renaming one breaks the frontend map, exactly as
   renaming an event breaks its consumers under ADR 0004. Add a new code and
   retire the old one instead.
2. **Codes are specific, not generic.** `CONFLICT` cannot be translated into a
   useful sentence; `PROJECT_DELETE_NOT_PLANNING` can. The generic subclasses in
   `core/exceptions.py` remain for cases with nothing specific to say.
3. **Interpolated values go in `detail`, not baked into the message.** The
   frontend needs the parts to build its own sentence. A message that reads
   `Cannot delete a project in 'active' status` must ship
   `detail={"status": "active"}`.
4. **`message` stays English and developer-facing.** It is the fallback and what
   shows up in logs; it is not the string the user is meant to read.
5. **Response headers survive the migration.** `CBOSException` takes `headers`
   and the handler propagates them. A `429` still has to send `Retry-After`: a
   translated body does not tell an automated client when to retry, and dropping
   the header while "only changing the error shape" is a silent regression.
6. **`detail` never carries a credential.** It is echoed to the client and lands
   in logs and error traces. `PORTAL_SESSION_NOT_FOUND` ships `id` when the
   lookup was by session id, and nothing at all when it was by token — the
   portal token *is* the access credential. Putting a lookup key in `detail`
   because "it helps debugging" is exactly how credentials leak.
7. **A code must not become an oracle.** Where the old free-text message
   deliberately conflated several causes, the code conflates them too.
   `IDENTITY_INVALID_CREDENTIALS` covers both "no such email" and "wrong
   password"; `AUTH_TOKEN_INVALID` covers missing, malformed, expired, and
   orphaned tokens. Splitting them would read as helpful precision and would
   hand an attacker a working enumeration signal.
8. **A code never reuses the name of an event constant.** `discovery` raises
   `DISCOVERY_SESSION_ALREADY_COMPLETED` rather than the obvious
   `DISCOVERY_SESSION_COMPLETED`, which is already an event in
   `backend/app/events/types.py`. Both identifiers land in the same logs, and
   two different things sharing a name get read as one.

### Scope of the check

`scripts/ci/check_error_registry.py` scans every `*.py` under
`backend/app/modules/` — not just `service.py`, because `workflows` raises from
its router — plus `backend/app/core/deps.py`, which is not a module but owns the
auth errors every protected route returns.

---

## Registry

| Code | HTTP | Module | Raised when | `detail` keys |
|---|---|---|---|---|
| `PROJECT_NOT_FOUND` | 404 | projects | The project does not exist in this workspace | `id` |
| `PROJECT_INVALID_TRANSITION` | 422 | projects | The requested status is not reachable from the current one | `from`, `to`, `allowed` |
| `PROJECT_DELETE_NOT_PLANNING` | 409 | projects | Deletion attempted on a project past planning | `status` |
| `PROJECT_TASK_NOT_FOUND` | 404 | projects | The task does not exist in this project | `id` |
| `PROJECT_TASK_ADD_BLOCKED` | 409 | projects | Tasks cannot be added in the project's current status | `status` |
| `PROJECT_TASK_MODIFY_BLOCKED` | 409 | projects | Tasks cannot be modified in the project's current status | `status` |
| `PROJECT_TASK_DELETE_BLOCKED` | 409 | projects | Tasks cannot be deleted in the project's current status | `status` |
| `PROJECT_TASK_INVALID_TRANSITION` | 422 | projects | The requested task status is not reachable from the current one | `from`, `to`, `allowed` |
| `SALES_QUOTE_NOT_FOUND` | 404 | sales | The quote does not exist in this workspace | `id` |
| `SALES_QUOTE_LINE_NOT_FOUND` | 404 | sales | The line does not exist in this quote | `id` |
| `SALES_QUOTE_EDIT_NOT_DRAFT` | 409 | sales | Edit attempted on a quote past draft | `status` |
| `SALES_QUOTE_LINES_NOT_DRAFT` | 409 | sales | Line add/update/remove/replace attempted on a quote past draft | `status` |
| `SALES_QUOTE_LINES_REQUIRED` | 422 | sales | The quote would be left with no lines, or is sent with none | — |
| `SALES_QUOTE_LINE_IDS_DUPLICATED` | 422 | sales | The replace-lines payload repeats a line id | `ids` |
| `SALES_QUOTE_SEND_INVALID_STATUS` | 409 | sales | Send attempted from a status that does not allow it | `status` |
| `SALES_QUOTE_ACCEPT_INVALID_STATUS` | 409 | sales | Accept attempted from a status that does not allow it | `status` |
| `SALES_QUOTE_REJECT_INVALID_STATUS` | 409 | sales | Reject attempted from a status that does not allow it | `status` |
| `SALES_ORDER_NOT_FOUND` | 404 | sales | The sales order does not exist in this workspace | `id` |
| `SALES_ORDER_INVALID_TRANSITION` | 422 | sales | The requested order status is not reachable from the current one | `from`, `to`, `allowed` |
| `CRM_LEAD_NOT_FOUND` | 404 | crm | The lead does not exist in this workspace | `id` |
| `CRM_LEAD_ALREADY_CONVERTED` | 409 | crm | Conversion attempted on an already-converted lead | `id` |
| `CRM_OPPORTUNITY_NOT_FOUND` | 404 | crm | The opportunity does not exist in this workspace | `id` |
| `CRM_OPPORTUNITY_INVALID_STAGE` | 422 | crm | The stage is not one of the valid stages | `stage`, `allowed` |
| `CRM_OPPORTUNITY_INVALID_TRANSITION` | 422 | crm | The requested stage is not reachable from the current one | `from`, `to`, `allowed` |
| `CRM_ACTIVITY_NOT_FOUND` | 404 | crm | The activity does not exist in this workspace | `id` |
| `CRM_PUBLIC_SITE_KEY_INVALID` | 401 | crm | Public intake called without a valid site key | — |
| `CRM_PUBLIC_SITE_INACTIVE` | 403 | crm | Public intake called against a deactivated site | `site_slug` |
| `CRM_PUBLIC_SITE_ORIGIN_NOT_ALLOWED` | 403 | crm | Request origin is not in the site's allowlist | `origin` |
| `CRM_PUBLIC_INTAKE_IDEMPOTENCY_CONFLICT` | 409 | crm | Idempotency key reused with a different payload | — |
| `CRM_PUBLIC_INTAKE_RATE_LIMITED` | 429 | crm | Public intake exceeded the per-minute limit (sends `Retry-After`) | `retry_after_seconds` |
| `PORTAL_SESSION_NOT_FOUND` | 404 | portal | The portal session does not exist | `id` — omitted on token lookup, see below |
| `PORTAL_LINK_EXPIRED` | 410 | portal | The portal link is past its expiry | `expires_at` |
| `PORTAL_QUOTE_NOT_FOUND` | 404 | portal | The quote behind the session or request does not exist | `id` |
| `PORTAL_QUOTE_NOT_SHAREABLE` | 409 | portal | Session creation attempted on a quote past draft/sent | `status` |
| `PORTAL_SESSION_NO_CLIENT_EMAIL` | 422 | portal | Link email requested for a session with no client email | `id` |
| `PORTAL_QUOTE_ACCEPT_INVALID_STATUS` | 409 | portal | Client accept attempted from a status that does not allow it | `status` |
| `PORTAL_QUOTE_REJECT_INVALID_STATUS` | 409 | portal | Client reject attempted from a status that does not allow it | `status` |
| `PORTAL_ORDER_NOT_FOUND` | 404 | portal | No order exists yet for the session's quote | — |
| `ACCOUNTING_INVOICE_NOT_FOUND` | 404 | accounting | The invoice does not exist in this workspace | `id` |
| `ACCOUNTING_INVOICE_UPDATE_BLOCKED` | 409 | accounting | Status change attempted on a paid or void invoice | `status` |
| `ACCOUNTING_INVOICE_DELETE_BLOCKED` | 409 | accounting | Deletion attempted outside draft/void/cancelled | `status` |
| `ACCOUNTING_PAYMENT_INVOICE_BLOCKED` | 409 | accounting | Payment recorded against a void or cancelled invoice | `status` |
| `ACCOUNTING_PAYMENT_EXCEEDS_DUE` | 400 | accounting | Payment amount is larger than the outstanding balance | `amount`, `amount_due` |
| `ACCOUNTING_LOGO_INVALID_FORMAT` | 400 | accounting | Logo is not a png/jpeg base64 data URI | `allowed_mime` |
| `ACCOUNTING_LOGO_INVALID_BASE64` | 400 | accounting | Logo payload does not decode as base64 | — |
| `ACCOUNTING_LOGO_TOO_LARGE` | 400 | accounting | Logo exceeds the size cap | `size_kb`, `max_kb` |
| `CONTRACT_NOT_FOUND` | 404 | contracts | The contract does not exist in this workspace | `id` |
| `CONTRACT_INVALID_TRANSITION` | 422 | contracts | The requested status is not reachable from the current one | `from`, `to`, `allowed` |
| `CONTRACT_DELETE_NOT_DRAFT` | 409 | contracts | Deletion attempted on a contract past draft | `status` |
| `CONTRACT_CLAUSES_LOCKED` | 409 | contracts | Clause add/update/delete attempted on an executed, expired, or terminated contract | `status` |
| `CONTRACT_CLAUSE_NOT_FOUND` | 404 | contracts | The clause does not exist in this contract | `id` |
| `IDENTITY_WORKSPACE_SLUG_TAKEN` | 409 | identity | Registration used a workspace slug that already exists | `slug` |
| `IDENTITY_EMAIL_TAKEN` | 409 | identity | Registration used an already-registered email | — |
| `IDENTITY_INVALID_CREDENTIALS` | 401 | identity | Login failed — unknown email **or** wrong password | — |
| `IDENTITY_ACCOUNT_DISABLED` | 403 | identity | Credentials were right but the account is inactive | — |
| `IDENTITY_REFRESH_TOKEN_INVALID` | 401 | identity | Refresh token is invalid or expired | — |
| `IDENTITY_USER_NOT_FOUND` | 404 | identity | The user does not exist in this workspace. 404 and not 403: a user from another workspace is indistinguishable from one that does not exist | `id` |
| `IDENTITY_CANNOT_DELETE_SELF` | 409 | identity | An admin tried to delete their own account | — |
| `IDENTITY_CANNOT_DELETE_OWNER` | 409 | identity | Deleting the workspace owner would leave the workspace without one | `email` |
| `IDENTITY_DELETE_CONFIRMATION_MISMATCH` | 422 | identity | `confirm_email` did not match the target user. No `detail`: whoever does not know who they are deleting should not learn it by guessing | — |
| `IDENTITY_USER_HAS_RECORDS` | 409 | identity | The user still owns records that block the delete. `constraint` is the Postgres foreign key that refused, which names the table to look at | `constraint` |
| `IDENTITY_PUBLIC_SITE_NOT_FOUND` | 404 | identity | The public site does not exist in this workspace | `id` |
| `IDENTITY_PUBLIC_SITE_SLUG_TAKEN` | 409 | identity | A public site with that slug already exists | `slug` |
| `AUTH_TOKEN_INVALID` | 401 | core (`deps.py`) | Bearer token missing, invalid, expired, or its user is gone/inactive (sends `WWW-Authenticate`) | — |
| `AUTH_ADMIN_REQUIRED` | 403 | core (`deps.py`) | Route requires admin or owner role | — |
| `INVENTORY_PRODUCT_NOT_FOUND` | 404 | inventory | The product does not exist in this workspace | `id` |
| `INVENTORY_SKU_TAKEN` | 409 | inventory | Another product in the workspace already uses that SKU | `sku` |
| `INVENTORY_PRODUCT_IS_SERVICE` | 422 | inventory | Stock operation attempted on a service product | `product_id` |
| `INVENTORY_INVALID_MOVEMENT_TYPE` | 422 | inventory | `movement_type` outside in/out/adjustment | `movement_type`, `allowed` |
| `INVENTORY_INSUFFICIENT_STOCK` | 422 | inventory | Movement or reservation exceeds available stock | `available`, `requested`, `unit` |
| `HR_EMPLOYEE_NOT_FOUND` | 404 | hr | The employee does not exist in this workspace | `id` |
| `HR_DEPARTMENT_NOT_FOUND` | 404 | hr | The department does not exist in this workspace | `id` |
| `HR_EMPLOYEE_INVALID_TRANSITION` | 422 | hr | The requested status is not reachable from the current one | `from`, `to`, `allowed` |
| `HR_EMPLOYEE_DELETE_TERMINATED` | 409 | hr | Deletion attempted on a terminated employee, kept for audit | `status` |
| `DISCOVERY_SESSION_NOT_FOUND` | 404 | discovery | The discovery session does not exist in this workspace | `id` |
| `DISCOVERY_SESSION_ALREADY_COMPLETED` | 409 | discovery | Message posted to a session that is already closed | `status` |
| `DISCOVERY_BLUEPRINT_MISSING` | 409 | discovery | Apply attempted before the blueprint was generated | — |
| `WORKFLOW_NOT_FOUND` | 404 | workflows | The workflow does not exist in this workspace | `id` |
| `WORKFLOW_DLQ_ENTRY_NOT_FOUND` | 404 | workflows | The dead-letter entry is already gone (raised from `router.py`) | `entry_id` |

---

## Migration complete

Every module raises registered codes, and so does `core/deps.py`. No
`HTTPException` with a free-text `detail` is left in `backend/app/modules/` or
in the auth dependencies.

The fallback in `translateApiError` — an unmapped code degrades to the backend's
English `message` — stays in place. It now has no real cases: it is the safety
net for a code added without a translation, which CI already refuses to merge.

### What the migration turned up

Notes worth keeping, because each one cost a debugging pass:

- **`crm` was undercounted.** The pending table counted `raise HTTPException`
  and missed two sites built once and raised later
  (`exc = HTTPException(...)` … `raise exc`). It had 13 error sites, not 11.
- **`workflows` raises from `router.py`, not `service.py`.** That is why
  `check_error_registry.py` scans `*/*.py` across the module rather than
  `service.py` alone.
- **Response headers are part of the contract.** Migrating `crm`'s 429 would
  have silently dropped `Retry-After` until `CBOSException` learned to carry
  `headers`.
- **`accounting` and `hr` wrote user-facing Spanish on the server.** Undoing
  that was the point of ADR 0010, not a side effect of it.
- **`portal` and `identity` errors carry security weight.** A lookup key can be
  a credential, and a code can become an enumeration oracle. See rules 6 and 7.
- **The frontend had two silent breakages**, both pre-existing and both only
  visible once codes existed: `CustomerPortal.tsx` parsed `body.detail`, which
  the envelope no longer has at the root, and `lib/api.ts` swallowed every 401
  before reading the body, so a failed login read "Unauthorized" and cleared the
  session.
