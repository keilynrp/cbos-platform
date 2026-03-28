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
        "full_name": "WS2 Inv",
        "email": "workspace2_inv@test.com",
        "password": "Password123!",
        "workspace_name": "Workspace Two Inv",
        "workspace_slug": "workspace-two-inv",
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
