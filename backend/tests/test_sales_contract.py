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
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["id"] == quote["id"]
    assert data["title"] == "Find Me"


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
    assert resp.status_code == 200, resp.text
    assert resp.json()["title"] == "After"


async def test_quote_number_auto_generated(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers)
    assert quote["quote_number"].startswith("Q-")


async def test_send_quote_transitions_to_sent(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers)
    resp = await client.patch(
        f"{BASE}/quotes/{quote['id']}/send", headers=auth_headers
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "sent"
    assert resp.json()["sent_at"] is not None


async def test_reject_quote_transitions_to_rejected(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers)
    assert (await client.patch(f"{BASE}/quotes/{quote['id']}/send", headers=auth_headers)).status_code == 200
    resp = await client.patch(
        f"{BASE}/quotes/{quote['id']}/reject", headers=auth_headers,
        json={"reason": "Price too high"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "rejected"


async def test_list_quotes_filter_by_status(client: AsyncClient, auth_headers: dict):
    await _create_quote(client, auth_headers, title="Draft Quote")
    # Create a sent quote to confirm it's excluded from draft filter
    sent_q = await _create_quote(client, auth_headers, title="Sent Quote")
    await client.patch(f"{BASE}/quotes/{sent_q['id']}/send", headers=auth_headers)

    resp = await client.get(f"{BASE}/quotes?status=draft", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    assert all(q["status"] == "draft" for q in resp.json())
    assert len(resp.json()) >= 1


# ── Full order traversal ──────────────────────────────────────────────────────

async def test_accept_quote_creates_order(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers, title="To Accept")
    resp = await client.patch(
        f"{BASE}/quotes/{quote['id']}/accept", headers=auth_headers
    )
    assert resp.status_code == 200, resp.text
    order = resp.json()
    assert order["order_number"].startswith("SO-")
    assert order["status"] == "draft"


async def test_full_order_traversal_to_fulfilled(client: AsyncClient, auth_headers: dict):
    """draft → confirmed → in_fulfillment → fulfilled."""
    quote = await _create_quote(client, auth_headers, title="Fulfillment Journey")
    order_id = (await client.patch(
        f"{BASE}/quotes/{quote['id']}/accept", headers=auth_headers
    )).json()["id"]

    # draft → confirmed
    data = (await client.patch(
        f"{BASE}/orders/{order_id}/confirm", headers=auth_headers, json={}
    )).json()
    assert data["status"] == "confirmed"
    assert data["confirmed_at"] is not None

    # confirmed → in_fulfillment
    data = (await client.patch(
        f"{BASE}/orders/{order_id}/start-fulfillment", headers=auth_headers
    )).json()
    assert data["status"] == "in_fulfillment"

    # in_fulfillment → fulfilled
    data = (await client.patch(
        f"{BASE}/orders/{order_id}/fulfill", headers=auth_headers
    )).json()
    assert data["status"] == "fulfilled"
    assert data["fulfilled_at"] is not None


async def test_cancel_confirmed_order(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers, title="Cancel Journey")
    order_id = (await client.patch(
        f"{BASE}/quotes/{quote['id']}/accept", headers=auth_headers
    )).json()["id"]
    assert (await client.patch(
        f"{BASE}/orders/{order_id}/confirm", headers=auth_headers, json={}
    )).status_code == 200
    resp = await client.patch(
        f"{BASE}/orders/{order_id}/cancel", headers=auth_headers
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "cancelled"
    assert resp.json()["cancelled_at"] is not None


async def test_fulfilled_order_cannot_be_cancelled(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers, title="Cannot Cancel")
    order_id = (await client.patch(
        f"{BASE}/quotes/{quote['id']}/accept", headers=auth_headers
    )).json()["id"]
    assert (await client.patch(f"{BASE}/orders/{order_id}/confirm", headers=auth_headers, json={})).status_code == 200
    assert (await client.patch(f"{BASE}/orders/{order_id}/start-fulfillment", headers=auth_headers)).status_code == 200
    assert (await client.patch(f"{BASE}/orders/{order_id}/fulfill", headers=auth_headers)).status_code == 200
    # fulfilled is terminal
    resp = await client.patch(f"{BASE}/orders/{order_id}/cancel", headers=auth_headers)
    assert resp.status_code == 422


async def test_get_order_by_id(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers, title="Get Order")
    order = (await client.patch(
        f"{BASE}/quotes/{quote['id']}/accept", headers=auth_headers
    )).json()
    resp = await client.get(f"{BASE}/orders/{order['id']}", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["id"] == order["id"]


# ── Quote line management ─────────────────────────────────────────────────────

async def test_add_line_to_draft_quote_updates_total(
    client: AsyncClient, auth_headers: dict
):
    """POST /quotes/{id}/lines returns QuoteRead with updated lines and total."""
    quote = await _create_quote(client, auth_headers)
    original_total = quote["total"]

    resp = await client.post(
        f"{BASE}/quotes/{quote['id']}/lines", headers=auth_headers,
        json={
            "description": "New Widget",
            "quantity": 1,
            "unit_price": 50.0,
            "discount_percent": 0.0,
            "line_order": 2,
        },
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    # Returns QuoteRead (the full updated quote, not just the line)
    assert data["total"] > original_total
    assert any(l["description"] == "New Widget" for l in data["lines"])


async def test_remove_line_from_draft_quote(client: AsyncClient, auth_headers: dict):
    """DELETE /quotes/{id}/lines/{line_id} returns QuoteRead with line removed."""
    quote = await _create_quote(client, auth_headers)
    # Add a second line
    updated_quote = (await client.post(
        f"{BASE}/quotes/{quote['id']}/lines", headers=auth_headers,
        json={
            "description": "Extra", "quantity": 1, "unit_price": 10.0,
            "discount_percent": 0.0, "line_order": 2,
        },
    )).json()
    line_id = next(l["id"] for l in updated_quote["lines"] if l["description"] == "Extra")

    resp = await client.delete(
        f"{BASE}/quotes/{quote['id']}/lines/{line_id}", headers=auth_headers
    )
    assert resp.status_code == 200, resp.text
    descriptions = [l["description"] for l in resp.json()["lines"]]
    assert "Extra" not in descriptions


# ── PDF download ──────────────────────────────────────────────────────────────

async def test_quote_pdf_returns_pdf_content(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers, title="PDF Quote")
    resp = await client.get(
        f"{BASE}/quotes/{quote['id']}/pdf", headers=auth_headers
    )
    assert resp.status_code == 200, resp.text
    assert resp.headers["content-type"] == "application/pdf"
    assert len(resp.content) > 0


async def test_quote_pdf_requires_auth(client: AsyncClient):
    resp = await client.get(
        f"{BASE}/quotes/00000000-0000-0000-0000-000000000000/pdf"
    )
    assert resp.status_code == 401


# ── Workspace isolation ───────────────────────────────────────────────────────

async def _register_workspace(client: AsyncClient, slug: str, email: str) -> dict:
    resp = await client.post("/api/v1/auth/register", json={
        "full_name": "Isolated User",
        "email": email,
        "password": "securepassIso123",
        "workspace_name": f"Isolated Corp {slug}",
        "workspace_slug": slug,
    })
    assert resp.status_code == 201, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


async def test_quotes_not_visible_across_workspaces(
    client: AsyncClient, auth_headers: dict
):
    await _create_quote(client, auth_headers, title="Private Quote")
    headers_b = await _register_workspace(
        client, "iso-sales-b", "iso-sales-b@isolation.example.com"
    )
    resp = await client.get(f"{BASE}/quotes", headers=headers_b)
    assert resp.status_code == 200, resp.text
    assert resp.json() == []


async def test_orders_not_visible_across_workspaces(
    client: AsyncClient, auth_headers: dict
):
    quote = await _create_quote(client, auth_headers, title="Private Order Quote")
    await client.patch(f"{BASE}/quotes/{quote['id']}/accept", headers=auth_headers)
    headers_b = await _register_workspace(
        client, "iso-orders-b", "iso-orders-b@isolation.example.com"
    )
    resp = await client.get(f"{BASE}/orders", headers=headers_b)
    assert resp.status_code == 200, resp.text
    assert resp.json() == []
