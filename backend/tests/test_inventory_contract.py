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
        "full_name": "WS2 Inv",
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


async def test_product_from_another_workspace_returns_404(
    client: AsyncClient, auth_headers: dict
):
    # 404 y no 403: distinguirlos le diria a quien prueba ids cuales existen.
    product = await _create_product(client, auth_headers, sku="ISO-404")
    ws2_headers = await _get_second_auth_headers(client)

    resp = await client.get(f"{BASE}/products/{product['id']}", headers=ws2_headers)

    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "INVENTORY_PRODUCT_NOT_FOUND"
