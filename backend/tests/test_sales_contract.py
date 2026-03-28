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
