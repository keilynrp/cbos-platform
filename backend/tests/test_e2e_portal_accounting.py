"""
E2E cross-module test: Portal → Sales → Accounting (Q3 backlog item 3.3).

Covers the full commercial close initiated by a customer action:
  Quote → Portal session → Customer accepts (token, no auth) →
  SalesOrder confirmed → Invoice created → Payment recorded → Paid.

This is the most complete single scenario in the test suite — it exercises
five modules in a single flow: Sales, Portal, (CRM implicit), Accounting,
and the Inventory gateway for order confirmation.

Note: Invoice creation from SalesOrder is explicit (via API) — auto-invoice
on fulfillment via event consumer is a Phase 6 backlog item (ADR 0010).
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

SALES      = "/api/v1/sales"
PORTAL     = "/api/v1/portal"
ACCOUNTING = "/api/v1/accounting"


async def test_portal_accept_to_invoice_paid(client: AsyncClient, auth_headers: dict):
    """
    Full end-to-end commercial close via Portal:
    1.  Sales rep creates quote (2 line items, total 900 USD)
    2.  Sales rep creates portal session for the quote
    3.  Customer GETs the quote via public token → can_accept=True
    4.  Customer POSTs accept via public token → SalesOrder created
    5.  Sales rep retrieves the SalesOrder via internal API
    6.  Accounting: invoice created linked to the SalesOrder
    7.  Invoice marked "sent"
    8.  Customer payment recorded (partial → then remainder)
    9.  Invoice status transitions: draft → sent → partial → paid
    10. Accounting summary reflects the closed deal
    """

    # ── Step 1: Create quote ──────────────────────────────────────────────────
    resp = await client.post(f"{SALES}/quotes", headers=auth_headers, json={
        "title": "Portal E2E Accounting Quote",
        "currency": "USD",
        "tax_rate": 0.0,
        "discount_amount": 0.0,
        "lines": [
            {
                "description": "Platform license",
                "quantity": 1,
                "unit_price": 600.0,
                "discount_percent": 0.0,
                "line_order": 1,
            },
            {
                "description": "Onboarding",
                "quantity": 3,
                "unit_price": 100.0,
                "discount_percent": 0.0,
                "line_order": 2,
            },
        ],
    })
    assert resp.status_code == 201, resp.text
    quote = resp.json()
    assert quote["status"] == "draft"
    assert quote["total"] == 900.0
    quote_id = quote["id"]

    # ── Step 2: Create portal session ─────────────────────────────────────────
    resp = await client.post(f"{PORTAL}/sessions", headers=auth_headers, json={
        "quote_id": quote_id,
        "client_name": "Ana Accountable",
        "client_email": "ana@empresa.example.com",
        "expire_hours": 72,
    })
    assert resp.status_code == 201, resp.text
    session = resp.json()
    token = session["token"]
    assert token
    assert "portal_url" in session

    # ── Step 3: Customer views the quote (no auth, public token) ──────────────
    resp = await client.get(f"{PORTAL}/quote/{token}")
    assert resp.status_code == 200, resp.text
    view = resp.json()
    assert view["title"] == "Portal E2E Accounting Quote"
    assert view["total"] == 900.0
    assert len(view["lines"]) == 2
    assert view["can_accept"] is True
    assert view["already_acted"] is False

    # ── Step 4: Customer accepts (no auth, public token) ─────────────────────
    resp = await client.post(f"{PORTAL}/quote/{token}/accept", json={
        "client_name": "Ana Accountable",
        "client_email": "ana@empresa.example.com",
        "client_notes": "Ready to proceed, please invoice us.",
    })
    assert resp.status_code == 200, resp.text
    accept = resp.json()
    assert accept["success"] is True
    assert accept["action"] == "accepted"
    order_number = accept["order_number"]
    assert order_number.startswith("SO-")

    # Token is now consumed — subsequent accept must be blocked (200 + success=False)
    resp2 = await client.post(f"{PORTAL}/quote/{token}/accept", json={
        "client_name": "Ana Accountable",
        "client_email": "ana@empresa.example.com",
    })
    assert resp2.status_code == 200, resp2.text
    guard = resp2.json()
    assert guard["success"] is False, f"Expected success=False on double-accept: {guard}"
    assert guard["order_number"] is None

    # ── Step 5: Sales rep retrieves SalesOrder via internal API ───────────────
    resp = await client.get(f"{SALES}/orders", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    orders = resp.json()
    matching = [o for o in orders if o["order_number"] == order_number]
    assert len(matching) == 1, f"SalesOrder {order_number} not found: {orders}"
    order = matching[0]
    order_id = order["id"]
    assert order["total"] == 900.0
    assert order["quote_id"] == quote_id

    # Portal order view also works
    resp = await client.get(f"{PORTAL}/order/{token}")
    assert resp.status_code == 200, resp.text
    portal_order = resp.json()
    assert portal_order["order_number"] == order_number
    assert portal_order["total"] == 900.0

    # ── Step 6: Create invoice linked to SalesOrder ───────────────────────────
    resp = await client.post(f"{ACCOUNTING}/invoices", headers=auth_headers, json={
        "issue_date": "2026-04-11",
        "due_date":   "2026-05-11",
        "sales_order_id": order_id,
        "lines": [
            {"description": "Platform license", "quantity": 1.0, "unit_price": 600.0},
            {"description": "Onboarding",       "quantity": 3.0, "unit_price": 100.0},
        ],
    })
    assert resp.status_code == 201, resp.text
    invoice = resp.json()
    assert invoice["total"]          == 900.0
    assert invoice["amount_due"]     == 900.0
    assert invoice["amount_paid"]    == 0.0
    assert invoice["status"]         == "draft"
    assert invoice["sales_order_id"] == order_id
    invoice_id = invoice["id"]

    # ── Step 7: Mark invoice as sent (PATCH with status transition) ──────────
    resp = await client.patch(
        f"{ACCOUNTING}/invoices/{invoice_id}",
        headers=auth_headers,
        json={"status": "sent"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "sent"

    # ── Step 8a: Partial payment (500 of 900) ─────────────────────────────────
    resp = await client.post(
        f"{ACCOUNTING}/invoices/{invoice_id}/payments",
        headers=auth_headers,
        json={
            "amount": 500.0,
            "payment_date": "2026-04-15",
            "method": "transfer",
            "reference": "TRF-001",
        },
    )
    assert resp.status_code == 201, resp.text
    payment1 = resp.json()
    assert payment1["amount"] == 500.0

    # Invoice should be "partial"
    resp = await client.get(f"{ACCOUNTING}/invoices/{invoice_id}", headers=auth_headers)
    assert resp.status_code == 200
    inv_partial = resp.json()
    assert inv_partial["status"]      == "partial"
    assert inv_partial["amount_paid"] == 500.0
    assert inv_partial["amount_due"]  == 400.0

    # ── Step 8b: Remaining payment (400) ─────────────────────────────────────
    resp = await client.post(
        f"{ACCOUNTING}/invoices/{invoice_id}/payments",
        headers=auth_headers,
        json={
            "amount": 400.0,
            "payment_date": "2026-04-22",
            "method": "transfer",
            "reference": "TRF-002",
        },
    )
    assert resp.status_code == 201, resp.text

    # ── Step 9: Invoice fully paid ────────────────────────────────────────────
    resp = await client.get(f"{ACCOUNTING}/invoices/{invoice_id}", headers=auth_headers)
    assert resp.status_code == 200
    inv_paid = resp.json()
    assert inv_paid["status"]      == "paid"
    assert inv_paid["amount_paid"] == 900.0
    assert inv_paid["amount_due"]  == 0.0
    assert inv_paid["paid_at"]     is not None

    # ── Step 10: Accounting summary reflects the closed deal ──────────────────
    resp = await client.get(f"{ACCOUNTING}/summary", headers=auth_headers)
    assert resp.status_code == 200
    summary = resp.json()
    assert summary["total_paid"]        >= 900.0
    assert summary["total_invoiced"]    >= 900.0
    assert summary["total_outstanding"] >= 0.0


async def test_portal_reject_does_not_create_invoice_path(
    client: AsyncClient, auth_headers: dict
):
    """When the customer rejects via Portal, no SalesOrder is created —
    so there is no invoice to raise. Verifies the rejection path is clean."""

    # Create quote + session
    resp = await client.post(f"{SALES}/quotes", headers=auth_headers, json={
        "title": "Rejected Portal Quote",
        "currency": "USD",
        "tax_rate": 0.0,
        "discount_amount": 0.0,
        "lines": [{"description": "Item X", "quantity": 1, "unit_price": 250.0,
                   "discount_percent": 0.0, "line_order": 1}],
    })
    assert resp.status_code == 201, resp.text
    quote_id = resp.json()["id"]

    resp = await client.post(f"{PORTAL}/sessions", headers=auth_headers, json={
        "quote_id": quote_id,
        "client_name": "Prospecto Indeciso",
    })
    assert resp.status_code == 201, resp.text
    token = resp.json()["token"]

    # Customer rejects
    resp = await client.post(f"{PORTAL}/quote/{token}/reject",
                             json={"reason": "Budget frozen"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["action"] == "rejected"

    # No orders exist for this quote
    resp = await client.get(f"{SALES}/orders", headers=auth_headers)
    assert resp.status_code == 200
    orders = [o for o in resp.json() if o["quote_id"] == quote_id]
    assert len(orders) == 0, f"Unexpected order after rejection: {orders}"

    # Invoice list has no invoice for this quote's orders (trivially true — no orders)
    resp = await client.get(f"{ACCOUNTING}/invoices", headers=auth_headers)
    assert resp.status_code == 200
    invoices = [i for i in resp.json() if i.get("sales_order_id") is None or
                any(i.get("sales_order_id") == o["id"] for o in orders)]
    # orders is empty so no cross-match possible; just assert list endpoint is healthy
    assert isinstance(invoices, list)
