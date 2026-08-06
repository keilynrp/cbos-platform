"""
Sales module integration tests.
Covers: quotes, order lines, state transitions (confirm, fulfill, cancel).
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

BASE = "/api/v1/sales"

QUOTE_PAYLOAD = {
    "title": "Test Quote",
    "currency": "USD",
    "tax_rate": 0,
    "discount_amount": 0,
    "lines": [
        {
            "description": "Widget A",
            "quantity": 2,
            "unit_price": 100.0,
            "discount_percent": 0,
        }
    ],
}


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _create_quote(client: AsyncClient, auth_headers: dict, title: str = "Test Quote") -> dict:
    payload = {**QUOTE_PAYLOAD, "title": title}
    resp = await client.post(f"{BASE}/quotes", headers=auth_headers, json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _accept_quote(client: AsyncClient, auth_headers: dict, quote_id: str) -> dict:
    # First send the quote
    await client.patch(f"{BASE}/quotes/{quote_id}/send", headers=auth_headers)
    # Then accept
    resp = await client.patch(f"{BASE}/quotes/{quote_id}/accept", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    return resp.json()


# ── Quote tests ───────────────────────────────────────────────────────────────

async def test_create_quote_returns_201(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers)
    assert "id" in quote
    assert quote["status"] == "draft"
    assert len(quote["lines"]) == 1
    assert quote["total"] == 200.0


async def test_add_line_to_quote(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers, "Add Line Test")
    quote_id = quote["id"]

    resp = await client.post(f"{BASE}/quotes/{quote_id}/lines", headers=auth_headers, json={
        "description": "Widget B",
        "quantity": 1,
        "unit_price": 50.0,
        "discount_percent": 0,
    })
    assert resp.status_code == 201
    updated = resp.json()
    assert len(updated["lines"]) == 2


async def test_accept_quote_creates_sales_order(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers, "Accept Test")
    accepted = await _accept_quote(client, auth_headers, quote["id"])
    # accept_quote returns a SalesOrder
    assert accepted["status"] == "draft"


async def test_sales_order_confirm(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers, "Confirm Test")
    order = await _accept_quote(client, auth_headers, quote["id"])
    order_id = order["id"]

    resp = await client.patch(f"{BASE}/orders/{order_id}/confirm", headers=auth_headers, json={})
    assert resp.status_code == 200
    assert resp.json()["status"] == "confirmed"


async def test_sales_order_fulfill(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers, "Fulfill Test")
    order = await _accept_quote(client, auth_headers, quote["id"])
    order_id = order["id"]

    # confirm → in_fulfillment → fulfilled
    await client.patch(f"{BASE}/orders/{order_id}/confirm", headers=auth_headers, json={})
    # Directly transition to in_fulfillment is not yet a separate endpoint,
    # so we test confirm → fulfill (which should fail since transition is confirm→in_fulfillment)
    resp = await client.patch(f"{BASE}/orders/{order_id}/fulfill", headers=auth_headers)
    # confirmed → fulfilled is NOT a valid transition (must go through in_fulfillment)
    assert resp.status_code == 422


async def test_sales_order_cancel(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers, "Cancel Test")
    order = await _accept_quote(client, auth_headers, quote["id"])
    order_id = order["id"]

    resp = await client.patch(f"{BASE}/orders/{order_id}/cancel", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "cancelled"


async def test_invalid_state_transition_returns_422(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers, "State Machine Test")
    order = await _accept_quote(client, auth_headers, quote["id"])
    order_id = order["id"]

    # Cancel first
    await client.patch(f"{BASE}/orders/{order_id}/cancel", headers=auth_headers)

    # Try to confirm a cancelled order
    resp = await client.patch(f"{BASE}/orders/{order_id}/confirm", headers=auth_headers, json={})
    assert resp.status_code == 422


async def test_quote_lines_copied_to_order(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers, "Lines Copy Test")
    order = await _accept_quote(client, auth_headers, quote["id"])

    assert len(order.get("lines", [])) == 1
    assert order["lines"][0]["description"] == "Widget A"
    assert order["lines"][0]["quantity"] == 2


# ── Error envelope (ADR 0010) ────────────────────────────────────────────────
#
# El `code` y las claves de `detail` son el contrato que consume
# composable-os/src/lib/errors.ts. Renombrar una clave no rompe al frontend: lo
# hace caer al mensaje en ingles del backend, en silencio. Estos tests son lo
# unico que corta esa deriva.

MISSING_ID = "00000000-0000-0000-0000-000000000000"


def _error(resp) -> dict:
    body = resp.json()
    assert "error" in body, body
    return body["error"]


async def test_quote_not_found_error_shape(client: AsyncClient, auth_headers: dict):
    resp = await client.get(f"{BASE}/quotes/{MISSING_ID}", headers=auth_headers)

    assert resp.status_code == 404
    error = _error(resp)
    assert error["code"] == "SALES_QUOTE_NOT_FOUND"
    assert error["detail"]["id"] == MISSING_ID


async def test_order_not_found_error_shape(client: AsyncClient, auth_headers: dict):
    resp = await client.get(f"{BASE}/orders/{MISSING_ID}", headers=auth_headers)

    assert resp.status_code == 404
    error = _error(resp)
    assert error["code"] == "SALES_ORDER_NOT_FOUND"
    assert error["detail"]["id"] == MISSING_ID


async def test_quote_line_not_found_error_shape(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers, "Missing line")

    resp = await client.delete(
        f"{BASE}/quotes/{quote['id']}/lines/{MISSING_ID}", headers=auth_headers
    )

    assert resp.status_code == 404
    error = _error(resp)
    assert error["code"] == "SALES_QUOTE_LINE_NOT_FOUND"
    assert error["detail"]["id"] == MISSING_ID


async def test_edit_non_draft_quote_error_shape(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers, "Sent quote")
    await client.patch(f"{BASE}/quotes/{quote['id']}/send", headers=auth_headers)

    resp = await client.patch(
        f"{BASE}/quotes/{quote['id']}", headers=auth_headers, json={"title": "Renamed"}
    )

    assert resp.status_code == 409
    error = _error(resp)
    assert error["code"] == "SALES_QUOTE_EDIT_NOT_DRAFT"
    assert error["detail"]["status"] == "sent"


async def test_add_line_to_non_draft_quote_error_shape(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers, "Locked lines")
    await client.patch(f"{BASE}/quotes/{quote['id']}/send", headers=auth_headers)

    resp = await client.post(
        f"{BASE}/quotes/{quote['id']}/lines",
        headers=auth_headers,
        json={"description": "Widget B", "quantity": 1, "unit_price": 50.0},
    )

    assert resp.status_code == 409
    error = _error(resp)
    assert error["code"] == "SALES_QUOTE_LINES_NOT_DRAFT"
    assert error["detail"]["status"] == "sent"


async def test_replace_lines_empty_error_shape(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers, "Empty replace")

    resp = await client.put(
        f"{BASE}/quotes/{quote['id']}/lines", headers=auth_headers, json=[]
    )

    assert resp.status_code == 422
    error = _error(resp)
    assert error["code"] == "SALES_QUOTE_LINES_REQUIRED"


async def test_replace_lines_duplicate_ids_error_shape(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers, "Duplicate ids")
    line_id = quote["lines"][0]["id"]

    payload = [
        {"id": line_id, "description": "Widget A", "quantity": 1, "unit_price": 100.0},
        {"id": line_id, "description": "Widget A again", "quantity": 2, "unit_price": 100.0},
    ]
    resp = await client.put(
        f"{BASE}/quotes/{quote['id']}/lines", headers=auth_headers, json=payload
    )

    assert resp.status_code == 422
    error = _error(resp)
    assert error["code"] == "SALES_QUOTE_LINE_IDS_DUPLICATED"
    assert error["detail"]["ids"] == [line_id]


async def test_send_already_sent_quote_error_shape(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers, "Double send")
    await client.patch(f"{BASE}/quotes/{quote['id']}/send", headers=auth_headers)

    resp = await client.patch(f"{BASE}/quotes/{quote['id']}/send", headers=auth_headers)

    assert resp.status_code == 409
    error = _error(resp)
    assert error["code"] == "SALES_QUOTE_SEND_INVALID_STATUS"
    assert error["detail"]["status"] == "sent"


async def test_accept_rejected_quote_error_shape(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers, "Rejected then accepted")
    await client.patch(f"{BASE}/quotes/{quote['id']}/send", headers=auth_headers)
    await client.patch(
        f"{BASE}/quotes/{quote['id']}/reject", headers=auth_headers, json={"reason": "too expensive"}
    )

    resp = await client.patch(f"{BASE}/quotes/{quote['id']}/accept", headers=auth_headers)

    assert resp.status_code == 409
    error = _error(resp)
    assert error["code"] == "SALES_QUOTE_ACCEPT_INVALID_STATUS"
    assert error["detail"]["status"] == "rejected"


async def test_reject_accepted_quote_error_shape(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers, "Accepted then rejected")
    await _accept_quote(client, auth_headers, quote["id"])

    resp = await client.patch(
        f"{BASE}/quotes/{quote['id']}/reject", headers=auth_headers, json={"reason": "changed mind"}
    )

    assert resp.status_code == 409
    error = _error(resp)
    assert error["code"] == "SALES_QUOTE_REJECT_INVALID_STATUS"
    assert error["detail"]["status"] == "accepted"


async def test_order_invalid_transition_error_shape(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers, "Order transition")
    order = await _accept_quote(client, auth_headers, quote["id"])
    await client.patch(f"{BASE}/orders/{order['id']}/cancel", headers=auth_headers)

    resp = await client.patch(
        f"{BASE}/orders/{order['id']}/confirm", headers=auth_headers, json={}
    )

    assert resp.status_code == 422
    error = _error(resp)
    assert error["code"] == "SALES_ORDER_INVALID_TRANSITION"
    # cancelled es terminal: `allowed` va vacia, y como es un set en el servicio
    # tiene que llegar como lista JSON, no como repr de set.
    assert error["detail"] == {"from": "cancelled", "to": "confirmed", "allowed": []}
