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
        "email": "wedge@smoke-test.example.com",
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
    resp = await client.patch(f"{CRM}/opportunities/{opp_id}/stage", headers=auth_headers, json={
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
    resp = await client.patch(f"{SALES}/orders/{order_id}/confirm", headers=auth_headers, json={})
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
