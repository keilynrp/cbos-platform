"""
Accounting module integration tests.
Covers: multi-payment flow, tax/discount calculations, status filter,
summary state, and workspace isolation.

Not duplicating contract tests (auth guards, basic lifecycle, single-payment
happy path, overpayment rejection, list_payments shape, summary shape).
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

BASE = "/api/v1/accounting"
AUTH_BASE = "/api/v1/auth"


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _create_invoice(
    client: AsyncClient,
    headers: dict,
    *,
    lines=None,
    tax_rate: float = 0.0,
    discount_amount: float = 0.0,
) -> dict:
    if lines is None:
        lines = [{"description": "Service fee", "quantity": 2.0, "unit_price": 100.0}]
    resp = await client.post(
        f"{BASE}/invoices",
        headers=headers,
        json={
            "issue_date": "2026-04-11",
            "lines": lines,
            "tax_rate": tax_rate,
            "discount_amount": discount_amount,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _record_payment(
    client: AsyncClient,
    headers: dict,
    invoice_id: str,
    amount: float,
) -> dict:
    resp = await client.post(
        f"{BASE}/invoices/{invoice_id}/payments",
        headers=headers,
        json={"amount": amount, "payment_date": "2026-04-11"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _get_second_workspace_headers(client: AsyncClient) -> dict:
    """Register an isolated second user/workspace and return auth headers."""
    resp = await client.post(
        f"{AUTH_BASE}/register",
        json={
            "full_name": "WS2 Integration",
            "email": "ws2_integration@test.com",
            "password": "Password123!",
            "workspace_name": "Workspace Two Integration",
            "workspace_slug": "ws2-integration",
        },
    )
    assert resp.status_code in (200, 201), resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ── 1. Multi-payment invoice flow ─────────────────────────────────────────────

async def test_invoice_reaches_paid_via_multiple_partial_payments(
    client: AsyncClient, auth_headers: dict
):
    """Two partial payments sum to the invoice total → status becomes 'paid'."""
    # Create invoice: 1 line, qty=5, price=100 → total=500
    invoice = await _create_invoice(
        client,
        auth_headers,
        lines=[{"description": "Consulting", "quantity": 5.0, "unit_price": 100.0}],
    )
    invoice_id = invoice["id"]
    assert invoice["total"] == 500.0
    assert invoice["status"] == "draft"

    # Payment 1: 200 → partial
    await _record_payment(client, auth_headers, invoice_id, 200.0)

    inv_resp = await client.get(f"{BASE}/invoices/{invoice_id}", headers=auth_headers)
    assert inv_resp.status_code == 200
    inv = inv_resp.json()
    assert inv["status"] == "partial"
    assert inv["amount_paid"] == 200.0
    assert inv["amount_due"] == 300.0

    # Payment 2: 300 → paid
    await _record_payment(client, auth_headers, invoice_id, 300.0)

    inv_resp = await client.get(f"{BASE}/invoices/{invoice_id}", headers=auth_headers)
    assert inv_resp.status_code == 200
    inv = inv_resp.json()
    assert inv["status"] == "paid"
    assert inv["amount_due"] == 0.0
    assert inv["amount_paid"] == 500.0
    assert inv["paid_at"] is not None


# ── 2. Invoice with tax and discount calculations ─────────────────────────────

async def test_invoice_total_calculation_with_tax_and_discount(
    client: AsyncClient, auth_headers: dict
):
    """
    1 line: qty=2, unit_price=100 → line subtotal=200
    discount_amount=20  → subtotal after discount = 180
    tax_rate=10%        → tax_amount = 18   (10% of 180)
    total               = 198
    """
    invoice = await _create_invoice(
        client,
        auth_headers,
        lines=[{"description": "Widget", "quantity": 2.0, "unit_price": 100.0}],
        tax_rate=10.0,
        discount_amount=20.0,
    )
    invoice_id = invoice["id"]

    # Verify via GET to confirm persisted calculated fields
    resp = await client.get(f"{BASE}/invoices/{invoice_id}", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()

    # subtotal stored on invoice = raw_line_subtotal - discount_amount = 200 - 20 = 180
    assert data["subtotal"] == 180.0
    assert data["discount_amount"] == 20.0
    assert data["tax_rate"] == 10.0
    assert data["tax_amount"] == 18.0
    assert data["total"] == 198.0
    assert data["amount_due"] == 198.0


# ── 3. List invoices filtered by status ───────────────────────────────────────

async def test_list_invoices_status_filter(client: AsyncClient, auth_headers: dict):
    """Status query param correctly filters the invoice list."""
    # Create two draft invoices
    inv1 = await _create_invoice(client, auth_headers)
    inv2 = await _create_invoice(client, auth_headers)

    # Patch inv2 to "sent"
    patch_resp = await client.patch(
        f"{BASE}/invoices/{inv2['id']}",
        headers=auth_headers,
        json={"status": "sent"},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["status"] == "sent"

    # Filter by sent → only inv2
    sent_resp = await client.get(
        f"{BASE}/invoices?status=sent", headers=auth_headers
    )
    assert sent_resp.status_code == 200
    sent_ids = [i["id"] for i in sent_resp.json()]
    assert inv2["id"] in sent_ids
    assert inv1["id"] not in sent_ids

    # Filter by draft → inv1 present, inv2 absent
    draft_resp = await client.get(
        f"{BASE}/invoices?status=draft", headers=auth_headers
    )
    assert draft_resp.status_code == 200
    draft_ids = [i["id"] for i in draft_resp.json()]
    assert inv1["id"] in draft_ids
    assert inv2["id"] not in draft_ids


# ── 4. Summary reflects invoice state ────────────────────────────────────────

async def test_summary_updates_after_payment(client: AsyncClient, auth_headers: dict):
    """After full payment the summary shows total_paid > 0 and the invoice amount_due = 0."""
    invoice = await _create_invoice(
        client,
        auth_headers,
        lines=[{"description": "Full payment item", "quantity": 1.0, "unit_price": 250.0}],
    )
    invoice_id = invoice["id"]
    total = invoice["total"]

    # Record full payment
    await _record_payment(client, auth_headers, invoice_id, total)

    # Confirm invoice is paid with no amount due
    inv_resp = await client.get(f"{BASE}/invoices/{invoice_id}", headers=auth_headers)
    assert inv_resp.status_code == 200
    inv = inv_resp.json()
    assert inv["status"] == "paid"
    assert inv["amount_due"] == 0.0

    # Summary must reflect the payment
    summary_resp = await client.get(f"{BASE}/summary", headers=auth_headers)
    assert summary_resp.status_code == 200
    summary = summary_resp.json()
    assert summary["total_paid"] >= total
    assert summary["paid_count"] >= 1


# ── 5. Workspace isolation ────────────────────────────────────────────────────

async def test_invoice_not_visible_in_second_workspace(
    client: AsyncClient, auth_headers: dict
):
    """An invoice created in workspace 1 must not appear in workspace 2's list."""
    # Create invoice in workspace 1
    invoice = await _create_invoice(client, auth_headers)

    # Obtain workspace 2 headers via registration
    ws2_headers = await _get_second_workspace_headers(client)

    # Workspace 2 list must not contain workspace 1's invoice
    resp = await client.get(f"{BASE}/invoices", headers=ws2_headers)
    assert resp.status_code == 200
    ws2_ids = [i["id"] for i in resp.json()]
    assert invoice["id"] not in ws2_ids

    # Direct GET by ID from workspace 2 must 404
    direct_resp = await client.get(
        f"{BASE}/invoices/{invoice['id']}", headers=ws2_headers
    )
    assert direct_resp.status_code == 404
    assert direct_resp.json()["error"]["code"] == "ACCOUNTING_INVOICE_NOT_FOUND"


# ── Error envelope (ADR 0010) ────────────────────────────────────────────────
#
# El `code` y las claves de `detail` son el contrato que consume
# composable-os/src/lib/errors.ts. Renombrar una clave no rompe al frontend: lo
# hace caer al mensaje en ingles del backend, en silencio.

MISSING_ID = "00000000-0000-0000-0000-000000000000"


def _error(resp) -> dict:
    body = resp.json()
    assert "error" in body, body
    return body["error"]


async def test_invoice_not_found_error_shape(client: AsyncClient, auth_headers: dict):
    resp = await client.get(f"{BASE}/invoices/{MISSING_ID}", headers=auth_headers)

    assert resp.status_code == 404
    error = _error(resp)
    assert error["code"] == "ACCOUNTING_INVOICE_NOT_FOUND"
    assert error["detail"]["id"] == MISSING_ID


async def test_payment_exceeds_due_error_shape(client: AsyncClient, auth_headers: dict):
    invoice = await _create_invoice(client, auth_headers)  # total 200.0

    resp = await client.post(
        f"{BASE}/invoices/{invoice['id']}/payments",
        headers=auth_headers,
        json={"amount": 500.0, "payment_date": "2026-04-11"},
    )

    assert resp.status_code == 400
    error = _error(resp)
    assert error["code"] == "ACCOUNTING_PAYMENT_EXCEEDS_DUE"
    assert error["detail"]["amount"] == 500.0
    assert error["detail"]["amount_due"] == invoice["amount_due"]


async def test_update_paid_invoice_error_shape(client: AsyncClient, auth_headers: dict):
    invoice = await _create_invoice(client, auth_headers)
    await _record_payment(client, auth_headers, invoice["id"], invoice["total"])

    resp = await client.patch(
        f"{BASE}/invoices/{invoice['id']}", headers=auth_headers, json={"status": "sent"}
    )

    assert resp.status_code == 409
    error = _error(resp)
    assert error["code"] == "ACCOUNTING_INVOICE_UPDATE_BLOCKED"
    assert error["detail"]["status"] == "paid"


async def test_delete_paid_invoice_error_shape(client: AsyncClient, auth_headers: dict):
    invoice = await _create_invoice(client, auth_headers)
    await _record_payment(client, auth_headers, invoice["id"], invoice["total"])

    resp = await client.delete(f"{BASE}/invoices/{invoice['id']}", headers=auth_headers)

    assert resp.status_code == 409
    error = _error(resp)
    assert error["code"] == "ACCOUNTING_INVOICE_DELETE_BLOCKED"
    assert error["detail"]["status"] == "paid"


async def test_logo_too_large_error_shape(client: AsyncClient, auth_headers: dict):
    import base64

    oversized = "data:image/png;base64," + base64.b64encode(b"x" * 300_000).decode()

    resp = await client.put(
        f"{BASE}/company-profile", headers=auth_headers, json={"logo_data_uri": oversized}
    )

    assert resp.status_code == 400
    error = _error(resp)
    assert error["code"] == "ACCOUNTING_LOGO_TOO_LARGE"
    assert error["detail"]["max_kb"] == 200
    assert error["detail"]["size_kb"] > 200
    # El mensaje del servidor vuelve a ser ingles: el espanol lo pone errors.ts.
    assert "logo" in error["message"].lower()
