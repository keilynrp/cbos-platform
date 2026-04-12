"""
E2E cross-module test: Sales → Accounting integration.
Covers the Accounting Tier 1 promotion path:
SalesOrder → Invoice → Payment → Paid status.
"""
import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

SALES_BASE = "/api/v1/sales"
ACCOUNTING_BASE = "/api/v1/accounting"


async def test_sales_order_to_invoice_to_payment(client: AsyncClient, auth_headers: dict):
    """
    Full cross-module flow:
    1. Create quote with 2 line items
    2. Accept quote → SalesOrder created (status "draft")
    3. Create Invoice linked to SalesOrder via sales_order_id
    4. Record partial payment → status "partial"
    5. Record remaining payment → status "paid"
    6. Verify accounting summary reflects the paid invoice
    """
    # Step 1: Create quote with 2 line items
    resp = await client.post(f"{SALES_BASE}/quotes", headers=auth_headers, json={
        "title": "E2E Accounting Test Quote",
        "currency": "USD",
        "tax_rate": 0.0,
        "discount_amount": 0.0,
        "lines": [
            {
                "description": "Consulting",
                "quantity": 2,
                "unit_price": 500.0,
                "discount_percent": 0.0,
                "line_order": 1,
            },
            {
                "description": "Setup fee",
                "quantity": 1,
                "unit_price": 200.0,
                "discount_percent": 0.0,
                "line_order": 2,
            },
        ],
    })
    assert resp.status_code == 201, resp.text
    quote = resp.json()
    assert quote["status"] == "draft"
    assert quote["total"] == 1200.0
    quote_id = quote["id"]

    # Step 2: Accept quote → SalesOrder created
    resp = await client.patch(
        f"{SALES_BASE}/quotes/{quote_id}/accept",
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text
    order = resp.json()
    assert order["status"] == "draft"
    assert order["total"] == 1200.0
    assert order["quote_id"] == quote_id
    order_id = order["id"]

    # Step 3: Create Invoice linked to SalesOrder
    resp = await client.post(f"{ACCOUNTING_BASE}/invoices", headers=auth_headers, json={
        "issue_date": "2026-04-11",
        "sales_order_id": order_id,
        "lines": [
            {"description": "Consulting", "quantity": 2.0, "unit_price": 500.0},
            {"description": "Setup fee", "quantity": 1.0, "unit_price": 200.0},
        ],
    })
    assert resp.status_code == 201, resp.text
    invoice = resp.json()
    assert invoice["total"] == 1200.0
    assert invoice["sales_order_id"] == order_id
    assert invoice["status"] == "draft"
    assert invoice["amount_paid"] == 0.0
    assert invoice["amount_due"] == 1200.0
    invoice_id = invoice["id"]

    # Step 4: Record partial payment (800 of 1200)
    resp = await client.post(
        f"{ACCOUNTING_BASE}/invoices/{invoice_id}/payments",
        headers=auth_headers,
        json={
            "amount": 800.0,
            "payment_date": "2026-04-11",
            "method": "transfer",
        },
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["amount"] == 800.0

    # Verify invoice is now "partial"
    resp = await client.get(f"{ACCOUNTING_BASE}/invoices/{invoice_id}", headers=auth_headers)
    assert resp.status_code == 200
    invoice_state = resp.json()
    assert invoice_state["status"] == "partial"
    assert invoice_state["amount_paid"] == 800.0
    assert invoice_state["amount_due"] == 400.0

    # Step 5: Record remaining payment (400)
    resp = await client.post(
        f"{ACCOUNTING_BASE}/invoices/{invoice_id}/payments",
        headers=auth_headers,
        json={
            "amount": 400.0,
            "payment_date": "2026-04-11",
            "method": "transfer",
        },
    )
    assert resp.status_code == 201, resp.text

    # Verify invoice is "paid"
    resp = await client.get(f"{ACCOUNTING_BASE}/invoices/{invoice_id}", headers=auth_headers)
    assert resp.status_code == 200
    invoice_final = resp.json()
    assert invoice_final["status"] == "paid"
    assert invoice_final["amount_paid"] == 1200.0
    assert invoice_final["amount_due"] == 0.0
    assert invoice_final["paid_at"] is not None

    # Step 6: Verify accounting summary reflects paid invoice
    resp = await client.get(f"{ACCOUNTING_BASE}/summary", headers=auth_headers)
    assert resp.status_code == 200
    summary = resp.json()
    assert "total_paid" in summary
    assert "total_invoiced" in summary
    assert "total_outstanding" in summary
    assert summary["total_paid"] >= 1200.0
