# Sprint 4 — Inventory Contract Tests + Wedge Smoke + Workflow Action

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the Inventory module with contract tests (auth guards, lifecycle, reserve/release, workspace isolation), add a full wedge end-to-end smoke test, and implement the `create_activity` workflow action so `SalesOrderFulfilled` triggers a real CRM activity.

**Architecture:** Three phases. Phase 1 adds `test_inventory_contract.py` in three tasks (auth guards + workspace isolation, product/stock lifecycle, reserve/release semantics) — mirrors the same pattern used in Sprints 2 and 3. Phase 2 adds `test_wedge_smoke.py`: one test that traverses the full MVP wedge path (lead → opp → quote → order → fulfill) asserting each state transition. Phase 3 implements the `create_activity` executor action by threading `db` from `dispatch_event` → `run_workflow` → `execute_action`, then tests a workflow that fires on `SalesOrderFulfilled` and creates a real CRM activity in the DB.

**Tech Stack:** pytest-asyncio, httpx, FastAPI, SQLAlchemy async, existing conftest fixtures (`client`, `auth_headers`, `db`)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/tests/test_inventory_contract.py` | CREATE | All inventory contract tests (tasks 1–3) |
| `backend/tests/test_wedge_smoke.py` | CREATE | End-to-end wedge traversal (task 4) |
| `backend/app/modules/workflows/executor.py` | MODIFY | Add `db` param; implement `create_activity` action |
| `backend/app/modules/workflows/service.py` | MODIFY | Pass `db` to `run_workflow` in `dispatch_event` |

---

## Phase 1 — Inventory Contract Tests

### Task 1: Auth Guards + Workspace Isolation

**Files:**
- Create: `backend/tests/test_inventory_contract.py`

**Context:**
- All inventory routes are under `/api/v1/inventory`
- Auth guard: any request without `Authorization: Bearer <token>` → 401
- Workspace isolation: a product created in workspace A must NOT be visible in workspace B (use `secondary_auth_headers` fixture from conftest if available, or create a second workspace manually)
- Routes to test: `GET /inventory/products`, `POST /inventory/products`, `GET /inventory/stock`, `POST /inventory/movements`, `POST /inventory/reserve`, `POST /inventory/release`, `POST /inventory/orders/reserve`

**Conftest context:** `auth_headers` fixture provides a valid bearer token. A second isolated user/workspace is available via `secondary_auth_headers` if the conftest defines it — if not, register a second user and workspace directly using `POST /api/v1/auth/register`.

- [ ] **Step 1: Write the auth guard tests (RED)**

Create `backend/tests/test_inventory_contract.py`:

```python
"""
Inventory module contract tests.
Covers: auth guards, product lifecycle, stock movements,
reserve/release semantics, workspace isolation.
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

BASE = "/api/v1/inventory"
AUTH_BASE = "/api/v1/auth"


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _create_product(client: AsyncClient, headers: dict, sku: str = "SKU-001") -> dict:
    resp = await client.post(f"{BASE}/products", headers=headers, json={
        "sku": sku,
        "name": f"Product {sku}",
        "unit": "unit",
        "min_stock": 5.0,
    })
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _add_stock(client: AsyncClient, headers: dict, product_id: str, qty: float) -> dict:
    resp = await client.post(f"{BASE}/movements", headers=headers, json={
        "product_id": product_id,
        "movement_type": "in",
        "quantity": qty,
        "location": "main",
    })
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _get_second_auth_headers(client: AsyncClient) -> dict:
    """Register a second isolated user/workspace and return auth headers."""
    resp = await client.post(f"{AUTH_BASE}/register", json={
        "email": "workspace2_inv@test.com",
        "password": "Password123!",
        "first_name": "WS2",
        "last_name": "Inv",
        "workspace_name": "Workspace Two Inv",
    })
    assert resp.status_code in (200, 201), resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ── Auth guards ───────────────────────────────────────────────────────────────

async def test_products_list_requires_auth(client: AsyncClient):
    resp = await client.get(f"{BASE}/products")
    assert resp.status_code == 401


async def test_products_create_requires_auth(client: AsyncClient):
    resp = await client.post(f"{BASE}/products", json={"sku": "X", "name": "X"})
    assert resp.status_code == 401


async def test_stock_levels_requires_auth(client: AsyncClient):
    resp = await client.get(f"{BASE}/stock")
    assert resp.status_code == 401


async def test_movements_requires_auth(client: AsyncClient):
    resp = await client.post(f"{BASE}/movements", json={})
    assert resp.status_code == 401


async def test_reserve_requires_auth(client: AsyncClient):
    resp = await client.post(f"{BASE}/reserve", json={})
    assert resp.status_code == 401


async def test_release_requires_auth(client: AsyncClient):
    resp = await client.post(f"{BASE}/release", json={})
    assert resp.status_code == 401


async def test_orders_reserve_requires_auth(client: AsyncClient):
    resp = await client.post(f"{BASE}/orders/reserve", json={})
    assert resp.status_code == 401


# ── Workspace isolation ───────────────────────────────────────────────────────

async def test_product_not_visible_across_workspaces(client: AsyncClient, auth_headers: dict):
    ws2_headers = await _get_second_auth_headers(client)

    # Create product in workspace 1
    product = await _create_product(client, auth_headers, sku="ISO-001")

    # Workspace 2 cannot see it
    resp = await client.get(f"{BASE}/products", headers=ws2_headers)
    assert resp.status_code == 200
    ids = [p["id"] for p in resp.json()]
    assert product["id"] not in ids
```

- [ ] **Step 2: Run tests to verify they FAIL (RED)**

Run:
```bash
docker compose exec backend pytest tests/test_inventory_contract.py -v --tb=short 2>&1 | tail -20
```
Expected: 8 FAILED — routes and conftest not yet imported, or routes return 200 without auth.
> Note: if they pass immediately it means auth middleware is already active — that is acceptable. Move to step 4.

- [ ] **Step 3: Verify tests pass (GREEN)**

Run:
```bash
docker compose exec backend pytest tests/test_inventory_contract.py -v --tb=short 2>&1 | tail -20
```
Expected: 8 passed.

- [ ] **Step 4: Commit**

```bash
git -C /d/cbos-platform add backend/tests/test_inventory_contract.py
git -C /d/cbos-platform commit -m "test(inventory): auth guards and workspace isolation contract tests"
```

---

### Task 2: Product Lifecycle + Stock Levels + Movements

**Files:**
- Modify: `backend/tests/test_inventory_contract.py` (append)

**Context:**
- `POST /inventory/products` → 201 with ProductRead schema
- `GET /inventory/products/{id}` → 200 with ProductRead
- `PATCH /inventory/products/{id}` → 200 with updated fields
- `GET /inventory/stock` → list[StockLevel] — each has `product_id`, `total_current`, `total_available`, `total_reserved`, `is_low_stock`
- `POST /inventory/movements` with `movement_type: "in"` → 201 with `stock_after > stock_before`
- `POST /inventory/movements` with `movement_type: "out"` → 201 (requires stock > 0)
- `GET /inventory/stock?low_stock_only=true` → only products below `min_stock`
- SKU duplicate on same workspace → 409

- [ ] **Step 1: Append product lifecycle + stock tests**

Append to `backend/tests/test_inventory_contract.py`:

```python
# ── Product lifecycle ─────────────────────────────────────────────────────────

async def test_create_product_returns_201(client: AsyncClient, auth_headers: dict):
    product = await _create_product(client, auth_headers, sku="PROD-CREATE-01")
    assert product["sku"] == "PROD-CREATE-01"
    assert product["name"] == "Product PROD-CREATE-01"
    assert "id" in product
    assert "workspace_id" in product


async def test_get_product_by_id(client: AsyncClient, auth_headers: dict):
    product = await _create_product(client, auth_headers, sku="PROD-GET-01")
    resp = await client.get(f"{BASE}/products/{product['id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == product["id"]


async def test_get_product_not_found_returns_404(client: AsyncClient, auth_headers: dict):
    resp = await client.get(f"{BASE}/products/nonexistent-id", headers=auth_headers)
    assert resp.status_code == 404


async def test_update_product_patches_name(client: AsyncClient, auth_headers: dict):
    product = await _create_product(client, auth_headers, sku="PROD-UPD-01")
    resp = await client.patch(
        f"{BASE}/products/{product['id']}",
        headers=auth_headers,
        json={"name": "Updated Name"},
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated Name"
    assert resp.json()["sku"] == "PROD-UPD-01"  # unchanged


async def test_duplicate_sku_returns_409(client: AsyncClient, auth_headers: dict):
    await _create_product(client, auth_headers, sku="DUP-SKU-01")
    resp = await client.post(f"{BASE}/products", headers=auth_headers, json={
        "sku": "DUP-SKU-01",
        "name": "Duplicate",
        "unit": "unit",
    })
    assert resp.status_code == 409


async def test_list_products_returns_created(client: AsyncClient, auth_headers: dict):
    await _create_product(client, auth_headers, sku="LIST-PROD-01")
    resp = await client.get(f"{BASE}/products", headers=auth_headers)
    assert resp.status_code == 200
    skus = [p["sku"] for p in resp.json()]
    assert "LIST-PROD-01" in skus


# ── Stock movements ───────────────────────────────────────────────────────────

async def test_movement_in_increments_stock(client: AsyncClient, auth_headers: dict):
    product = await _create_product(client, auth_headers, sku="MOV-IN-01")
    movement = await _add_stock(client, auth_headers, product["id"], 50.0)
    assert movement["movement_type"] == "in"
    assert movement["stock_after"] == movement["stock_before"] + 50.0


async def test_movement_out_decrements_stock(client: AsyncClient, auth_headers: dict):
    product = await _create_product(client, auth_headers, sku="MOV-OUT-01")
    await _add_stock(client, auth_headers, product["id"], 100.0)

    resp = await client.post(f"{BASE}/movements", headers=auth_headers, json={
        "product_id": product["id"],
        "movement_type": "out",
        "quantity": 30.0,
        "location": "main",
    })
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["stock_after"] == data["stock_before"] - 30.0


async def test_get_stock_levels_reflects_movements(client: AsyncClient, auth_headers: dict):
    product = await _create_product(client, auth_headers, sku="STOCK-LVL-01")
    await _add_stock(client, auth_headers, product["id"], 75.0)

    resp = await client.get(f"{BASE}/stock", headers=auth_headers)
    assert resp.status_code == 200
    stock_map = {s["product_id"]: s for s in resp.json()}
    assert product["id"] in stock_map
    assert stock_map[product["id"]]["total_current"] >= 75.0


async def test_low_stock_only_filter(client: AsyncClient, auth_headers: dict):
    # Create product with min_stock=20, add only 5 units → is_low_stock = True
    resp = await client.post(f"{BASE}/products", headers=auth_headers, json={
        "sku": "LOW-STOCK-01",
        "name": "Low Stock Product",
        "unit": "unit",
        "min_stock": 20.0,
    })
    assert resp.status_code == 201, resp.text
    product = resp.json()
    await _add_stock(client, auth_headers, product["id"], 5.0)

    resp = await client.get(f"{BASE}/stock?low_stock_only=true", headers=auth_headers)
    assert resp.status_code == 200
    product_ids = [s["product_id"] for s in resp.json()]
    assert product["id"] in product_ids
    # Verify is_low_stock flag
    entry = next(s for s in resp.json() if s["product_id"] == product["id"])
    assert entry["is_low_stock"] is True


async def test_movements_filter_by_product_id(client: AsyncClient, auth_headers: dict):
    product = await _create_product(client, auth_headers, sku="MOV-FILTER-01")
    await _add_stock(client, auth_headers, product["id"], 10.0)

    resp = await client.get(
        f"{BASE}/movements?product_id={product['id']}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    movements = resp.json()
    assert len(movements) >= 1
    assert all(m["product_id"] == product["id"] for m in movements)
```

- [ ] **Step 2: Run tests to verify they pass (GREEN)**

```bash
docker compose exec backend pytest tests/test_inventory_contract.py -k "product or stock or movement or duplicate or low_stock" -v --tb=short 2>&1 | tail -25
```
Expected: 11 passed.

- [ ] **Step 3: Commit**

```bash
git -C /d/cbos-platform add backend/tests/test_inventory_contract.py
git -C /d/cbos-platform commit -m "test(inventory): product lifecycle, stock movements, low_stock filter"
```

---

### Task 3: Reserve / Release / Auto-Reserve

**Files:**
- Modify: `backend/tests/test_inventory_contract.py` (append)

**Context:**
- `POST /inventory/reserve` → 201; decreases `available_stock`, increases `reserved_stock`; insufficient stock → 422
- `POST /inventory/release` → 201; restores `available_stock`
- `POST /inventory/orders/reserve` (multi-line) → 200 with `{order_id, reserved: [...], failed: [...], partial: bool}`
- Over-reserve (reserve more than available) → **422** (not 409)
- Release reference: pass `reference_id` to link to an order

- [ ] **Step 1: Append reserve/release tests**

Append to `backend/tests/test_inventory_contract.py`:

```python
# ── Reserve / Release ─────────────────────────────────────────────────────────

async def test_reserve_reduces_available_stock(client: AsyncClient, auth_headers: dict):
    product = await _create_product(client, auth_headers, sku="RES-AVAIL-01")
    await _add_stock(client, auth_headers, product["id"], 100.0)

    resp = await client.post(f"{BASE}/reserve", headers=auth_headers, json={
        "product_id": product["id"],
        "quantity": 30.0,
        "location": "main",
        "reference_type": "sales_order",
        "reference_id": "order-abc-123",
    })
    assert resp.status_code == 201, resp.text

    # Check stock levels reflect reservation
    resp2 = await client.get(f"{BASE}/stock?product_id={product['id']}", headers=auth_headers)
    stock = resp2.json()[0]
    assert stock["total_reserved"] >= 30.0
    assert stock["total_available"] <= 70.0  # 100 - 30


async def test_over_reserve_returns_422(client: AsyncClient, auth_headers: dict):
    product = await _create_product(client, auth_headers, sku="OVER-RES-01")
    await _add_stock(client, auth_headers, product["id"], 10.0)

    resp = await client.post(f"{BASE}/reserve", headers=auth_headers, json={
        "product_id": product["id"],
        "quantity": 50.0,  # more than available
        "location": "main",
    })
    assert resp.status_code == 422
    assert "Insufficient" in resp.json()["detail"]


async def test_release_restores_available_stock(client: AsyncClient, auth_headers: dict):
    product = await _create_product(client, auth_headers, sku="REL-01")
    await _add_stock(client, auth_headers, product["id"], 100.0)

    # Reserve
    await client.post(f"{BASE}/reserve", headers=auth_headers, json={
        "product_id": product["id"],
        "quantity": 40.0,
        "location": "main",
        "reference_id": "order-rel-test",
    })

    # Release
    resp = await client.post(f"{BASE}/release", headers=auth_headers, json={
        "product_id": product["id"],
        "quantity": 40.0,
        "location": "main",
        "reference_id": "order-rel-test",
    })
    assert resp.status_code == 201, resp.text

    # Stock is restored
    resp2 = await client.get(f"{BASE}/stock?product_id={product['id']}", headers=auth_headers)
    stock = resp2.json()[0]
    assert stock["total_reserved"] == 0.0
    assert stock["total_available"] >= 100.0


async def test_auto_reserve_for_order_partial(client: AsyncClient, auth_headers: dict):
    """Lines with enough stock are reserved; lines without stock go to failed list."""
    # Product A: has stock
    prod_a = await _create_product(client, auth_headers, sku="AUTO-A-01")
    await _add_stock(client, auth_headers, prod_a["id"], 50.0)

    # Product B: no stock
    prod_b = await _create_product(client, auth_headers, sku="AUTO-B-01")
    # (no stock added)

    resp = await client.post(f"{BASE}/orders/reserve", headers=auth_headers, json={
        "order_id": "test-order-partial",
        "lines": [
            {"product_id": prod_a["id"], "quantity": 10.0, "location": "main"},
            {"product_id": prod_b["id"], "quantity": 5.0, "location": "main"},
        ],
    })
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert prod_a["id"] in data["reserved"]
    assert prod_b["id"] in data["failed"]
    assert data["partial"] is True


async def test_auto_reserve_for_order_full_success(client: AsyncClient, auth_headers: dict):
    """When all lines have sufficient stock, partial=False and no failed lines."""
    prod = await _create_product(client, auth_headers, sku="AUTO-FULL-01")
    await _add_stock(client, auth_headers, prod["id"], 200.0)

    resp = await client.post(f"{BASE}/orders/reserve", headers=auth_headers, json={
        "order_id": "test-order-full",
        "lines": [
            {"product_id": prod["id"], "quantity": 20.0, "location": "main"},
        ],
    })
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert prod["id"] in data["reserved"]
    assert data["failed"] == []
    assert data["partial"] is False
```

- [ ] **Step 2: Run all inventory contract tests (GREEN)**

```bash
docker compose exec backend pytest tests/test_inventory_contract.py -v --tb=short 2>&1 | tail -30
```
Expected: all passed (total ~24 tests).

- [ ] **Step 3: Commit**

```bash
git -C /d/cbos-platform add backend/tests/test_inventory_contract.py
git -C /d/cbos-platform commit -m "test(inventory): reserve/release semantics, auto-reserve partial/full"
```

---

## Phase 2 — Wedge End-to-End Smoke Test

### Task 4: Full Wedge Traversal

**Files:**
- Create: `backend/tests/test_wedge_smoke.py`

**Context:** The MVP wedge is: Lead created → Opportunity qualified → Quote created → Quote accepted (creates SalesOrder in draft) → Order confirmed → Order start_fulfillment → Order fulfilled. Each step crosses a module boundary (CRM → Sales). Assert status at each transition.

Routes used:
- `POST /api/v1/crm/leads` → lead
- `POST /api/v1/crm/opportunities` → opp (with `lead_id`)
- `PATCH /api/v1/crm/opportunities/{id}` with `stage: "qualified"`
- `POST /api/v1/sales/quotes` → quote (status: "draft")
- `PATCH /api/v1/sales/quotes/{id}/accept` → `{quote: ..., order: ...}` or just `SalesOrderRead` (check router)
- `PATCH /api/v1/sales/orders/{id}/confirm` → order confirmed
- `PATCH /api/v1/sales/orders/{id}/start-fulfillment` → order in_fulfillment
- `PATCH /api/v1/sales/orders/{id}/fulfill` → order fulfilled

**NOTE:** Check what `PATCH /sales/quotes/{id}/accept` returns — it may return `SalesOrderRead` directly or a dict with both. Check router:
```
router.patch("/quotes/{quote_id}/accept", response_model=SalesOrderRead)
```
It returns `SalesOrderRead` (the created order).

- [ ] **Step 1: Write the wedge smoke test (RED first — may fail on schema mismatch)**

Create `backend/tests/test_wedge_smoke.py`:

```python
"""
Wedge end-to-end smoke test.
Traverses the full MVP wedge path:
  Lead → Opportunity (qualified) → Quote → Order → Confirmed → In Fulfillment → Fulfilled
Each step asserts the correct status and cross-module linkage.
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

CRM = "/api/v1/crm"
SALES = "/api/v1/sales"


async def test_full_wedge_traversal(client: AsyncClient, auth_headers: dict):
    """
    Full MVP wedge path in one test.
    """

    # ── 1. Create a lead ─────────────────────────────────────────────────────
    resp = await client.post(f"{CRM}/leads", headers=auth_headers, json={
        "first_name": "Wedge",
        "last_name": "Test",
        "email": "wedge@smoke.test",
        "source": "website",
    })
    assert resp.status_code == 201, resp.text
    lead = resp.json()
    assert lead["status"] == "new"
    lead_id = lead["id"]

    # ── 2. Convert to Opportunity ─────────────────────────────────────────────
    resp = await client.post(f"{CRM}/opportunities", headers=auth_headers, json={
        "title": "Wedge Deal",
        "stage": "new",
    })
    assert resp.status_code == 201, resp.text
    opp = resp.json()
    assert opp["stage"] == "new"
    opp_id = opp["id"]

    # ── 3. Qualify the opportunity ────────────────────────────────────────────
    resp = await client.patch(f"{CRM}/opportunities/{opp_id}", headers=auth_headers, json={
        "stage": "qualified",
    })
    assert resp.status_code == 200, resp.text
    assert resp.json()["stage"] == "qualified"

    # ── 4. Create a Quote linked to the opportunity ───────────────────────────
    resp = await client.post(f"{SALES}/quotes", headers=auth_headers, json={
        "title": "Wedge Quote",
        "currency": "USD",
        "tax_rate": 0.0,
        "discount_amount": 0.0,
        "opportunity_id": opp_id,
        "lines": [
            {
                "description": "Widget Pro",
                "quantity": 3,
                "unit_price": 500.0,
                "discount_percent": 0.0,
                "line_order": 1,
            }
        ],
    })
    assert resp.status_code == 201, resp.text
    quote = resp.json()
    assert quote["status"] == "draft"
    assert quote["total"] == 1500.0
    assert quote["quote_number"].startswith("Q-")
    quote_id = quote["id"]

    # ── 5. Accept the Quote → creates SalesOrder (draft) ─────────────────────
    resp = await client.patch(f"{SALES}/quotes/{quote_id}/accept", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    order = resp.json()
    assert order["status"] == "draft"
    assert order["total"] == 1500.0
    assert order["order_number"].startswith("SO-")
    assert order["quote_id"] == quote_id
    assert order["opportunity_id"] == opp_id
    order_id = order["id"]

    # ── 6. Confirm the Order ──────────────────────────────────────────────────
    resp = await client.patch(f"{SALES}/orders/{order_id}/confirm", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "confirmed"
    assert resp.json()["confirmed_at"] is not None

    # ── 7. Start Fulfillment ──────────────────────────────────────────────────
    resp = await client.patch(f"{SALES}/orders/{order_id}/start-fulfillment", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "in_fulfillment"

    # ── 8. Fulfill the Order ──────────────────────────────────────────────────
    resp = await client.patch(f"{SALES}/orders/{order_id}/fulfill", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    fulfilled = resp.json()
    assert fulfilled["status"] == "fulfilled"
    assert fulfilled["fulfilled_at"] is not None

    # ── Verify quote is now accepted ──────────────────────────────────────────
    resp = await client.get(f"{SALES}/quotes/{quote_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "accepted"
```

- [ ] **Step 2: Run the wedge smoke test**

```bash
docker compose exec backend pytest tests/test_wedge_smoke.py -v --tb=short 2>&1 | tail -20
```
Expected: 1 passed.

If it fails on order_number prefix, check `_next_order_number` in `service.py` to see the actual prefix used, and update the assertion accordingly.

- [ ] **Step 3: Commit**

```bash
git -C /d/cbos-platform add backend/tests/test_wedge_smoke.py
git -C /d/cbos-platform commit -m "test(wedge): end-to-end smoke test — lead to fulfilled order"
```

---

## Phase 3 — Implement `create_activity` Workflow Action

### Task 5: Wire `db` into executor + real `create_activity` action

**Files:**
- Modify: `backend/app/modules/workflows/executor.py`
- Modify: `backend/app/modules/workflows/service.py`

**Context:**
- Currently `run_workflow(wf_id, actions, context, workspace_id)` and `execute_action(action, context, workspace_id)` have no DB access
- `dispatch_event(db, event)` in service.py already has `db`
- We need to pass `db` to `run_workflow` and then to `execute_action`
- `create_activity` action config format:
  ```json
  {
    "type": "create_activity",
    "config": {
      "activity_type": "task",
      "title": "Follow up — order {order_number} fulfilled",
      "entity_type": "opportunity",
      "entity_id": "{entity_id}"
    }
  }
  ```
  `{entity_id}` and `{order_number}` are interpolated from context using the existing `_SafeFormatter`.
  `entity_id` in context = the order's `entity_id` from the event. If `entity_type` is `opportunity`, the config must supply an `opportunity_id` OR we use `entity_id` as fallback.
  For simplicity: `entity_id` in the config can be a template that resolves to a real ID. If it cannot be resolved (template not in context), raise ValueError.
- `crm.service.create_activity(db, workspace_id, actor_id, data: ActivityCreate)` — uses `actor_id = context.get("actor_id") or "system"`

**ActivityCreate schema:**
```python
class ActivityCreate(BaseModel):
    activity_type: str  # call | email | meeting | note | task
    title: str
    description: str | None = None
    entity_type: str   # lead | opportunity
    entity_id: str
    due_date: datetime | None = None
```

- [ ] **Step 1: Write the failing test (RED)**

Add to `backend/tests/test_workflows.py`:

```python
async def test_create_activity_action_creates_crm_activity(
    client: AsyncClient,
    auth_headers: dict,
    db: AsyncSession,
):
    """When a workflow fires with create_activity action, a real CRM activity is created."""
    from app.events.types import SALES_ORDER_FULFILLED, Event
    from app.modules.workflows.models import WorkflowRun
    from app.modules.workflows.service import dispatch_event
    from app.modules.crm.models import Activity
    from sqlalchemy import select

    # Create an opportunity to reference
    opp_resp = await client.post("/api/v1/crm/opportunities", headers=auth_headers, json={
        "title": "Workflow Test Opp",
        "stage": "new",
    })
    assert opp_resp.status_code == 201, opp_resp.text
    opp_id = opp_resp.json()["id"]
    ws_id = opp_resp.json()["workspace_id"]

    # Create workflow: on SalesOrderFulfilled → create_activity on the opportunity
    wf_resp = await client.post("/api/v1/workflows", headers=auth_headers, json={
        "name": "Post-Sale Activity",
        "trigger_type": "event",
        "trigger_config": {"event_type": "SalesOrderFulfilled"},
        "conditions": [],
        "actions": [{
            "type": "create_activity",
            "config": {
                "activity_type": "task",
                "title": "Follow up after sale",
                "entity_type": "opportunity",
                "entity_id": opp_id,  # direct ID (no template needed)
            },
        }],
        "enabled": True,
    })
    assert wf_resp.status_code == 201, wf_resp.text
    wf_id = wf_resp.json()["id"]

    # Dispatch the SalesOrderFulfilled event
    event = Event(
        event_type="SalesOrderFulfilled",
        source_module="sales",
        workspace_id=ws_id,
        actor_id="actor-test",
        entity_id="order-fulfilled-001",
        payload={"order_number": "SO-2026-0001", "total": 1500.0},
    )
    await dispatch_event(db, event)
    await db.flush()

    # Verify workflow run is completed
    runs = (await db.execute(
        select(WorkflowRun).where(WorkflowRun.workflow_id == wf_id)
    )).scalars().all()
    assert len(runs) == 1
    assert runs[0].status == "completed", f"Run failed: {runs[0].steps_result}"

    # Verify CRM activity was created
    activities = (await db.execute(
        select(Activity).where(
            Activity.workspace_id == ws_id,
            Activity.entity_id == opp_id,
            Activity.title == "Follow up after sale",
        )
    )).scalars().all()
    assert len(activities) == 1
    assert activities[0].activity_type == "task"
```

- [ ] **Step 2: Run to confirm RED**

```bash
docker compose exec backend pytest tests/test_workflows.py::test_create_activity_action_creates_crm_activity -v --tb=short 2>&1 | tail -15
```
Expected: FAILED — activity not created (placeholder just records a note).

- [ ] **Step 3: Implement `db` threading in executor.py (GREEN)**

In `backend/app/modules/workflows/executor.py`:

1. Update `execute_action` signature to accept `db`:

```python
async def execute_action(
    action: dict,
    context: dict,
    workspace_id: str,
    db=None,
) -> dict:
    action_type = action.get("type", "")
    config = action.get("config", {})
    t0 = time.monotonic()

    try:
        if action_type == "send_email":
            result = await _action_send_email(config, context)
        elif action_type == "emit_event":
            result = await _action_emit_event(config, context, workspace_id)
        elif action_type == "webhook":
            result = await _action_webhook(config, context)
        elif action_type == "log":
            result = _action_log(config, context)
        elif action_type == "create_activity":
            result = await _action_create_activity(config, context, workspace_id, db)
        elif action_type == "update_status":
            result = {"note": "Action 'update_status' recorded. Full impl in Phase 7."}
        else:
            result = {"error": f"Unknown action type: {action_type}"}

        duration_ms = int((time.monotonic() - t0) * 1000)
        return {
            "action_type": action_type,
            "status": "completed",
            "detail": result,
            "duration_ms": duration_ms,
        }
    except Exception as exc:
        duration_ms = int((time.monotonic() - t0) * 1000)
        logger.error("Action %s failed: %s", action_type, exc)
        return {
            "action_type": action_type,
            "status": "failed",
            "detail": {"error": str(exc)},
            "duration_ms": duration_ms,
        }
```

2. Add `_action_create_activity` function (after `_action_log`):

```python
async def _action_create_activity(config: dict, context: dict, workspace_id: str, db) -> dict:
    """
    Creates a CRM activity linked to a lead or opportunity.
    config keys: activity_type, title, entity_type, entity_id, description (optional)
    Values support {placeholder} interpolation from context.
    """
    if db is None:
        raise ValueError("create_activity action requires a database session")

    from app.modules.crm.schemas import ActivityCreate
    from app.modules.crm.service import create_activity

    flat_ctx = _flatten_context(context)
    fmt = _SafeFormatter(flat_ctx)

    activity_type = str(config.get("activity_type", "task")).format_map(fmt)
    title = str(config.get("title", "Workflow activity")).format_map(fmt)
    description = config.get("description")
    if description:
        description = str(description).format_map(fmt)
    entity_type = str(config.get("entity_type", "opportunity")).format_map(fmt)
    entity_id = str(config.get("entity_id", "")).format_map(fmt)

    if not entity_id or entity_id.startswith("{"):
        raise ValueError(f"create_activity: entity_id could not be resolved. context keys: {list(flat_ctx.keys())}")

    actor_id = context.get("actor_id") or "system"

    data = ActivityCreate(
        activity_type=activity_type,
        title=title,
        description=description,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    activity = await create_activity(db, workspace_id, actor_id, data)
    return {"activity_id": activity.id, "title": activity.title}
```

3. Update `run_workflow` to accept and thread `db`:

```python
async def run_workflow(
    workflow_id: str,
    actions: list[dict],
    context: dict,
    workspace_id: str,
    db=None,
) -> tuple[str, list[dict], str | None]:
    steps_result = []
    overall_status = "completed"
    error_msg = None

    for action in actions:
        step = await execute_action(action, context, workspace_id, db=db)
        steps_result.append(step)
        if step["status"] == "failed":
            overall_status = "failed"
            error_msg = str(step["detail"].get("error", "Unknown error"))
            break

    return overall_status, steps_result, error_msg
```

- [ ] **Step 4: Update `dispatch_event` in service.py to pass `db`**

In `backend/app/modules/workflows/service.py`, find:

```python
        status, steps, error = await run_workflow(
            wf.id, wf.actions, context, event.workspace_id
        )
```

Replace with:

```python
        status, steps, error = await run_workflow(
            wf.id, wf.actions, context, event.workspace_id, db=db
        )
```

- [ ] **Step 5: Run test to verify GREEN**

```bash
docker compose exec backend pytest tests/test_workflows.py::test_create_activity_action_creates_crm_activity -v --tb=short 2>&1 | tail -15
```
Expected: 1 passed.

- [ ] **Step 6: Run full workflows test suite**

```bash
docker compose exec backend pytest tests/test_workflows.py -v --tb=short 2>&1 | tail -15
```
Expected: all passed (previously 7 tests + new one = 8 passed).

- [ ] **Step 7: Commit**

```bash
git -C /d/cbos-platform add backend/app/modules/workflows/executor.py backend/app/modules/workflows/service.py backend/tests/test_workflows.py
git -C /d/cbos-platform commit -m "feat(workflows): implement create_activity action with real CRM activity creation"
```

---

## Phase 4 — Final Verification

### Task 6: Full Suite Run + Push

**Files:** None

**Context:** All new tests must pass alongside the existing 96 tests. Expected total: ~123 tests (96 existing + ~24 inventory contract + 1 wedge smoke + 1 workflow activity). Run the full suite against a fresh DB.

- [ ] **Step 1: Drop test DB and run full suite**

```bash
docker compose exec postgres psql -U cbos -c "DROP DATABASE IF EXISTS cbos_test;" && \
docker compose exec backend pytest --tb=short -q 2>&1 | tail -5
```
Expected: all passed. Accept up to 3 unrelated warnings.

- [ ] **Step 2: If any failures — fix before proceeding**

Read the error, diagnose root cause, fix, re-run. Do NOT mark task complete with failing tests.

- [ ] **Step 3: Push to master**

```bash
git -C /d/cbos-platform push origin master
```

- [ ] **Step 4: Confirm on GitHub**

```bash
git -C /d/cbos-platform log --oneline origin/master -5
```
Expected: last 5 commits include Sprint 4 work.
