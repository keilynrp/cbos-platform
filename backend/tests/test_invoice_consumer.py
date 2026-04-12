"""
Tests for the auto-invoice consumer (invoice_consumer.py).

Covers:
- Event filtering (only processes SalesOrderFulfilled)
- Idempotency (Redis dedup + DB-level duplicate check)
- Invoice creation from SalesOrder with lines
- Edge cases: missing fields, missing order, non-fulfilled order, no lines
- Consumer group creation
- Full integration: publish event → consumer processes → invoice exists
"""

import json
import uuid
from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.events.types import SALES_ORDER_FULFILLED
from app.modules.accounting.invoice_consumer import (
    CONSUMER_GROUP,
    STREAM_KEY,
    _create_invoice_for_order,
    _ensure_group,
    _is_duplicate,
    _process_message,
)


# ---------------------------------------------------------------------------
# Layer 1: _ensure_group
# ---------------------------------------------------------------------------

class TestEnsureGroup:
    @pytest.mark.asyncio
    async def test_creates_group_when_not_exists(self):
        r = AsyncMock()
        r.xgroup_create = AsyncMock(return_value=True)
        await _ensure_group(r)
        r.xgroup_create.assert_called_once_with(
            STREAM_KEY, CONSUMER_GROUP, id="0", mkstream=True,
        )

    @pytest.mark.asyncio
    async def test_ignores_busygroup_error(self):
        r = AsyncMock()
        r.xgroup_create = AsyncMock(side_effect=Exception("BUSYGROUP Consumer Group name already exists"))
        await _ensure_group(r)  # Should not raise

    @pytest.mark.asyncio
    async def test_raises_other_errors(self):
        r = AsyncMock()
        r.xgroup_create = AsyncMock(side_effect=Exception("Connection refused"))
        with pytest.raises(Exception, match="Connection refused"):
            await _ensure_group(r)


# ---------------------------------------------------------------------------
# Layer 2: _is_duplicate
# ---------------------------------------------------------------------------

class TestIsDuplicate:
    @pytest.mark.asyncio
    async def test_first_time_returns_false(self):
        r = AsyncMock()
        r.set = AsyncMock(return_value=True)  # NX succeeded → first time
        result = await _is_duplicate(r, "evt-123")
        assert result is False

    @pytest.mark.asyncio
    async def test_second_time_returns_true(self):
        r = AsyncMock()
        r.set = AsyncMock(return_value=None)  # NX failed → already exists
        result = await _is_duplicate(r, "evt-123")
        assert result is True


# ---------------------------------------------------------------------------
# Layer 3: _process_message — event filtering
# ---------------------------------------------------------------------------

class TestProcessMessageFiltering:
    @pytest.mark.asyncio
    async def test_ignores_non_sales_order_fulfilled_events(self):
        """Events other than SalesOrderFulfilled should ACK immediately."""
        r = AsyncMock()
        sf = AsyncMock()
        event = {"event_type": "OpportunityWon", "event_id": "e1"}
        data = {"data": json.dumps(event).encode()}

        result = await _process_message(r, sf, "msg-1", data)
        assert result is True  # ACK
        # Should NOT call _is_duplicate or create session
        r.set.assert_not_called()

    @pytest.mark.asyncio
    async def test_acks_malformed_message(self):
        """Messages without 'data' field should ACK to discard."""
        r = AsyncMock()
        sf = AsyncMock()
        result = await _process_message(r, sf, "msg-1", {})
        assert result is True

    @pytest.mark.asyncio
    async def test_acks_on_duplicate_event(self):
        """Duplicate event_id should ACK without processing."""
        r = AsyncMock()
        r.set = AsyncMock(return_value=None)  # Duplicate
        sf = AsyncMock()

        event = {
            "event_type": SALES_ORDER_FULFILLED,
            "event_id": "evt-dup",
            "entity_id": "order-1",
            "workspace_id": "ws-1",
        }
        data = {"data": json.dumps(event).encode()}

        result = await _process_message(r, sf, "msg-1", data)
        assert result is True

    @pytest.mark.asyncio
    async def test_handles_bytes_data_key(self):
        """Data can arrive as b'data' key from Redis."""
        r = AsyncMock()
        sf = AsyncMock()
        event = {"event_type": "SomethingElse", "event_id": "e1"}
        data = {b"data": json.dumps(event).encode()}

        result = await _process_message(r, sf, "msg-1", data)
        assert result is True


# ---------------------------------------------------------------------------
# Layer 4: _create_invoice_for_order — unit tests with mock session
# ---------------------------------------------------------------------------

class TestCreateInvoiceForOrder:
    @pytest.mark.asyncio
    async def test_returns_true_on_missing_entity_id(self):
        session = AsyncMock(spec=AsyncSession)
        event = {"workspace_id": "ws-1"}  # No entity_id
        result = await _create_invoice_for_order(session, event)
        assert result is True

    @pytest.mark.asyncio
    async def test_returns_true_on_missing_workspace_id(self):
        session = AsyncMock(spec=AsyncSession)
        event = {"entity_id": "order-1"}  # No workspace_id
        result = await _create_invoice_for_order(session, event)
        assert result is True


# ---------------------------------------------------------------------------
# Layer 5: Integration — full flow with DB (uses conftest fixtures)
# ---------------------------------------------------------------------------

class TestInvoiceConsumerIntegration:
    """
    Integration tests that create real DB records and verify the consumer
    correctly creates invoices from SalesOrder data.
    """

    async def _create_fulfilled_order(self, client, auth_headers, lines=None):
        """Helper: creates a quote, accepts it, fulfills the order, returns order data."""
        if lines is None:
            lines = [
                {"description": "Widget A", "quantity": 5, "unit_price": 100.0, "discount_percent": 10.0, "line_order": 1},
                {"description": "Widget B", "quantity": 2, "unit_price": 250.0, "discount_percent": 0.0, "line_order": 2},
            ]

        quote_resp = await client.post(
            "/api/v1/sales/quotes",
            json={
                "title": "Auto-Invoice Test Quote",
                "currency": "USD",
                "lines": lines,
            },
            headers=auth_headers,
        )
        assert quote_resp.status_code == 201
        quote_id = quote_resp.json()["id"]

        # Accept quote → SalesOrder
        accept_resp = await client.patch(
            f"/api/v1/sales/quotes/{quote_id}/accept",
            headers=auth_headers,
        )
        assert accept_resp.status_code == 200
        order_id = accept_resp.json()["id"]

        # Transition to fulfilled using dedicated endpoints
        order_detail = await client.get(f"/api/v1/sales/orders/{order_id}", headers=auth_headers)
        current_status = order_detail.json()["status"]

        if current_status == "draft":
            resp = await client.patch(f"/api/v1/sales/orders/{order_id}/confirm", json={}, headers=auth_headers)
            assert resp.status_code == 200, f"Failed confirm: {resp.text}"
            current_status = "confirmed"

        if current_status == "confirmed":
            resp = await client.patch(f"/api/v1/sales/orders/{order_id}/start-fulfillment", headers=auth_headers)
            assert resp.status_code == 200, f"Failed start-fulfillment: {resp.text}"
            current_status = "in_fulfillment"

        if current_status == "in_fulfillment":
            resp = await client.patch(f"/api/v1/sales/orders/{order_id}/fulfill", headers=auth_headers)
            assert resp.status_code == 200, f"Failed fulfill: {resp.text}"

        order_data = (await client.get(f"/api/v1/sales/orders/{order_id}", headers=auth_headers)).json()
        return order_data

    async def _create_unfulfilled_order(self, client, auth_headers):
        """Helper: creates a quote and accepts it but does NOT fulfill."""
        quote_resp = await client.post(
            "/api/v1/sales/quotes",
            json={
                "title": "Non-fulfilled Test",
                "currency": "USD",
                "lines": [{"description": "Item Y", "quantity": 1, "unit_price": 300.0, "discount_percent": 0, "line_order": 1}],
            },
            headers=auth_headers,
        )
        assert quote_resp.status_code == 201
        quote_id = quote_resp.json()["id"]

        accept_resp = await client.patch(f"/api/v1/sales/quotes/{quote_id}/accept", headers=auth_headers)
        assert accept_resp.status_code == 200
        order_id = accept_resp.json()["id"]

        order_data = (await client.get(f"/api/v1/sales/orders/{order_id}", headers=auth_headers)).json()
        return order_data

    @pytest.mark.asyncio
    async def test_creates_invoice_from_fulfilled_order(self, client, auth_headers, db):
        """Full flow: create order with lines → consumer creates invoice."""
        from app.modules.accounting.models import Invoice, InvoiceLine

        order_data = await self._create_fulfilled_order(client, auth_headers)
        order_id = order_data["id"]
        workspace_id = order_data["workspace_id"]

        event = {
            "event_type": SALES_ORDER_FULFILLED,
            "event_id": str(uuid.uuid4()),
            "entity_id": order_id,
            "workspace_id": workspace_id,
            "actor_id": None,
        }

        success = await _create_invoice_for_order(db, event)
        assert success is True
        await db.commit()

        # Verify invoice was created and linked
        result = await db.execute(
            select(Invoice).where(
                Invoice.sales_order_id == order_id,
                Invoice.workspace_id == workspace_id,
            )
        )
        invoice = result.scalar_one_or_none()
        assert invoice is not None, "Invoice should have been created"
        assert invoice.currency == "USD"
        assert invoice.notes is not None
        assert "Auto-generated" in invoice.notes

        # Verify invoice lines match order lines
        lines_result = await db.execute(
            select(InvoiceLine).where(InvoiceLine.invoice_id == invoice.id)
        )
        lines = lines_result.scalars().all()
        assert len(lines) == 2
        descriptions = {l.description for l in lines}
        assert "Widget A" in descriptions
        assert "Widget B" in descriptions

    @pytest.mark.asyncio
    async def test_idempotent_no_duplicate_invoice(self, client, auth_headers, db):
        """Calling _create_invoice_for_order twice should not create a second invoice."""
        from app.modules.accounting.models import Invoice

        order_data = await self._create_fulfilled_order(
            client, auth_headers,
            lines=[{"description": "Item X", "quantity": 1, "unit_price": 500.0, "discount_percent": 0, "line_order": 1}],
        )
        order_id = order_data["id"]
        workspace_id = order_data["workspace_id"]

        event = {
            "event_type": SALES_ORDER_FULFILLED,
            "event_id": str(uuid.uuid4()),
            "entity_id": order_id,
            "workspace_id": workspace_id,
        }

        # First call — creates invoice
        success1 = await _create_invoice_for_order(db, event)
        assert success1 is True
        await db.commit()

        # Second call — should skip (DB-level idempotency)
        success2 = await _create_invoice_for_order(db, event)
        assert success2 is True

        # Verify only one invoice exists
        result = await db.execute(
            select(Invoice).where(Invoice.sales_order_id == order_id)
        )
        invoices = result.scalars().all()
        assert len(invoices) == 1

    @pytest.mark.asyncio
    async def test_skips_non_fulfilled_order(self, client, auth_headers, db):
        """Consumer should skip orders that aren't in 'fulfilled' status."""
        from app.modules.accounting.models import Invoice

        order_data = await self._create_unfulfilled_order(client, auth_headers)
        order_id = order_data["id"]
        workspace_id = order_data["workspace_id"]

        event = {
            "entity_id": order_id,
            "workspace_id": workspace_id,
        }

        success = await _create_invoice_for_order(db, event)
        assert success is True  # ACK but no invoice

        result = await db.execute(
            select(Invoice).where(Invoice.sales_order_id == order_id)
        )
        assert result.scalar_one_or_none() is None

    @pytest.mark.asyncio
    async def test_handles_nonexistent_order(self, db):
        """Consumer should ACK gracefully for an order that doesn't exist."""
        event = {
            "entity_id": str(uuid.uuid4()),
            "workspace_id": str(uuid.uuid4()),
        }
        success = await _create_invoice_for_order(db, event)
        assert success is True  # ACK — order not found

    @pytest.mark.asyncio
    async def test_process_message_full_flow(self, client, auth_headers, db):
        """
        Test _process_message with a real SalesOrderFulfilled event and mock Redis.
        Verifies the full message processing pipeline.
        """
        from app.modules.accounting.models import Invoice

        order_data = await self._create_fulfilled_order(
            client, auth_headers,
            lines=[{"description": "Service Z", "quantity": 3, "unit_price": 200.0, "discount_percent": 5.0, "line_order": 1}],
        )
        order_id = order_data["id"]
        workspace_id = order_data["workspace_id"]

        # Build stream message
        event_id = str(uuid.uuid4())
        event = {
            "event_type": SALES_ORDER_FULFILLED,
            "event_id": event_id,
            "entity_id": order_id,
            "workspace_id": workspace_id,
            "actor_id": None,
        }
        data = {"data": json.dumps(event).encode()}

        # Mock Redis for dedup (first time → not duplicate)
        r = AsyncMock()
        r.set = AsyncMock(return_value=True)

        # Use a session factory that returns our test db session
        mock_session_ctx = AsyncMock()
        mock_session_ctx.__aenter__ = AsyncMock(return_value=db)
        mock_session_ctx.__aexit__ = AsyncMock(return_value=False)
        session_factory = MagicMock(return_value=mock_session_ctx)

        result = await _process_message(r, session_factory, "msg-100", data)
        assert result is True

        # Verify invoice was created
        inv_result = await db.execute(
            select(Invoice).where(Invoice.sales_order_id == order_id)
        )
        invoice = inv_result.scalar_one_or_none()
        assert invoice is not None
        assert invoice.currency == "USD"
