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
    assert (await client.patch(
        f"{BASE}/orders/{order_id}/confirm", headers=auth_headers, json={}
    )).json()["status"] == "confirmed"

    # confirmed → in_fulfillment
    resp = await client.patch(
        f"{BASE}/orders/{order_id}/start-fulfillment", headers=auth_headers
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "in_fulfillment"


async def test_start_fulfillment_rejects_draft_order(
    client: AsyncClient, auth_headers: dict
):
    """Calling start-fulfillment on a draft order must return 422."""
    quote = await _create_quote(client, auth_headers, title="Draft Fulfillment Guard")
    order = (await client.patch(
        f"{BASE}/quotes/{quote['id']}/accept", headers=auth_headers
    )).json()
    order_id = order["id"]

    # draft → in_fulfillment should be rejected
    resp = await client.patch(
        f"{BASE}/orders/{order_id}/start-fulfillment", headers=auth_headers
    )
    assert resp.status_code == 422


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
