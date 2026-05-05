"""
Tests for quote line editing endpoints:
  PATCH /sales/quotes/{id}/lines/{line_id}
  PUT   /sales/quotes/{id}/lines
  GET   /sales/quotes/{id}/history
"""
import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio
BASE = "/api/v1/sales"


async def _create_quote(client: AsyncClient, headers: dict) -> dict:
    resp = await client.post(f"{BASE}/quotes", headers=headers, json={
        "title": "Line Test Quote",
        "currency": "USD",
        "tax_rate": 0,
        "discount_amount": 0,
        "lines": [
            {"description": "Widget A", "quantity": 2, "unit_price": 100.0, "discount_percent": 0, "tax_percent": 10},
        ],
    })
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── PATCH /lines/{line_id} ────────────────────────────────────────────────────

async def test_update_line_changes_description(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers)
    line_id = quote["lines"][0]["id"]

    resp = await client.patch(
        f"{BASE}/quotes/{quote['id']}/lines/{line_id}",
        headers=auth_headers,
        json={"description": "Widget Z"},
    )
    assert resp.status_code == 200
    updated = resp.json()
    assert updated["lines"][0]["description"] == "Widget Z"


async def test_update_line_recalculates_totals(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers)
    line_id = quote["lines"][0]["id"]

    # qty=2, price=100, disc=0, tax=10 → pretax=200, tax=20, amount=220
    assert quote["lines"][0]["amount"] == pytest.approx(220.0)
    assert quote["subtotal"] == pytest.approx(200.0)
    assert quote["tax_amount"] == pytest.approx(20.0)
    assert quote["total"] == pytest.approx(220.0)

    resp = await client.patch(
        f"{BASE}/quotes/{quote['id']}/lines/{line_id}",
        headers=auth_headers,
        json={"quantity": 3},
    )
    updated = resp.json()
    # qty=3, price=100, disc=0, tax=10 → pretax=300, tax=30, amount=330
    assert updated["lines"][0]["amount"] == pytest.approx(330.0)
    assert updated["subtotal"] == pytest.approx(300.0)
    assert updated["tax_amount"] == pytest.approx(30.0)
    assert updated["total"] == pytest.approx(330.0)


async def test_update_line_returns_new_fields(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers)
    line_id = quote["lines"][0]["id"]

    resp = await client.patch(
        f"{BASE}/quotes/{quote['id']}/lines/{line_id}",
        headers=auth_headers,
        json={"sku": "SKU-001", "unit": "hrs", "notes": "Rush delivery"},
    )
    assert resp.status_code == 200
    line = resp.json()["lines"][0]
    assert line["sku"] == "SKU-001"
    assert line["unit"] == "hrs"
    assert line["notes"] == "Rush delivery"


async def test_update_line_on_sent_quote_returns_409(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers)
    await client.patch(f"{BASE}/quotes/{quote['id']}/send", headers=auth_headers)
    line_id = quote["lines"][0]["id"]

    resp = await client.patch(
        f"{BASE}/quotes/{quote['id']}/lines/{line_id}",
        headers=auth_headers,
        json={"quantity": 5},
    )
    assert resp.status_code == 409


async def test_update_line_with_wrong_line_id_returns_404(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers)
    resp = await client.patch(
        f"{BASE}/quotes/{quote['id']}/lines/nonexistent-id",
        headers=auth_headers,
        json={"quantity": 1},
    )
    assert resp.status_code == 404


# ── PUT /lines ────────────────────────────────────────────────────────────────

async def test_replace_lines_reorders(client: AsyncClient, auth_headers: dict):
    # Create quote with 2 lines
    resp = await client.post(f"{BASE}/quotes", headers=auth_headers, json={
        "title": "Reorder Test",
        "currency": "USD",
        "tax_rate": 0,
        "discount_amount": 0,
        "lines": [
            {"description": "First", "quantity": 1, "unit_price": 10, "discount_percent": 0, "tax_percent": 0, "line_order": 1},
            {"description": "Second", "quantity": 1, "unit_price": 20, "discount_percent": 0, "tax_percent": 0, "line_order": 2},
        ],
    })
    quote = resp.json()
    line_a_id = next(l["id"] for l in quote["lines"] if l["description"] == "First")
    line_b_id = next(l["id"] for l in quote["lines"] if l["description"] == "Second")

    # Swap order
    resp = await client.put(
        f"{BASE}/quotes/{quote['id']}/lines",
        headers=auth_headers,
        json=[
            {"id": line_b_id, "description": "Second", "quantity": 1, "unit_price": 20, "discount_percent": 0, "tax_percent": 0, "line_order": 1},
            {"id": line_a_id, "description": "First", "quantity": 1, "unit_price": 10, "discount_percent": 0, "tax_percent": 0, "line_order": 2},
        ],
    )
    assert resp.status_code == 200
    lines = resp.json()["lines"]
    assert lines[0]["description"] == "Second"
    assert lines[1]["description"] == "First"


async def test_replace_lines_deletes_omitted_lines(client: AsyncClient, auth_headers: dict):
    resp = await client.post(f"{BASE}/quotes", headers=auth_headers, json={
        "title": "Delete Test",
        "currency": "USD",
        "tax_rate": 0,
        "discount_amount": 0,
        "lines": [
            {"description": "Keep", "quantity": 1, "unit_price": 10, "discount_percent": 0, "tax_percent": 0},
            {"description": "Delete me", "quantity": 1, "unit_price": 5, "discount_percent": 0, "tax_percent": 0},
        ],
    })
    quote = resp.json()
    keep_id = next(l["id"] for l in quote["lines"] if l["description"] == "Keep")

    resp = await client.put(
        f"{BASE}/quotes/{quote['id']}/lines",
        headers=auth_headers,
        json=[
            {"id": keep_id, "description": "Keep", "quantity": 1, "unit_price": 10, "discount_percent": 0, "tax_percent": 0, "line_order": 1},
        ],
    )
    assert resp.status_code == 200
    assert len(resp.json()["lines"]) == 1
    assert resp.json()["lines"][0]["description"] == "Keep"


async def test_replace_lines_on_sent_quote_returns_409(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers)
    await client.patch(f"{BASE}/quotes/{quote['id']}/send", headers=auth_headers)
    line_id = quote["lines"][0]["id"]

    resp = await client.put(
        f"{BASE}/quotes/{quote['id']}/lines",
        headers=auth_headers,
        json=[
            {"id": line_id, "description": "Widget A", "quantity": 2, "unit_price": 100, "discount_percent": 0, "tax_percent": 10, "line_order": 1},
        ],
    )
    assert resp.status_code == 409


async def test_replace_lines_empty_returns_422(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers)
    resp = await client.put(
        f"{BASE}/quotes/{quote['id']}/lines",
        headers=auth_headers,
        json=[],
    )
    assert resp.status_code == 422


# ── GET /history ──────────────────────────────────────────────────────────────

async def test_history_has_created_event(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers)
    resp = await client.get(f"{BASE}/quotes/{quote['id']}/history", headers=auth_headers)
    assert resp.status_code == 200
    events = resp.json()
    assert len(events) >= 1
    types = [e["event_type"] for e in events]
    assert "created" in types


async def test_history_records_line_update(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers)
    line_id = quote["lines"][0]["id"]
    await client.patch(
        f"{BASE}/quotes/{quote['id']}/lines/{line_id}",
        headers=auth_headers,
        json={"quantity": 5},
    )
    resp = await client.get(f"{BASE}/quotes/{quote['id']}/history", headers=auth_headers)
    types = [e["event_type"] for e in resp.json()]
    assert "line_updated" in types


async def test_history_newest_first(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers)
    line_id = quote["lines"][0]["id"]
    await client.patch(
        f"{BASE}/quotes/{quote['id']}/lines/{line_id}",
        headers=auth_headers,
        json={"quantity": 3},
    )
    resp = await client.get(f"{BASE}/quotes/{quote['id']}/history", headers=auth_headers)
    events = resp.json()
    # First event in list should be the most recent (line_updated)
    assert events[0]["event_type"] == "line_updated"


async def test_history_is_readable_for_non_draft_quote(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers)
    await client.patch(f"{BASE}/quotes/{quote['id']}/send", headers=auth_headers)
    resp = await client.get(f"{BASE}/quotes/{quote['id']}/history", headers=auth_headers)
    assert resp.status_code == 200
