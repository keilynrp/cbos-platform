"""
Accounting module contract tests.
Covers: auth guards, invoice lifecycle, payment recording,
workspace isolation, and summary shape.
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

BASE = "/api/v1/accounting"
AUTH_BASE = "/api/v1/auth"


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _create_invoice(client: AsyncClient, headers: dict, *, lines=None) -> dict:
    if lines is None:
        lines = [{"description": "Service fee", "quantity": 2.0, "unit_price": 100.0}]
    resp = await client.post(f"{BASE}/invoices", headers=headers, json={
        "issue_date": "2026-04-03",
        "lines": lines,
    })
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _get_second_auth_headers(client: AsyncClient) -> dict:
    """Register a second isolated user/workspace and return auth headers."""
    resp = await client.post(f"{AUTH_BASE}/register", json={
        "full_name": "WS2 Accounting",
        "email": "workspace2_accounting@test.com",
        "password": "Password123!",
        "workspace_name": "Workspace Two Acct",
        "workspace_slug": "workspace-two-acct",
    })
    assert resp.status_code in (200, 201), resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ── Auth guards ───────────────────────────────────────────────────────────────

async def test_invoices_list_requires_auth(client: AsyncClient):
    resp = await client.get(f"{BASE}/invoices")
    assert resp.status_code == 401


async def test_invoices_create_requires_auth(client: AsyncClient):
    resp = await client.post(f"{BASE}/invoices", json={"issue_date": "2026-04-03", "lines": []})
    assert resp.status_code == 401


async def test_invoice_get_requires_auth(client: AsyncClient):
    resp = await client.get(f"{BASE}/invoices/any-id")
    assert resp.status_code == 401


async def test_invoice_update_requires_auth(client: AsyncClient):
    resp = await client.patch(f"{BASE}/invoices/any-id", json={"status": "sent"})
    assert resp.status_code == 401


async def test_invoice_delete_requires_auth(client: AsyncClient):
    resp = await client.delete(f"{BASE}/invoices/any-id")
    assert resp.status_code == 401


async def test_payments_list_requires_auth(client: AsyncClient):
    resp = await client.get(f"{BASE}/invoices/any-id/payments")
    assert resp.status_code == 401


async def test_payments_create_requires_auth(client: AsyncClient):
    resp = await client.post(f"{BASE}/invoices/any-id/payments", json={
        "amount": 50.0,
        "payment_date": "2026-04-03",
    })
    assert resp.status_code == 401


async def test_summary_requires_auth(client: AsyncClient):
    resp = await client.get(f"{BASE}/summary")
    assert resp.status_code == 401


# ── Workspace isolation ───────────────────────────────────────────────────────

async def test_invoice_not_visible_across_workspaces(client: AsyncClient, auth_headers: dict):
    ws2_headers = await _get_second_auth_headers(client)

    # Create invoice in workspace 1
    invoice = await _create_invoice(client, auth_headers)

    # Workspace 2 cannot see it
    resp = await client.get(f"{BASE}/invoices", headers=ws2_headers)
    assert resp.status_code == 200
    ids = [inv["id"] for inv in resp.json()]
    assert invoice["id"] not in ids


# ── Invoice lifecycle ─────────────────────────────────────────────────────────

async def test_create_invoice_returns_201(client: AsyncClient, auth_headers: dict):
    invoice = await _create_invoice(client, auth_headers, lines=[
        {"description": "Consulting", "quantity": 3.0, "unit_price": 200.0},
        {"description": "Support", "quantity": 1.0, "unit_price": 50.0},
    ])
    assert "id" in invoice
    assert "invoice_number" in invoice
    assert "total" in invoice
    assert invoice["invoice_number"].startswith("INV-")
    assert invoice["total"] > 0


async def test_get_invoice_by_id(client: AsyncClient, auth_headers: dict):
    invoice = await _create_invoice(client, auth_headers)
    resp = await client.get(f"{BASE}/invoices/{invoice['id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == invoice["id"]


async def test_get_invoice_not_found_returns_404(client: AsyncClient, auth_headers: dict):
    resp = await client.get(f"{BASE}/invoices/nonexistent-id", headers=auth_headers)
    assert resp.status_code == 404


async def test_list_invoices_returns_created(client: AsyncClient, auth_headers: dict):
    invoice = await _create_invoice(client, auth_headers)
    resp = await client.get(f"{BASE}/invoices", headers=auth_headers)
    assert resp.status_code == 200
    ids = [inv["id"] for inv in resp.json()]
    assert invoice["id"] in ids


async def test_update_invoice_status_to_sent(client: AsyncClient, auth_headers: dict):
    invoice = await _create_invoice(client, auth_headers)
    resp = await client.patch(
        f"{BASE}/invoices/{invoice['id']}",
        headers=auth_headers,
        json={"status": "sent"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "sent"


async def test_delete_draft_invoice(client: AsyncClient, auth_headers: dict):
    invoice = await _create_invoice(client, auth_headers)
    assert invoice["status"] == "draft"
    resp = await client.delete(f"{BASE}/invoices/{invoice['id']}", headers=auth_headers)
    assert resp.status_code == 204


async def test_delete_paid_invoice_rejected(client: AsyncClient, auth_headers: dict):
    invoice = await _create_invoice(client, auth_headers)

    # Pay in full to move status to "paid"
    await client.post(
        f"{BASE}/invoices/{invoice['id']}/payments",
        headers=auth_headers,
        json={
            "amount": invoice["total"],
            "payment_date": "2026-04-03",
        },
    )

    # Attempt to delete paid invoice → 409
    resp = await client.delete(f"{BASE}/invoices/{invoice['id']}", headers=auth_headers)
    assert resp.status_code == 409, resp.text


# ── Payment recording ─────────────────────────────────────────────────────────

async def test_partial_payment_sets_partial_status(client: AsyncClient, auth_headers: dict):
    invoice = await _create_invoice(client, auth_headers)
    half = invoice["total"] / 2

    resp = await client.post(
        f"{BASE}/invoices/{invoice['id']}/payments",
        headers=auth_headers,
        json={
            "amount": half,
            "payment_date": "2026-04-03",
        },
    )
    assert resp.status_code == 201, resp.text

    # Check invoice status is now "partial"
    inv_resp = await client.get(f"{BASE}/invoices/{invoice['id']}", headers=auth_headers)
    assert inv_resp.json()["status"] == "partial"


async def test_full_payment_sets_paid_status(client: AsyncClient, auth_headers: dict):
    invoice = await _create_invoice(client, auth_headers)

    resp = await client.post(
        f"{BASE}/invoices/{invoice['id']}/payments",
        headers=auth_headers,
        json={
            "amount": invoice["total"],
            "payment_date": "2026-04-03",
        },
    )
    assert resp.status_code == 201, resp.text

    # Check invoice status is now "paid"
    inv_resp = await client.get(f"{BASE}/invoices/{invoice['id']}", headers=auth_headers)
    assert inv_resp.json()["status"] == "paid"


async def test_overpayment_returns_422(client: AsyncClient, auth_headers: dict):
    invoice = await _create_invoice(client, auth_headers)
    overpay = invoice["total"] + 100.0

    resp = await client.post(
        f"{BASE}/invoices/{invoice['id']}/payments",
        headers=auth_headers,
        json={
            "amount": overpay,
            "payment_date": "2026-04-03",
        },
    )
    # Service raises 400 for overpayment
    assert resp.status_code in (400, 422), resp.text


async def test_list_payments_returns_recorded(client: AsyncClient, auth_headers: dict):
    invoice = await _create_invoice(client, auth_headers)

    pay_resp = await client.post(
        f"{BASE}/invoices/{invoice['id']}/payments",
        headers=auth_headers,
        json={
            "amount": 50.0,
            "payment_date": "2026-04-03",
        },
    )
    assert pay_resp.status_code == 201, pay_resp.text
    payment_id = pay_resp.json()["id"]

    resp = await client.get(f"{BASE}/invoices/{invoice['id']}/payments", headers=auth_headers)
    assert resp.status_code == 200
    ids = [p["id"] for p in resp.json()]
    assert payment_id in ids


# ── Summary ───────────────────────────────────────────────────────────────────

async def test_summary_returns_valid_shape(client: AsyncClient, auth_headers: dict):
    resp = await client.get(f"{BASE}/summary", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "total_invoiced" in data
    assert "total_paid" in data
    assert "total_outstanding" in data


# ── PDF download ──────────────────────────────────────────────────────────────

async def test_invoice_pdf_requires_auth(client: AsyncClient):
    resp = await client.get(f"{BASE}/invoices/any-id/pdf")
    assert resp.status_code == 401


async def test_invoice_pdf_not_found_returns_404(client: AsyncClient, auth_headers: dict):
    resp = await client.get(f"{BASE}/invoices/nonexistent-id/pdf", headers=auth_headers)
    assert resp.status_code == 404


async def test_invoice_pdf_returns_pdf_bytes(client: AsyncClient, auth_headers: dict):
    """Creating an invoice then downloading its PDF returns valid PDF content."""
    invoice = await _create_invoice(client, auth_headers, lines=[
        {"description": "Consultoría Q4", "quantity": 4.0, "unit_price": 200.0},
        {"description": "Soporte técnico mensual", "quantity": 1.0, "unit_price": 150.0},
    ])

    resp = await client.get(f"{BASE}/invoices/{invoice['id']}/pdf", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    assert resp.headers["content-type"] == "application/pdf"
    # PDF files start with %PDF
    assert resp.content[:4] == b"%PDF"
    assert len(resp.content) > 1024  # must be a real document, not empty


async def test_invoice_pdf_filename_matches_number(client: AsyncClient, auth_headers: dict):
    """Content-Disposition header must reference the invoice number."""
    invoice = await _create_invoice(client, auth_headers)
    resp = await client.get(f"{BASE}/invoices/{invoice['id']}/pdf", headers=auth_headers)
    assert resp.status_code == 200
    disposition = resp.headers.get("content-disposition", "")
    assert invoice["invoice_number"] in disposition


async def test_invoice_pdf_workspace_isolated(client: AsyncClient, auth_headers: dict):
    """WS2 cannot download an invoice that belongs to WS1."""
    invoice = await _create_invoice(client, auth_headers)

    ws2 = await _get_second_auth_headers(client)
    resp = await client.get(f"{BASE}/invoices/{invoice['id']}/pdf", headers=ws2)
    assert resp.status_code == 404
