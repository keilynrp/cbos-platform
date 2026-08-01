# Sales Sprint 3 — Contract Tests + Frontend Alignment

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all contract gaps in the Sales module — add missing `start-fulfillment` endpoint, backend tests covering full lifecycle + workspace isolation, fix frontend type mismatches, and deliver a focused real-data Sales page.

**Architecture:** Four phases executed sequentially. Phase 1 adds the missing backend endpoint `PATCH /orders/{id}/start-fulfillment` (TDD). Phase 2 adds `test_sales_contract.py` with 25+ tests. Phase 3 fixes `sales.ts` field name mismatches. Phase 4 rewrites `SalesBuilder.tsx` to a focused real-data Sales page (Quotes + Orders tabs only).

**Tech Stack:** pytest-asyncio, httpx, FastAPI, React 18, React Query v5, TypeScript, shadcn/ui

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/app/modules/sales/service.py` | MODIFY | Add `start_fulfillment()` service function |
| `backend/app/modules/sales/router.py` | MODIFY | Add `PATCH /orders/{id}/start-fulfillment` endpoint |
| `backend/tests/test_sales_contract.py` | CREATE | Auth guards, full lifecycle, PDF, workspace isolation |
| `composable-os/src/services/sales.ts` | MODIFY | Fix type mismatches + add `startFulfillment` method |
| `composable-os/src/pages/Sales.tsx` | CREATE | Real-data focused Sales page |

---

## Phase 1 — Fix Missing `start-fulfillment` Endpoint (TDD)

### Task 1: Add `start_fulfillment` (RED → GREEN → commit)

**Context:** The state machine is `draft → confirmed → in_fulfillment → fulfilled/cancelled`.
The `PATCH /orders/{id}/fulfill` endpoint calls `service.fulfill_order()` which targets `"fulfilled"`.
From `"confirmed"`, `_ORDER_TRANSITIONS["confirmed"] = {"in_fulfillment", "cancelled"}` — so calling
`/fulfill` from `confirmed` returns 422. There is no endpoint to trigger `confirmed → in_fulfillment`.
This is a backend gap that must be fixed before writing the traversal tests.

**Files:**
- Modify: `backend/app/modules/sales/service.py`
- Modify: `backend/app/modules/sales/router.py`

- [ ] **Step 1: Write the failing test (RED)**

Create `backend/tests/test_sales_contract.py` with just this test first:

```python
"""
Sales module — contract completeness tests (Sprint 3).
"""
import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

BASE = "/api/v1/sales"


async def _create_quote(
    client: AsyncClient, headers: dict, title: str = "Test Quote"
) -> dict:
    resp = await client.post(f"{BASE}/quotes", headers=headers, json={
        "title": title,
        "currency": "USD",
        "tax_rate": 0.0,
        "discount_amount": 0.0,
        "lines": [
            {
                "description": "Widget A",
                "quantity": 2,
                "unit_price": 100.0,
                "discount_percent": 0.0,
                "line_order": 1,
            }
        ],
    })
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_start_fulfillment_transitions_to_in_fulfillment(
    client: AsyncClient, auth_headers: dict
):
    """Confirmed order can move to in_fulfillment via start-fulfillment endpoint."""
    quote = await _create_quote(client, auth_headers, title="Start Fulfillment")
    order = (await client.patch(
        f"{BASE}/quotes/{quote['id']}/accept", headers=auth_headers
    )).json()
    order_id = order["id"]

    # draft → confirmed
    await client.patch(
        f"{BASE}/orders/{order_id}/confirm", headers=auth_headers, json={}
    )

    # confirmed → in_fulfillment
    resp = await client.patch(
        f"{BASE}/orders/{order_id}/start-fulfillment", headers=auth_headers
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "in_fulfillment"
```

- [ ] **Step 2: Verify test fails (RED)**

```bash
docker exec cbos-platform-backend-1 python -c "
import asyncio, asyncpg
async def main():
    conn = await asyncpg.connect(host='postgres', user='cbos', password='cbos_dev_pass', database='postgres')
    await conn.execute(\"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'cbos_test' AND pid <> pg_backend_pid()\")
    await conn.execute('DROP DATABASE IF EXISTS cbos_test')
    await conn.close()
asyncio.run(main())
" && docker exec cbos-platform-backend-1 sh -c "cd /app && python -m pytest tests/test_sales_contract.py::test_start_fulfillment_transitions_to_in_fulfillment -v --tb=short"
```
Expected: FAIL — `404 Not Found` because endpoint doesn't exist.

- [ ] **Step 3: Add `start_fulfillment` to service.py (GREEN)**

In `backend/app/modules/sales/service.py`, find the `fulfill_order` function and add `start_fulfillment` immediately before it:

```python
async def start_fulfillment(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str,
    order_id: str,
) -> SalesOrder:
    order = await _load_order_with_lines(db, workspace_id, order_id)
    _assert_order_transition(order.status, "in_fulfillment")
    order.status = "in_fulfillment"
    await db.commit()
    await db.refresh(order)
    await publish_event(
        db,
        event_type="SALES_ORDER_IN_FULFILLMENT",
        source_module="sales",
        workspace_id=workspace_id,
        actor_id=actor_id,
        entity_id=order.id,
        payload={"order_number": order.order_number, "status": "in_fulfillment"},
    )
    return order
```

- [ ] **Step 4: Add endpoint to router.py (GREEN)**

In `backend/app/modules/sales/router.py`, add after `confirm_order` and before `fulfill_order`:

```python
@router.patch("/orders/{order_id}/start-fulfillment", response_model=SalesOrderRead)
async def start_fulfillment(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.start_fulfillment(db, workspace_id, current_user.id, order_id)
```

- [ ] **Step 5: Run test to verify it passes (GREEN)**

```bash
docker exec cbos-platform-backend-1 sh -c "cd /app && python -m pytest tests/test_sales_contract.py::test_start_fulfillment_transitions_to_in_fulfillment -v --tb=short"
```
Expected: PASS.

- [ ] **Step 6: Run full suite to confirm nothing broken**

```bash
docker exec cbos-platform-backend-1 sh -c "cd /app && python -m pytest tests/ -q --tb=line"
```
Expected: 73+ passed, 0 failed.

- [ ] **Step 7: Commit**

```bash
cd "D:/cbos-platform" && git add backend/app/modules/sales/service.py backend/app/modules/sales/router.py backend/tests/test_sales_contract.py && git commit -m "$(cat <<'EOF'
feat(sales): add PATCH /orders/{id}/start-fulfillment endpoint

Closes the confirmed → in_fulfillment gap in the order state machine.
Full traversal is now: accept → confirm → start-fulfillment → fulfill.
Adds test_sales_contract.py scaffold with first test.
EOF
)"
```

---

## Phase 2 — Backend Contract Tests

### Task 2: Auth guards + quote lifecycle tests

**Files:**
- Modify: `backend/tests/test_sales_contract.py`

- [ ] **Step 1: Append auth guard and quote lifecycle tests to the file**

```python
# ── Auth guards ───────────────────────────────────────────────────────────────

async def test_quotes_list_requires_auth(client: AsyncClient):
    resp = await client.get(f"{BASE}/quotes")
    assert resp.status_code == 401


async def test_orders_list_requires_auth(client: AsyncClient):
    resp = await client.get(f"{BASE}/orders")
    assert resp.status_code == 401


async def test_create_quote_requires_auth(client: AsyncClient):
    resp = await client.post(f"{BASE}/quotes", json={"title": "Ghost"})
    assert resp.status_code == 401


# ── Quote get, update, lifecycle ─────────────────────────────────────────────

async def test_get_quote_by_id(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers, title="Find Me")
    resp = await client.get(f"{BASE}/quotes/{quote['id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == quote["id"]
    assert resp.json()["title"] == "Find Me"


async def test_get_quote_not_found_returns_404(client: AsyncClient, auth_headers: dict):
    resp = await client.get(
        f"{BASE}/quotes/00000000-0000-0000-0000-000000000000", headers=auth_headers
    )
    assert resp.status_code == 404


async def test_update_quote_patches_title(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers, title="Before")
    resp = await client.patch(
        f"{BASE}/quotes/{quote['id']}", headers=auth_headers, json={"title": "After"}
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "After"


async def test_quote_number_auto_generated(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers)
    assert quote["quote_number"].startswith("Q-")


async def test_send_quote_transitions_to_sent(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers)
    resp = await client.patch(
        f"{BASE}/quotes/{quote['id']}/send", headers=auth_headers
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "sent"
    assert resp.json()["sent_at"] is not None


async def test_reject_quote_transitions_to_rejected(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers)
    await client.patch(f"{BASE}/quotes/{quote['id']}/send", headers=auth_headers)
    resp = await client.patch(
        f"{BASE}/quotes/{quote['id']}/reject", headers=auth_headers,
        json={"reason": "Price too high"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "rejected"


async def test_list_quotes_filter_by_status(client: AsyncClient, auth_headers: dict):
    await _create_quote(client, auth_headers, title="Draft Quote")
    resp = await client.get(f"{BASE}/quotes?status=draft", headers=auth_headers)
    assert resp.status_code == 200
    assert all(q["status"] == "draft" for q in resp.json())
    assert len(resp.json()) >= 1
```

- [ ] **Step 2: Run tests**

```bash
docker exec cbos-platform-backend-1 sh -c "cd /app && python -m pytest tests/test_sales_contract.py -k 'auth or quote' -v --tb=short"
```
Expected: All PASS.

- [ ] **Step 3: Commit**

```bash
cd "D:/cbos-platform" && git add backend/tests/test_sales_contract.py && git commit -m "test(sales): auth guards and quote lifecycle contract tests"
```

---

### Task 3: Full order traversal + line management + PDF + workspace isolation

**Files:**
- Modify: `backend/tests/test_sales_contract.py`

- [ ] **Step 1: Append all remaining tests**

```python
# ── Full order traversal ──────────────────────────────────────────────────────

async def test_accept_quote_creates_order(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers, title="To Accept")
    resp = await client.patch(
        f"{BASE}/quotes/{quote['id']}/accept", headers=auth_headers
    )
    assert resp.status_code == 200
    order = resp.json()
    assert order["order_number"].startswith("SO-")
    assert order["status"] == "draft"


async def test_full_order_traversal_to_fulfilled(client: AsyncClient, auth_headers: dict):
    """draft → confirmed → in_fulfillment → fulfilled."""
    quote = await _create_quote(client, auth_headers, title="Fulfillment Journey")
    order_id = (await client.patch(
        f"{BASE}/quotes/{quote['id']}/accept", headers=auth_headers
    )).json()["id"]

    # draft → confirmed
    data = (await client.patch(
        f"{BASE}/orders/{order_id}/confirm", headers=auth_headers, json={}
    )).json()
    assert data["status"] == "confirmed"
    assert data["confirmed_at"] is not None

    # confirmed → in_fulfillment
    data = (await client.patch(
        f"{BASE}/orders/{order_id}/start-fulfillment", headers=auth_headers
    )).json()
    assert data["status"] == "in_fulfillment"

    # in_fulfillment → fulfilled
    data = (await client.patch(
        f"{BASE}/orders/{order_id}/fulfill", headers=auth_headers
    )).json()
    assert data["status"] == "fulfilled"
    assert data["fulfilled_at"] is not None


async def test_cancel_confirmed_order(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers, title="Cancel Journey")
    order_id = (await client.patch(
        f"{BASE}/quotes/{quote['id']}/accept", headers=auth_headers
    )).json()["id"]
    await client.patch(
        f"{BASE}/orders/{order_id}/confirm", headers=auth_headers, json={}
    )
    resp = await client.patch(
        f"{BASE}/orders/{order_id}/cancel", headers=auth_headers
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "cancelled"
    assert resp.json()["cancelled_at"] is not None


async def test_fulfilled_order_cannot_be_cancelled(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers, title="Cannot Cancel")
    order_id = (await client.patch(
        f"{BASE}/quotes/{quote['id']}/accept", headers=auth_headers
    )).json()["id"]
    await client.patch(f"{BASE}/orders/{order_id}/confirm", headers=auth_headers, json={})
    await client.patch(f"{BASE}/orders/{order_id}/start-fulfillment", headers=auth_headers)
    await client.patch(f"{BASE}/orders/{order_id}/fulfill", headers=auth_headers)
    # fulfilled is terminal
    resp = await client.patch(f"{BASE}/orders/{order_id}/cancel", headers=auth_headers)
    assert resp.status_code == 422


async def test_get_order_by_id(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers, title="Get Order")
    order = (await client.patch(
        f"{BASE}/quotes/{quote['id']}/accept", headers=auth_headers
    )).json()
    resp = await client.get(f"{BASE}/orders/{order['id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == order["id"]


# ── Quote line management ────────────────────────────────────────────────────

async def test_add_line_to_draft_quote_updates_total(
    client: AsyncClient, auth_headers: dict
):
    """POST /quotes/{id}/lines returns QuoteRead with updated lines and total."""
    quote = await _create_quote(client, auth_headers)
    original_total = quote["total"]

    resp = await client.post(
        f"{BASE}/quotes/{quote['id']}/lines", headers=auth_headers,
        json={
            "description": "New Widget",
            "quantity": 1,
            "unit_price": 50.0,
            "discount_percent": 0.0,
            "line_order": 2,
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    # Returns QuoteRead (the full updated quote, not the line)
    assert data["total"] > original_total
    assert any(l["description"] == "New Widget" for l in data["lines"])


async def test_remove_line_from_draft_quote(client: AsyncClient, auth_headers: dict):
    """DELETE /quotes/{id}/lines/{line_id} returns QuoteRead with line removed."""
    quote = await _create_quote(client, auth_headers)
    # Add a second line
    updated_quote = (await client.post(
        f"{BASE}/quotes/{quote['id']}/lines", headers=auth_headers,
        json={
            "description": "Extra", "quantity": 1, "unit_price": 10.0,
            "discount_percent": 0.0, "line_order": 2,
        },
    )).json()
    line_id = next(l["id"] for l in updated_quote["lines"] if l["description"] == "Extra")

    resp = await client.delete(
        f"{BASE}/quotes/{quote['id']}/lines/{line_id}", headers=auth_headers
    )
    assert resp.status_code == 200
    # Line should no longer appear in the response
    descriptions = [l["description"] for l in resp.json()["lines"]]
    assert "Extra" not in descriptions


# ── PDF download ─────────────────────────────────────────────────────────────

async def test_quote_pdf_returns_pdf_content(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers, title="PDF Quote")
    resp = await client.get(
        f"{BASE}/quotes/{quote['id']}/pdf", headers=auth_headers
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert len(resp.content) > 0


async def test_quote_pdf_requires_auth(client: AsyncClient):
    resp = await client.get(
        f"{BASE}/quotes/00000000-0000-0000-0000-000000000000/pdf"
    )
    assert resp.status_code == 401


# ── Workspace isolation ───────────────────────────────────────────────────────

async def _register_workspace(client: AsyncClient, slug: str, email: str) -> dict:
    resp = await client.post("/api/v1/auth/register", json={
        "full_name": "Isolated User",
        "email": email,
        "password": "securepassIso123",
        "workspace_name": f"Isolated Corp {slug}",
        "workspace_slug": slug,
    })
    assert resp.status_code == 201, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


async def test_quotes_not_visible_across_workspaces(
    client: AsyncClient, auth_headers: dict
):
    await _create_quote(client, auth_headers, title="Private Quote")
    headers_b = await _register_workspace(
        client, "iso-sales-b", "iso-sales-b@isolation.example.com"
    )
    resp = await client.get(f"{BASE}/quotes", headers=headers_b)
    assert resp.status_code == 200
    assert resp.json() == []


async def test_orders_not_visible_across_workspaces(
    client: AsyncClient, auth_headers: dict
):
    quote = await _create_quote(client, auth_headers, title="Private Order Quote")
    await client.patch(f"{BASE}/quotes/{quote['id']}/accept", headers=auth_headers)
    headers_b = await _register_workspace(
        client, "iso-orders-b", "iso-orders-b@isolation.example.com"
    )
    resp = await client.get(f"{BASE}/orders", headers=headers_b)
    assert resp.status_code == 200
    assert resp.json() == []
```

- [ ] **Step 2: Drop test DB and run full Phase 2 suite**

```bash
docker exec cbos-platform-backend-1 python -c "
import asyncio, asyncpg
async def main():
    conn = await asyncpg.connect(host='postgres', user='cbos', password='cbos_dev_pass', database='postgres')
    await conn.execute(\"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'cbos_test' AND pid <> pg_backend_pid()\")
    await conn.execute('DROP DATABASE IF EXISTS cbos_test')
    await conn.close()
asyncio.run(main())
" && docker exec cbos-platform-backend-1 sh -c "cd /app && python -m pytest tests/test_sales_contract.py -v --tb=short"
```
Expected: 25+ PASS.

- [ ] **Step 3: Run full suite**

```bash
docker exec cbos-platform-backend-1 sh -c "cd /app && python -m pytest tests/ -q --tb=line"
```
Expected: 98+ passed, 0 failed.

- [ ] **Step 4: Commit**

```bash
cd "D:/cbos-platform" && git add backend/tests/test_sales_contract.py && git commit -m "test(sales): complete contract test suite — auth, lifecycle, traversal, PDF, isolation"
```

---

## Phase 3 — Frontend Type Alignment

### Task 4: Rewrite sales.ts to match backend schemas

**Context:** `sales.ts` uses wrong field names: `items` instead of `lines`, `discount_pct` instead of
`discount_percent`, `tax_pct` instead of `tax_rate`. Frontend crashes or silently shows 0/empty
for financial fields. Also missing: `sendQuote`, `acceptQuote`, `rejectQuote`, `addLine`, `removeLine`,
`confirmOrder`, `fulfillOrder`, `startFulfillment`, `cancelOrder`.

Note: `api.delete` in `api.ts` is NOT generic — call it as `api.delete(path)` not `api.delete<void>(path)`.

**Files:**
- Modify: `composable-os/src/services/sales.ts`

- [ ] **Step 1: Read current sales.ts**

```bash
cat "D:/cbos-platform/composable-os/src/services/sales.ts"
```

- [ ] **Step 2: Replace entire content with corrected types and service**

```typescript
// composable-os/src/services/sales.ts
import { api } from "@/lib/api";

// ── Types (aligned with backend QuoteRead / SalesOrderRead) ──────────────────

export interface QuoteLine {
  id: string;
  quote_id: string;
  line_order: number;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  amount: number;
  product_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: string;
  workspace_id: string;
  quote_number: string;
  title: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  currency: string;
  subtotal: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  valid_until: string | null;
  notes: string | null;
  terms: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  lines: QuoteLine[];
  contact_id: string | null;
  organization_id: string | null;
  opportunity_id: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesOrderLine {
  id: string;
  order_id: string;
  line_order: number;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  amount: number;
  product_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesOrder {
  id: string;
  workspace_id: string;
  order_number: string;
  status: "draft" | "confirmed" | "in_fulfillment" | "fulfilled" | "cancelled";
  currency: string;
  total: number;
  notes: string | null;
  confirmed_at: string | null;
  fulfilled_at: string | null;
  cancelled_at: string | null;
  lines: SalesOrderLine[];
  quote_id: string | null;
  contact_id: string | null;
  organization_id: string | null;
  opportunity_id: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateQuoteLineDto {
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  line_order: number;
  product_id?: string;
}

export interface CreateQuoteDto {
  title: string;
  currency?: string;
  tax_rate?: number;
  discount_amount?: number;
  valid_until?: string;
  notes?: string;
  terms?: string;
  contact_id?: string;
  organization_id?: string;
  opportunity_id?: string;
  lines?: CreateQuoteLineDto[];
}

export interface UpdateQuoteDto {
  title?: string;
  currency?: string;
  tax_rate?: number;
  discount_amount?: number;
  valid_until?: string;
  notes?: string;
  terms?: string;
}

// ── Service ──────────────────────────────────────────────────────────────────

export const salesService = {
  // Quotes
  getQuotes: (params?: { status?: string; opportunity_id?: string }) => {
    const qs = params?.status ? `?status=${params.status}` : "";
    return api.get<Quote[]>(`/sales/quotes${qs}`);
  },
  getQuote: (id: string) => api.get<Quote>(`/sales/quotes/${id}`),
  createQuote: (dto: CreateQuoteDto) => api.post<Quote>("/sales/quotes", dto),
  updateQuote: (id: string, dto: UpdateQuoteDto) =>
    api.patch<Quote>(`/sales/quotes/${id}`, dto),
  sendQuote: (id: string) => api.patch<Quote>(`/sales/quotes/${id}/send`, {}),
  acceptQuote: (id: string) =>
    api.patch<SalesOrder>(`/sales/quotes/${id}/accept`, {}),
  rejectQuote: (id: string, reason?: string) =>
    api.patch<Quote>(`/sales/quotes/${id}/reject`, { reason }),
  addLine: (quoteId: string, dto: CreateQuoteLineDto) =>
    api.post<Quote>(`/sales/quotes/${quoteId}/lines`, dto),
  removeLine: (quoteId: string, lineId: string) =>
    api.delete(`/sales/quotes/${quoteId}/lines/${lineId}`),
  getQuotePdfUrl: (id: string) => `/api/v1/sales/quotes/${id}/pdf`,

  // Orders
  getOrders: (params?: { status?: string }) => {
    const qs = params?.status ? `?status=${params.status}` : "";
    return api.get<SalesOrder[]>(`/sales/orders${qs}`);
  },
  getOrder: (id: string) => api.get<SalesOrder>(`/sales/orders/${id}`),
  confirmOrder: (id: string) =>
    api.patch<SalesOrder>(`/sales/orders/${id}/confirm`, {}),
  startFulfillment: (id: string) =>
    api.patch<SalesOrder>(`/sales/orders/${id}/start-fulfillment`, {}),
  fulfillOrder: (id: string) =>
    api.patch<SalesOrder>(`/sales/orders/${id}/fulfill`, {}),
  cancelOrder: (id: string) =>
    api.patch<SalesOrder>(`/sales/orders/${id}/cancel`, {}),
};
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd "D:/cbos-platform/composable-os" && npx tsc --noEmit 2>&1 | head -30
```
Expected: No errors in `sales.ts`.

- [ ] **Step 4: Commit**

```bash
cd "D:/cbos-platform" && git add composable-os/src/services/sales.ts && git commit -m "fix(frontend): align sales.ts with backend schemas + add missing lifecycle methods"
```

---

## Phase 4 — Sales Page Rewrite

### Task 5: Create focused Sales.tsx

**Context:** `SalesBuilder.tsx` has 14 tabs and extensive mock data. Replace with a focused 3-tab
page: Dashboard (KPIs), Cotizaciones (full quote lifecycle), Órdenes (order lifecycle).
Follow the exact pattern from `CRM.tsx`: React Query + useMutation + toast + invalidateQueries.

**Files:**
- Create: `composable-os/src/pages/Sales.tsx`
- Read first: `composable-os/src/pages/CRM.tsx` (pattern reference)
- Read first: `composable-os/src/App.tsx` (find route to replace)

- [ ] **Step 1: Find the router entry for Sales**

```bash
grep -n "Sales\|sales\|SalesBuilder" "D:/cbos-platform/composable-os/src/App.tsx" | head -10
```

- [ ] **Step 2: Write Sales.tsx following CRM.tsx pattern**

Key requirements:
- `useQuery` for quotes and orders with `retry: 1` and `useEffect` error toasts
- `useMutation` for all state transitions
- `qc.invalidateQueries` on mutation success
- Status badge color mapping: draft=gray, sent=blue, accepted=green, rejected=red, cancelled=red, confirmed=blue, in_fulfillment=yellow, fulfilled=green
- **Dashboard tab**: 4 KPI cards (open quotes count, pipeline value, conversion rate, active orders)
- **Cotizaciones tab**: status filter chips + table (Quote# | Title | Status | Total | Actions)
  - Actions per status: draft → [Send, Download PDF], sent → [Accept, Reject, Download PDF], accepted/rejected → [Download PDF]
  - "Nueva Cotización" button opens a dialog (title + one line minimum)
- **Órdenes tab**: status filter chips + table (Order# | Quote# | Status | Total | Actions)
  - Actions per status: draft → [Confirm], confirmed → [Start Fulfillment, Cancel], in_fulfillment → [Fulfill, Cancel]

- [ ] **Step 3: Wire router — replace SalesBuilder with Sales**

```bash
# Find exact import line
grep -n "SalesBuilder\|from.*Sales" "D:/cbos-platform/composable-os/src/App.tsx"
```

Replace `import SalesBuilder from "./pages/SalesBuilder"` with `import Sales from "./pages/Sales"` and update the route JSX accordingly.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd "D:/cbos-platform/composable-os" && npx tsc --noEmit 2>&1 | grep -i error | head -20
```
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
cd "D:/cbos-platform" && git add composable-os/src/pages/Sales.tsx composable-os/src/App.tsx && git commit -m "feat(frontend/sales): real-data Sales page — Dashboard + Quotes + Orders with full lifecycle"
```

---

## Phase 5 — Final Verification + Push

### Task 6: Full suite + push

- [ ] **Step 1: Drop test DB and run full backend suite**

```bash
docker exec cbos-platform-backend-1 python -c "
import asyncio, asyncpg
async def main():
    conn = await asyncpg.connect(host='postgres', user='cbos', password='cbos_dev_pass', database='postgres')
    await conn.execute(\"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'cbos_test' AND pid <> pg_backend_pid()\")
    await conn.execute('DROP DATABASE IF EXISTS cbos_test')
    await conn.close()
asyncio.run(main())
" && docker exec cbos-platform-backend-1 sh -c "cd /app && python -m pytest tests/ -q --tb=line"
```
Expected: 98+ passed, 0 failed.

- [ ] **Step 2: TypeScript check**

```bash
cd "D:/cbos-platform/composable-os" && npx tsc --noEmit 2>&1 | grep -i error | head -20
```
Expected: 0 errors.

- [ ] **Step 3: Push**

```bash
cd "D:/cbos-platform" && git push origin master
```

---

## Acceptance Criteria

- [ ] `PATCH /orders/{id}/start-fulfillment` endpoint exists and returns 200 with `status: "in_fulfillment"`
- [ ] `tests/test_sales_contract.py` — 25+ tests, all passing
- [ ] Full suite `tests/` — 98+ tests, 0 failures
- [ ] `sales.ts` types match backend schemas exactly (lines, discount_percent, tax_rate)
- [ ] `Sales.tsx` renders real data from backend (no mock data)
- [ ] Full order traversal works in UI: create quote → send → accept → confirm → start-fulfillment → fulfill
- [ ] TypeScript compiles without errors
