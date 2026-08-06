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

---

## Pending migration

The remaining modules still raise `HTTPException` with free-text `detail`. They
are migrated module by module; until a module appears above, its errors reach
the user as whatever prose the backend wrote.

| Module | `raise HTTPException` remaining |
|---|---|
| crm | 11 |
| portal | 10 |
| accounting | 8 |
| contracts | 8 |
| identity | 7 |
| inventory | 7 |
| hr | 4 |
| discovery | 3 |
| workflows | 2 |

`projects` and `sales` are migrated; `projects` serves as the reference for the
rest.
