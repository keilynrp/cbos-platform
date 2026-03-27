"""
Inventory module integration tests.
Covers: products, stock movements, reserve/release, over-reserve protection.
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

BASE = "/api/v1/inventory"


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _create_product(client: AsyncClient, auth_headers: dict, name: str = "Widget") -> dict:
    resp = await client.post(f"{BASE}/products", headers=auth_headers, json={
        "name": name,
        "sku": f"SKU-{name.upper().replace(' ', '-')}",
        "unit_of_measure": "unit",
        "min_stock": 5.0,
    })
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _add_stock(client: AsyncClient, auth_headers: dict, product_id: str, qty: float) -> dict:
    resp = await client.post(f"{BASE}/movements", headers=auth_headers, json={
        "product_id": product_id,
        "movement_type": "in",
        "quantity": qty,
        "location": "main",
    })
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── Tests ─────────────────────────────────────────────────────────────────────

async def test_create_product_returns_201(client: AsyncClient, auth_headers: dict):
    product = await _create_product(client, auth_headers, "Gadget X")
    assert product["name"] == "Gadget X"
    assert "id" in product


async def test_stock_movement_in_increments_stock(client: AsyncClient, auth_headers: dict):
    product = await _create_product(client, auth_headers, "Stock In Test")
    product_id = product["id"]

    movement = await _add_stock(client, auth_headers, product_id, 100.0)
    assert movement["stock_after"] > movement["stock_before"]

    # Verify via stock list
    resp = await client.get(f"{BASE}/stock", headers=auth_headers)
    assert resp.status_code == 200
    stock = {s["product_id"]: s for s in resp.json()}
    assert product_id in stock
    assert stock[product_id]["current_stock"] >= 100.0


async def test_reserve_stock_increases_reserved(client: AsyncClient, auth_headers: dict):
    product = await _create_product(client, auth_headers, "Reserve Test")
    product_id = product["id"]
    await _add_stock(client, auth_headers, product_id, 50.0)

    resp = await client.post(f"{BASE}/reserve", headers=auth_headers, json={
        "product_id": product_id,
        "quantity": 10.0,
    })
    assert resp.status_code == 201

    # Check available stock = current - reserved
    stock_resp = await client.get(f"{BASE}/stock", headers=auth_headers)
    stock = {s["product_id"]: s for s in stock_resp.json()}
    item = stock[product_id]
    assert item["reserved_stock"] >= 10.0
    assert item["available_stock"] == item["current_stock"] - item["reserved_stock"]


async def test_release_stock_decreases_reserved(client: AsyncClient, auth_headers: dict):
    product = await _create_product(client, auth_headers, "Release Test")
    product_id = product["id"]
    await _add_stock(client, auth_headers, product_id, 50.0)

    # Reserve
    await client.post(f"{BASE}/reserve", headers=auth_headers, json={
        "product_id": product_id,
        "quantity": 20.0,
    })

    # Release
    resp = await client.post(f"{BASE}/release", headers=auth_headers, json={
        "product_id": product_id,
        "quantity": 20.0,
    })
    assert resp.status_code == 201

    stock_resp = await client.get(f"{BASE}/stock", headers=auth_headers)
    stock = {s["product_id"]: s for s in stock_resp.json()}
    assert stock[product_id]["reserved_stock"] == 0.0


async def test_reserve_more_than_available_returns_422(client: AsyncClient, auth_headers: dict):
    product = await _create_product(client, auth_headers, "OverReserve Test")
    product_id = product["id"]
    await _add_stock(client, auth_headers, product_id, 5.0)

    resp = await client.post(f"{BASE}/reserve", headers=auth_headers, json={
        "product_id": product_id,
        "quantity": 100.0,  # more than available
    })
    assert resp.status_code == 422
