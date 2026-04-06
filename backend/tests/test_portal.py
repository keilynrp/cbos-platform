"""
Portal module — integration tests.

Covers multi-step flows and cross-module state that contract tests don't touch:
  - Full wedge: quote → portal session → customer view → accept → order
  - Full reject flow: quote → session → customer rejects → already_acted
  - Session accessed_at stamped on first public view (via internal list)
  - Custom expire_hours reflected in session expires_at
  - send-email requires client_email on the session

Note: auth guards, token validation, idempotency, and single-step endpoint
behaviour are already covered in test_portal_contract.py — not duplicated here.
"""
import pytest
from datetime import datetime, timezone, timedelta

from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

SALES  = "/api/v1/sales"
PORTAL = "/api/v1/portal"


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _create_quote(client: AsyncClient, headers: dict) -> dict:
    resp = await client.post(f"{SALES}/quotes", headers=headers, json={
        "title": "Integration Test Quote",
        "currency": "USD",
        "tax_rate": 0.0,
        "discount_amount": 0.0,
        "lines": [
            {
                "description": "Service A",
                "quantity": 1,
                "unit_price": 500.0,
                "discount_percent": 0.0,
                "line_order": 1,
            },
            {
                "description": "Service B",
                "quantity": 2,
                "unit_price": 150.0,
                "discount_percent": 0.0,
                "line_order": 2,
            },
        ],
    })
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _create_session(
    client: AsyncClient, headers: dict, quote_id: str, **kwargs
) -> dict:
    resp = await client.post(f"{PORTAL}/sessions", headers=headers, json={
        "quote_id": quote_id,
        **kwargs,
    })
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── Tests ─────────────────────────────────────────────────────────────────────

async def test_full_portal_wedge_quote_accept(
    client: AsyncClient, auth_headers: dict
):
    """Full flow: create quote → portal session → customer views → accepts → order
    visible via token AND via internal Sales API."""

    # 1. Create a quote with 2 line items
    quote = await _create_quote(client, auth_headers)
    quote_id = quote["id"]
    assert quote["status"] == "draft"
    assert len(quote["lines"]) == 2

    # 2. Create portal session for that quote
    session = await _create_session(
        client, auth_headers, quote_id,
        client_name="Carlos Cliente",
        client_email="carlos@cliente.example.com",
    )
    token = session["token"]
    assert token
    assert "portal_url" in session

    # 3. Customer GETs the quote via token (no auth) → 200, check quote fields
    view_resp = await client.get(f"{PORTAL}/quote/{token}")
    assert view_resp.status_code == 200, view_resp.text
    view = view_resp.json()
    assert view["quote_number"].startswith("Q-")
    assert view["title"] == "Integration Test Quote"
    assert view["currency"] == "USD"
    assert len(view["lines"]) == 2
    assert view["total"] == 800.0          # 1×500 + 2×150
    assert view["can_accept"] is True
    assert view["already_acted"] is False

    # 4. Customer POSTs accept (no auth) → 200, success=True, order_number present
    accept_resp = await client.post(f"{PORTAL}/quote/{token}/accept", json={
        "client_name": "Carlos Cliente",
        "client_email": "carlos@cliente.example.com",
        "client_notes": "Please deliver ASAP",
    })
    assert accept_resp.status_code == 200, accept_resp.text
    accept_data = accept_resp.json()
    assert accept_data["success"] is True
    assert accept_data["action"] == "accepted"
    order_number = accept_data["order_number"]
    assert order_number is not None
    assert order_number.startswith("SO-")

    # 5. Customer GETs order status via token → 200, check order_number
    order_resp = await client.get(f"{PORTAL}/order/{token}")
    assert order_resp.status_code == 200, order_resp.text
    order_view = order_resp.json()
    assert order_view["order_number"] == order_number
    assert order_view["status"] == "confirmed"
    assert order_view["total"] == 800.0
    assert order_view["currency"] == "USD"

    # 6. Internal user GETs the sales order by id via Sales API → 200
    # Find the order id by listing orders filtered to our quote
    orders_resp = await client.get(f"{SALES}/orders", headers=auth_headers)
    assert orders_resp.status_code == 200, orders_resp.text
    orders = orders_resp.json()
    matching = [o for o in orders if o["order_number"] == order_number]
    assert len(matching) == 1, f"Expected 1 order with number {order_number}, got {matching}"
    order_id = matching[0]["id"]

    detail_resp = await client.get(f"{SALES}/orders/{order_id}", headers=auth_headers)
    assert detail_resp.status_code == 200, detail_resp.text
    detail = detail_resp.json()
    assert detail["order_number"] == order_number
    assert detail["status"] in ("confirmed", "pending")
    assert detail["quote_id"] == quote_id


async def test_portal_reject_flow(client: AsyncClient, auth_headers: dict):
    """Reject flow: create quote → session → customer rejects with reason
    → subsequent GET shows already_acted=True, action='rejected'."""

    quote = await _create_quote(client, auth_headers)
    session = await _create_session(client, auth_headers, quote["id"])
    token = session["token"]

    # Customer rejects with a reason
    reject_resp = await client.post(
        f"{PORTAL}/quote/{token}/reject",
        json={"reason": "Price too high"},
    )
    assert reject_resp.status_code == 200, reject_resp.text
    reject_data = reject_resp.json()
    assert reject_data["success"] is True
    assert reject_data["action"] == "rejected"

    # GET /portal/quote/{token} → already_acted=True, can_accept=False
    view_resp = await client.get(f"{PORTAL}/quote/{token}")
    assert view_resp.status_code == 200, view_resp.text
    view = view_resp.json()
    assert view["already_acted"] is True
    assert view["can_accept"] is False


async def test_portal_session_accessed_at_stamped_on_view(
    client: AsyncClient, auth_headers: dict
):
    """First GET /portal/quote/{token} stamps accessed_at; visible via internal
    GET /portal/sessions?quote_id=... list."""

    quote = await _create_quote(client, auth_headers)
    session_data = await _create_session(client, auth_headers, quote["id"])
    token = session_data["token"]
    quote_id = quote["id"]

    # Before first view: accessed_at must be None in the session listing
    pre_list = (
        await client.get(f"{PORTAL}/sessions?quote_id={quote_id}", headers=auth_headers)
    ).json()
    assert len(pre_list) == 1
    assert pre_list[0]["accessed_at"] is None

    # Customer views the quote
    view_resp = await client.get(f"{PORTAL}/quote/{token}")
    assert view_resp.status_code == 200, view_resp.text

    # After first view: accessed_at must not be None
    post_list = (
        await client.get(f"{PORTAL}/sessions?quote_id={quote_id}", headers=auth_headers)
    ).json()
    assert len(post_list) == 1
    assert post_list[0]["accessed_at"] is not None


async def test_portal_session_custom_expire_hours(
    client: AsyncClient, auth_headers: dict
):
    """Session created with expire_hours=1 should have expires_at ~1 hour from now."""

    quote = await _create_quote(client, auth_headers)
    before = datetime.now(timezone.utc)
    session = await _create_session(
        client, auth_headers, quote["id"],
        expire_hours=1,
    )
    after = datetime.now(timezone.utc)

    expires_at_str = session["expires_at"]
    # Handle both aware (Z / +00:00) and naive datetimes from response
    if expires_at_str.endswith("Z"):
        expires_at_str = expires_at_str[:-1] + "+00:00"
    expires_at = datetime.fromisoformat(expires_at_str)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    expected_low  = before + timedelta(hours=1) - timedelta(minutes=5)
    expected_high = after  + timedelta(hours=1) + timedelta(minutes=5)
    assert expected_low <= expires_at <= expected_high, (
        f"expires_at={expires_at} not within 5-min window of 1h from now"
    )


async def test_portal_send_email_requires_client_email(
    client: AsyncClient, auth_headers: dict
):
    """POST /portal/sessions/{id}/send-email → 422 when session has no client_email."""

    quote = await _create_quote(client, auth_headers)
    # Create session WITHOUT a client_email
    session = await _create_session(client, auth_headers, quote["id"])
    session_id = session["id"]

    resp = await client.post(
        f"{PORTAL}/sessions/{session_id}/send-email",
        headers=auth_headers,
    )
    assert resp.status_code == 422, resp.text
