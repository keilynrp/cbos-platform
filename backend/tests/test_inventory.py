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


async def _create_category(client: AsyncClient, auth_headers: dict, slug: str) -> dict:
    resp = await client.post(f"{BASE}/categories", headers=auth_headers, json={
        "name": f"Cat {slug}",
        "slug": slug,
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
    assert stock[product_id]["total_current"] >= 100.0


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
    assert item["total_reserved"] >= 10.0
    assert item["total_available"] == item["total_current"] - item["total_reserved"]


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
    assert stock[product_id]["total_reserved"] == 0.0


async def test_reserve_more_than_available_returns_422(client: AsyncClient, auth_headers: dict):
    product = await _create_product(client, auth_headers, "OverReserve Test")
    product_id = product["id"]
    await _add_stock(client, auth_headers, product_id, 5.0)

    resp = await client.post(f"{BASE}/reserve", headers=auth_headers, json={
        "product_id": product_id,
        "quantity": 100.0,  # more than available
    })
    assert resp.status_code == 422


# ── Error envelope (ADR 0010) ────────────────────────────────────────────────
#
# inventory no tiene hoy pantallas que muteen stock: el mapa de errors.ts es
# prospectivo y el consumidor real es el gateway de sales, que ya solo mira el
# tipo de la excepcion. Estos tests fijan el contrato antes de que exista una
# UI que dependa de el.

MISSING_ID = "00000000-0000-0000-0000-000000000000"


def _error(resp) -> dict:
    body = resp.json()
    assert "error" in body, body
    return body["error"]


async def test_product_not_found_error_shape(client: AsyncClient, auth_headers: dict):
    resp = await client.get(f"{BASE}/products/{MISSING_ID}", headers=auth_headers)

    assert resp.status_code == 404
    error = _error(resp)
    assert error["code"] == "INVENTORY_PRODUCT_NOT_FOUND"
    assert error["detail"]["id"] == MISSING_ID


async def test_duplicate_sku_error_shape(client: AsyncClient, auth_headers: dict):
    await _create_product(client, auth_headers, "Dupe SKU")

    resp = await client.post(f"{BASE}/products", headers=auth_headers, json={
        "name": "Otro producto",
        "sku": "SKU-DUPE-SKU",
        "unit_of_measure": "unit",
        "min_stock": 1.0,
    })

    assert resp.status_code == 409
    error = _error(resp)
    assert error["code"] == "INVENTORY_SKU_TAKEN"
    assert error["detail"]["sku"] == "SKU-DUPE-SKU"


async def test_insufficient_stock_error_shape(client: AsyncClient, auth_headers: dict):
    product = await _create_product(client, auth_headers, "Short Stock")
    await _add_stock(client, auth_headers, product["id"], 5.0)

    resp = await client.post(f"{BASE}/reserve", headers=auth_headers, json={
        "product_id": product["id"],
        "quantity": 100.0,
    })

    assert resp.status_code == 422
    error = _error(resp)
    assert error["code"] == "INVENTORY_INSUFFICIENT_STOCK"
    # Antes solo viajaba el disponible, cocido en la frase. Ahora tambien lo
    # pedido, que es lo que permite al cliente decir cuanto falta.
    assert error["detail"]["available"] == 5.0
    assert error["detail"]["requested"] == 100.0
    assert "unit" in error["detail"]


async def test_invalid_movement_type_error_shape(client: AsyncClient, auth_headers: dict):
    product = await _create_product(client, auth_headers, "Bad Movement")

    resp = await client.post(f"{BASE}/movements", headers=auth_headers, json={
        "product_id": product["id"],
        "movement_type": "teleport",
        "quantity": 1.0,
        "location": "main",
    })

    assert resp.status_code == 422
    error = _error(resp)
    assert error["code"] == "INVENTORY_INVALID_MOVEMENT_TYPE"
    assert error["detail"]["movement_type"] == "teleport"
    assert error["detail"]["allowed"] == ["in", "out", "adjustment"]


# ── Paginacion ────────────────────────────────────────────────────────────────

async def test_categories_respect_limit_and_offset(client: AsyncClient, auth_headers: dict):
    for i in range(3):
        await _create_category(client, auth_headers, f"cat-page-{i}")

    first = await client.get(f"{BASE}/categories?limit=2", headers=auth_headers)
    second = await client.get(f"{BASE}/categories?limit=2&offset=2", headers=auth_headers)

    assert first.status_code == 200
    assert len(first.json()) == 2
    # Las paginas no se solapan: el orden es estable por nombre.
    first_ids = {c["id"] for c in first.json()}
    second_ids = {c["id"] for c in second.json()}
    assert first_ids.isdisjoint(second_ids)


async def test_stock_respects_limit_and_offset(client: AsyncClient, auth_headers: dict):
    for i in range(3):
        product = await _create_product(client, auth_headers, f"Paged {i}")
        await _add_stock(client, auth_headers, product["id"], 10.0)

    first = await client.get(f"{BASE}/stock?limit=2", headers=auth_headers)
    second = await client.get(f"{BASE}/stock?limit=2&offset=2", headers=auth_headers)

    assert first.status_code == 200
    assert len(first.json()) == 2
    first_ids = {s["product_id"] for s in first.json()}
    second_ids = {s["product_id"] for s in second.json()}
    assert first_ids.isdisjoint(second_ids)


async def test_stock_pagination_applies_after_low_stock_filter(
    client: AsyncClient, auth_headers: dict
):
    # Dos por debajo del minimo y uno por encima. Si el recorte fuese anterior al
    # filtro, pedir limit=2 podria devolver uno solo: el producto con stock de
    # sobra ocuparia sitio en la pagina y luego se descartaria.
    for i in range(2):
        low = await _create_product(client, auth_headers, f"Low {i}")
        await _add_stock(client, auth_headers, low["id"], 1.0)
    healthy = await _create_product(client, auth_headers, "Healthy")
    await _add_stock(client, auth_headers, healthy["id"], 500.0)

    resp = await client.get(f"{BASE}/stock?low_stock_only=true&limit=2", headers=auth_headers)

    assert resp.status_code == 200
    levels = resp.json()
    assert len(levels) == 2
    assert all(level["is_low_stock"] for level in levels)


async def test_list_routes_reject_limit_above_the_cap(client: AsyncClient, auth_headers: dict):
    # 200 es el techo compartido con CRM y Sales; inventory ya no es la excepcion.
    for path in ("/categories", "/products", "/stock", "/movements"):
        resp = await client.get(f"{BASE}{path}?limit=201", headers=auth_headers)
        assert resp.status_code == 422, f"{path} acepto limit=201"
