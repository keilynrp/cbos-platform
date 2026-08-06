"""
Portal module — contract tests.

Covers:
- Auth guards for internal (JWT-required) endpoints
- Public token-based endpoints: quote view, accept, reject, order status
- Token validation: not found, expired
- Idempotency: double accept / reject → already_acted
- First-access tracking (accessed_at)
- Full accept → order flow
- Session management helpers
"""
import re
import pytest
from datetime import datetime, timedelta, timezone

from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.portal.models import PortalSession

pytestmark = pytest.mark.asyncio

SALES  = "/api/v1/sales"
PORTAL = "/api/v1/portal"   # internal (JWT)
PUBLIC = "/api/v1/portal"   # public  (token in path, same prefix)


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _create_quote(client: AsyncClient, headers: dict, title: str = "Portal Quote") -> dict:
    resp = await client.post(f"{SALES}/quotes", headers=headers, json={
        "title": title,
        "currency": "USD",
        "tax_rate": 0.0,
        "discount_amount": 0.0,
        "lines": [
            {
                "description": "Widget Pro",
                "quantity": 2,
                "unit_price": 500.0,
                "discount_percent": 0.0,
                "line_order": 1,
            }
        ],
    })
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _create_product_quote(
    client: AsyncClient,
    headers: dict,
    product_id: str,
    title: str = "Portal Product Quote",
) -> dict:
    resp = await client.post(f"{SALES}/quotes", headers=headers, json={
        "title": title,
        "currency": "USD",
        "tax_rate": 0.0,
        "discount_amount": 0.0,
        "lines": [
            {
                "description": "Inventory-backed item",
                "quantity": 3,
                "unit_price": 250.0,
                "discount_percent": 0.0,
                "line_order": 1,
                "product_id": product_id,
            }
        ],
    })
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _create_session(
    client: AsyncClient,
    headers: dict,
    quote_id: str,
    client_name: str = "Ana García",
    client_email: str = "ana@cliente.example.com",
) -> dict:
    resp = await client.post(f"{PORTAL}/sessions", headers=headers, json={
        "quote_id": quote_id,
        "client_name": client_name,
        "client_email": client_email,
    })
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── Auth guards (internal endpoints) ─────────────────────────────────────────

async def test_create_session_requires_auth(client: AsyncClient):
    resp = await client.post(f"{PORTAL}/sessions", json={"quote_id": "fake"})
    assert resp.status_code == 401


async def test_list_sessions_requires_auth(client: AsyncClient):
    resp = await client.get(f"{PORTAL}/sessions")
    assert resp.status_code == 401


async def test_send_email_requires_auth(client: AsyncClient):
    resp = await client.post(f"{PORTAL}/sessions/fake-id/send-email")
    assert resp.status_code == 401


# ── Token validation ──────────────────────────────────────────────────────────

async def test_invalid_token_returns_404(client: AsyncClient):
    resp = await client.get(f"{PUBLIC}/quote/this-token-does-not-exist")
    assert resp.status_code == 404

    error = resp.json()["error"]
    assert error["code"] == "PORTAL_SESSION_NOT_FOUND"
    # El token es la credencial de acceso: no puede volver en el cuerpo, ni
    # siquiera "para depurar". Ver la regla 6 del registro de codigos.
    assert "detail" not in error
    assert "this-token-does-not-exist" not in resp.text


async def test_expired_token_returns_410(
    client: AsyncClient, auth_headers: dict, db: AsyncSession
):
    quote = await _create_quote(client, auth_headers)
    session = await _create_session(client, auth_headers, quote["id"])
    token = session["token"]

    # Force-expire the session via direct DB write
    await db.execute(
        update(PortalSession)
        .where(PortalSession.token == token)
        .values(expires_at=datetime.now(timezone.utc) - timedelta(hours=1))
    )
    await db.commit()

    resp = await client.get(f"{PUBLIC}/quote/{token}")
    assert resp.status_code == 410, resp.text

    error = resp.json()["error"]
    assert error["code"] == "PORTAL_LINK_EXPIRED"
    assert "expires_at" in error["detail"]
    assert token not in resp.text


# ── Quote view ────────────────────────────────────────────────────────────────

async def test_public_quote_view_returns_correct_fields(
    client: AsyncClient, auth_headers: dict
):
    quote = await _create_quote(client, auth_headers)
    session = await _create_session(client, auth_headers, quote["id"])
    token = session["token"]

    resp = await client.get(f"{PUBLIC}/quote/{token}")
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["quote_number"].startswith("Q-")
    assert data["title"] == "Portal Quote"
    assert data["total"] == 1000.0
    assert data["currency"] == "USD"
    assert len(data["lines"]) == 1
    assert data["lines"][0]["description"] == "Widget Pro"
    assert data["lines"][0]["quantity"] == 2.0
    assert data["can_accept"] is True
    assert data["already_acted"] is False


async def test_public_quote_marks_first_access(
    client: AsyncClient, auth_headers: dict, db: AsyncSession
):
    """First GET /portal/quote/{token} stamps accessed_at on the session."""
    quote = await _create_quote(client, auth_headers)
    session_data = await _create_session(client, auth_headers, quote["id"])
    token = session_data["token"]

    # accessed_at must be null before first visit
    row = (await db.execute(
        select(PortalSession).where(PortalSession.token == token)
    )).scalar_one()
    assert row.accessed_at is None

    await client.get(f"{PUBLIC}/quote/{token}")

    # refresh — use a new query to bypass any ORM identity cache
    await db.refresh(row)
    assert row.accessed_at is not None


# ── Accept flow ───────────────────────────────────────────────────────────────

async def test_accept_creates_order_and_returns_order_number(
    client: AsyncClient, auth_headers: dict
):
    quote = await _create_quote(client, auth_headers)
    session = await _create_session(client, auth_headers, quote["id"])
    token = session["token"]

    resp = await client.post(f"{PUBLIC}/quote/{token}/accept", json={
        "client_name": "Ana García",
        "client_email": "ana@cliente.example.com",
        "client_notes": "Entrega urgente",
    })
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["success"] is True
    assert data["action"] == "accepted"
    assert data["order_number"] is not None
    assert data["order_number"].startswith("SO-")


async def test_accept_reserves_inventory_through_sales_gateway(
    client: AsyncClient, auth_headers: dict
):
    from unittest.mock import patch

    category_resp = await client.post(
        "/api/v1/inventory/categories",
        headers=auth_headers,
        json={"name": "Portal Gateway Category", "slug": "portal-gateway-category"},
    )
    assert category_resp.status_code == 201, category_resp.text
    product_resp = await client.post(
        "/api/v1/inventory/products",
        headers=auth_headers,
        json={
            "sku": "PORTAL-GW-001",
            "name": "Portal Gateway Product",
            "product_type": "physical",
            "category_id": category_resp.json()["id"],
            "track_inventory": True,
            "price": 250.0,
        },
    )
    assert product_resp.status_code == 201, product_resp.text
    product_id = product_resp.json()["id"]

    quote = await _create_product_quote(client, auth_headers, product_id)
    session = await _create_session(client, auth_headers, quote["id"])
    token = session["token"]
    gateway_calls = []

    async def capture_gateway(db, workspace_id, actor_id, order_id, lines):
        gateway_calls.append({
            "workspace_id": workspace_id,
            "actor_id": actor_id,
            "order_id": order_id,
            "lines": lines,
        })
        return {"reserved": [product_id], "failed": [], "partial": False}

    with patch(
        "app.modules.sales.inventory_gateway.reserve_for_order",
        side_effect=capture_gateway,
    ):
        resp = await client.post(f"{PUBLIC}/quote/{token}/accept", json={})

    assert resp.status_code == 200, resp.text
    assert len(gateway_calls) == 1
    assert gateway_calls[0]["order_id"]
    assert gateway_calls[0]["lines"] == [{"product_id": product_id, "quantity": 3.0}]


async def test_accept_sets_already_acted_flag(
    client: AsyncClient, auth_headers: dict
):
    quote = await _create_quote(client, auth_headers)
    session = await _create_session(client, auth_headers, quote["id"])
    token = session["token"]

    await client.post(f"{PUBLIC}/quote/{token}/accept", json={})

    view = (await client.get(f"{PUBLIC}/quote/{token}")).json()
    assert view["already_acted"] is True
    assert view["can_accept"] is False


async def test_accept_idempotent_second_call_returns_already_acted(
    client: AsyncClient, auth_headers: dict
):
    quote = await _create_quote(client, auth_headers)
    session = await _create_session(client, auth_headers, quote["id"])
    token = session["token"]

    first = (await client.post(f"{PUBLIC}/quote/{token}/accept", json={})).json()
    assert first["success"] is True

    second = (await client.post(f"{PUBLIC}/quote/{token}/accept", json={})).json()
    assert second["success"] is False
    assert second["action"] == "accepted"  # still accepted, not a new action


# ── Order status via token ────────────────────────────────────────────────────

async def test_get_order_via_token_after_accept(
    client: AsyncClient, auth_headers: dict
):
    quote = await _create_quote(client, auth_headers)
    session = await _create_session(client, auth_headers, quote["id"])
    token = session["token"]

    await client.post(f"{PUBLIC}/quote/{token}/accept", json={})

    resp = await client.get(f"{PUBLIC}/order/{token}")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["order_number"].startswith("SO-")
    assert data["status"] == "confirmed"
    assert data["total"] == 1000.0
    assert data["currency"] == "USD"
    assert data["confirmed_at"] is not None


async def test_get_order_before_accept_returns_404(
    client: AsyncClient, auth_headers: dict
):
    quote = await _create_quote(client, auth_headers)
    session = await _create_session(client, auth_headers, quote["id"])
    token = session["token"]

    resp = await client.get(f"{PUBLIC}/order/{token}")
    assert resp.status_code == 404, resp.text


# ── Reject flow ───────────────────────────────────────────────────────────────

async def test_reject_quote_via_portal(
    client: AsyncClient, auth_headers: dict
):
    quote = await _create_quote(client, auth_headers)
    session = await _create_session(client, auth_headers, quote["id"])
    token = session["token"]

    resp = await client.post(f"{PUBLIC}/quote/{token}/reject", json={
        "reason": "Precio fuera de presupuesto",
    })
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["success"] is True
    assert data["action"] == "rejected"


async def test_reject_then_accept_returns_already_acted(
    client: AsyncClient, auth_headers: dict
):
    quote = await _create_quote(client, auth_headers)
    session = await _create_session(client, auth_headers, quote["id"])
    token = session["token"]

    await client.post(f"{PUBLIC}/quote/{token}/reject", json={})

    resp = await client.post(f"{PUBLIC}/quote/{token}/accept", json={})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["success"] is False
    assert data["action"] == "rejected"   # action remains the first one


# ── Session management (internal) ─────────────────────────────────────────────

async def test_create_session_returns_portal_url_with_token(
    client: AsyncClient, auth_headers: dict
):
    quote = await _create_quote(client, auth_headers)
    session = await _create_session(client, auth_headers, quote["id"])
    assert "portal_url" in session
    assert session["token"] in session["portal_url"]


async def test_list_sessions_filtered_by_quote(
    client: AsyncClient, auth_headers: dict
):
    quote_a = await _create_quote(client, auth_headers, title="Quote A")
    quote_b = await _create_quote(client, auth_headers, title="Quote B")
    await _create_session(client, auth_headers, quote_a["id"])
    await _create_session(client, auth_headers, quote_b["id"])

    resp = await client.get(
        f"{PORTAL}/sessions?quote_id={quote_a['id']}", headers=auth_headers
    )
    assert resp.status_code == 200, resp.text
    sessions = resp.json()
    assert len(sessions) == 1
    assert sessions[0]["quote_id"] == quote_a["id"]


async def test_cannot_create_session_for_accepted_quote(
    client: AsyncClient, auth_headers: dict
):
    """Sessions can only be created for draft/sent quotes, not already-accepted ones."""
    quote = await _create_quote(client, auth_headers)
    # Accept the quote via internal Sales API
    await client.patch(f"{SALES}/quotes/{quote['id']}/accept", headers=auth_headers)

    resp = await client.post(f"{PORTAL}/sessions", headers=auth_headers, json={
        "quote_id": quote["id"],
    })
    assert resp.status_code == 409, resp.text


# ── Event emission ────────────────────────────────────────────────────────────

async def test_create_session_emits_portal_session_created_event(
    client: AsyncClient, auth_headers: dict
):
    """PortalSessionCreated event is published when a portal session is created."""
    from unittest.mock import AsyncMock, patch

    # Create quote first
    quote_resp = await client.post("/api/v1/sales/quotes", headers=auth_headers, json={
        "title": "Event Test Quote",
        "lines": [{"description": "Item", "quantity": 1, "unit_price": 100.0}],
    })
    assert quote_resp.status_code == 201, quote_resp.text
    quote_id = quote_resp.json()["id"]

    published_events = []

    async def capture_event(event):
        published_events.append(event)

    with patch("app.modules.portal.service.publish_event", side_effect=capture_event):
        resp = await client.post("/api/v1/portal/sessions", headers=auth_headers, json={
            "quote_id": quote_id,
        })
        assert resp.status_code == 201, resp.text

    portal_events = [e for e in published_events if e.event_type == "PortalSessionCreated"]
    assert len(portal_events) == 1
    assert portal_events[0].payload["quote_id"] == quote_id


# ── Email notifications ───────────────────────────────────────────────────────

async def test_accept_sends_seller_notification(
    client: AsyncClient, auth_headers: dict
):
    """portal_accept calls send_email with seller notification after commit."""
    from unittest.mock import patch

    quote = await _create_quote(client, auth_headers)
    session = await _create_session(
        client, auth_headers, quote["id"],
        client_email="buyer@example.com",
    )
    token = session["token"]

    sent_calls: list[tuple] = []

    async def capture(*args, **kwargs):
        sent_calls.append(args)
        return True

    with patch("app.modules.portal.service.send_email", side_effect=capture):
        resp = await client.post(f"{PUBLIC}/quote/{token}/accept", json={
            "client_name": "Ana García",
        })
    assert resp.status_code == 200, resp.text

    # At least one email call: seller notification
    assert len(sent_calls) >= 1
    seller_call = sent_calls[0]
    assert re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", seller_call[0]), f"Not a valid email: {seller_call[0]}"
    assert quote["quote_number"] in seller_call[1], f"Quote number not in subject: {seller_call[1]}"


async def test_reject_sends_seller_notification(
    client: AsyncClient, auth_headers: dict
):
    """portal_reject calls send_email with seller notification after commit."""
    from unittest.mock import patch

    quote = await _create_quote(client, auth_headers)
    session = await _create_session(client, auth_headers, quote["id"])
    token = session["token"]

    sent_calls: list[tuple] = []

    async def capture(*args, **kwargs):
        sent_calls.append(args)
        return True

    with patch("app.modules.portal.service.send_email", side_effect=capture):
        resp = await client.post(f"{PUBLIC}/quote/{token}/reject", json={
            "reason": "Precio muy alto",
        })
    assert resp.status_code == 200, resp.text

    assert len(sent_calls) >= 1
    seller_call = sent_calls[0]
    assert re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", seller_call[0]), f"Not a valid email: {seller_call[0]}"
    assert quote["quote_number"] in seller_call[1], f"Quote number not in subject: {seller_call[1]}"


async def test_accept_sends_only_seller_email_when_no_client_email(
    client: AsyncClient, auth_headers: dict
):
    """portal_accept skips client confirmation when session.client_email is None."""
    from unittest.mock import patch

    quote = await _create_quote(client, auth_headers)
    # Create session with NO client email
    resp = await client.post(f"{PORTAL}/sessions", headers=auth_headers, json={
        "quote_id": quote["id"],
    })
    assert resp.status_code == 201
    token = resp.json()["token"]

    sent_calls: list[tuple] = []

    async def capture(*args, **kwargs):
        sent_calls.append(args)
        return True

    with patch("app.modules.portal.service.send_email", side_effect=capture):
        resp = await client.post(f"{PUBLIC}/quote/{token}/accept", json={})
    assert resp.status_code == 200, resp.text

    # Only seller email (1 call), no client confirmation
    assert len(sent_calls) == 1, f"Expected 1 email (seller only), got {len(sent_calls)}"
