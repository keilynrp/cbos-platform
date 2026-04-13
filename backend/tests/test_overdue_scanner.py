"""
Tests for the overdue invoice scanner (overdue_scanner.py).

Covers:
- Transition logic: sent → overdue, partial → overdue
- Skip logic: draft, paid, void, cancelled are NOT transitioned
- Skip: invoices with no due_date or future due_date are NOT transitioned
- Idempotency: already-overdue invoices are not re-processed
- Event emission: INVOICE_OVERDUE emitted per transitioned invoice
- Multiple invoices in one scan
- Empty database (no invoices)
- Integration: full scanner run with real DB
"""

import uuid
from contextlib import asynccontextmanager
from datetime import date, timedelta
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.accounting.models import Invoice, InvoiceLine
from app.modules.accounting.overdue_scanner import _scan_overdue_invoices


# ---------------------------------------------------------------------------
# Fixture: patch AsyncSessionLocal to use the test DB
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _patch_session_local(session_factory):
    """Redirect the scanner's AsyncSessionLocal to the test database."""
    with patch(
        "app.modules.accounting.overdue_scanner.AsyncSessionLocal",
        session_factory,
    ):
        yield


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_invoice(
    workspace_id: str,
    status: str = "sent",
    due_date: date | None = None,
    total: float = 1000.0,
    amount_due: float = 1000.0,
) -> Invoice:
    """Create an Invoice ORM instance (not persisted yet)."""
    return Invoice(
        workspace_id=workspace_id,
        invoice_number=f"INV-2026-{uuid.uuid4().hex[:4].upper()}",
        status=status,
        issue_date=date.today() - timedelta(days=30),
        due_date=due_date,
        currency="USD",
        subtotal=total,
        total=total,
        amount_due=amount_due,
        amount_paid=total - amount_due,
    )


# ---------------------------------------------------------------------------
# Layer 1: Transition logic — which invoices get transitioned
# ---------------------------------------------------------------------------

class TestTransitionLogic:
    """Test that _scan_overdue_invoices transitions the right invoices."""

    @pytest.mark.asyncio
    async def test_sent_invoice_past_due_transitions_to_overdue(self, db: AsyncSession, workspace, session_factory):
        inv = _make_invoice(workspace.id, status="sent", due_date=date.today() - timedelta(days=1))
        db.add(inv)
        await db.commit()
        inv_id = inv.id

        with patch("app.modules.accounting.overdue_scanner.publish_event", new_callable=AsyncMock):
            count = await _scan_overdue_invoices()

        assert count == 1
        # Verify in DB with a fresh session (scanner committed via its own session)
        async with session_factory() as fresh:
            result = await fresh.execute(select(Invoice).where(Invoice.id == inv_id))
            updated = result.scalar_one()
            assert updated.status == "overdue"

    @pytest.mark.asyncio
    async def test_partial_invoice_past_due_transitions_to_overdue(self, db: AsyncSession, workspace, session_factory):
        inv = _make_invoice(workspace.id, status="partial", due_date=date.today() - timedelta(days=5), amount_due=500.0)
        db.add(inv)
        await db.commit()
        inv_id = inv.id

        with patch("app.modules.accounting.overdue_scanner.publish_event", new_callable=AsyncMock):
            count = await _scan_overdue_invoices()

        assert count == 1
        async with session_factory() as fresh:
            result = await fresh.execute(select(Invoice).where(Invoice.id == inv_id))
            updated = result.scalar_one()
            assert updated.status == "overdue"

    @pytest.mark.asyncio
    async def test_draft_invoice_not_transitioned(self, db: AsyncSession, workspace):
        inv = _make_invoice(workspace.id, status="draft", due_date=date.today() - timedelta(days=1))
        db.add(inv)
        await db.commit()

        with patch("app.modules.accounting.overdue_scanner.publish_event", new_callable=AsyncMock):
            count = await _scan_overdue_invoices()

        assert count == 0

    @pytest.mark.asyncio
    async def test_paid_invoice_not_transitioned(self, db: AsyncSession, workspace):
        inv = _make_invoice(workspace.id, status="paid", due_date=date.today() - timedelta(days=1), amount_due=0.0)
        db.add(inv)
        await db.commit()

        with patch("app.modules.accounting.overdue_scanner.publish_event", new_callable=AsyncMock):
            count = await _scan_overdue_invoices()

        assert count == 0

    @pytest.mark.asyncio
    async def test_void_invoice_not_transitioned(self, db: AsyncSession, workspace):
        inv = _make_invoice(workspace.id, status="void", due_date=date.today() - timedelta(days=1))
        db.add(inv)
        await db.commit()

        with patch("app.modules.accounting.overdue_scanner.publish_event", new_callable=AsyncMock):
            count = await _scan_overdue_invoices()

        assert count == 0

    @pytest.mark.asyncio
    async def test_cancelled_invoice_not_transitioned(self, db: AsyncSession, workspace):
        inv = _make_invoice(workspace.id, status="cancelled", due_date=date.today() - timedelta(days=1))
        db.add(inv)
        await db.commit()

        with patch("app.modules.accounting.overdue_scanner.publish_event", new_callable=AsyncMock):
            count = await _scan_overdue_invoices()

        assert count == 0

    @pytest.mark.asyncio
    async def test_already_overdue_not_re_transitioned(self, db: AsyncSession, workspace):
        """Invoices already marked overdue should not be counted again."""
        inv = _make_invoice(workspace.id, status="overdue", due_date=date.today() - timedelta(days=10))
        db.add(inv)
        await db.commit()

        with patch("app.modules.accounting.overdue_scanner.publish_event", new_callable=AsyncMock) as mock_pub:
            count = await _scan_overdue_invoices()

        assert count == 0
        mock_pub.assert_not_called()


# ---------------------------------------------------------------------------
# Layer 2: Due date logic
# ---------------------------------------------------------------------------

class TestDueDateLogic:
    @pytest.mark.asyncio
    async def test_no_due_date_not_transitioned(self, db: AsyncSession, workspace):
        inv = _make_invoice(workspace.id, status="sent", due_date=None)
        db.add(inv)
        await db.commit()

        with patch("app.modules.accounting.overdue_scanner.publish_event", new_callable=AsyncMock):
            count = await _scan_overdue_invoices()

        assert count == 0

    @pytest.mark.asyncio
    async def test_future_due_date_not_transitioned(self, db: AsyncSession, workspace):
        inv = _make_invoice(workspace.id, status="sent", due_date=date.today() + timedelta(days=7))
        db.add(inv)
        await db.commit()

        with patch("app.modules.accounting.overdue_scanner.publish_event", new_callable=AsyncMock):
            count = await _scan_overdue_invoices()

        assert count == 0

    @pytest.mark.asyncio
    async def test_due_today_not_transitioned(self, db: AsyncSession, workspace):
        """Due date == today means not yet overdue (strictly less than)."""
        inv = _make_invoice(workspace.id, status="sent", due_date=date.today())
        db.add(inv)
        await db.commit()

        with patch("app.modules.accounting.overdue_scanner.publish_event", new_callable=AsyncMock):
            count = await _scan_overdue_invoices()

        assert count == 0


# ---------------------------------------------------------------------------
# Layer 3: Event emission
# ---------------------------------------------------------------------------

class TestEventEmission:
    @pytest.mark.asyncio
    async def test_emits_invoice_overdue_event(self, db: AsyncSession, workspace):
        inv = _make_invoice(workspace.id, status="sent", due_date=date.today() - timedelta(days=3))
        db.add(inv)
        await db.commit()

        with patch("app.modules.accounting.overdue_scanner.publish_event", new_callable=AsyncMock) as mock_pub:
            count = await _scan_overdue_invoices()

        assert count == 1
        mock_pub.assert_called_once()
        event = mock_pub.call_args[0][0]
        assert event.event_type == "InvoiceOverdue"
        assert event.source_module == "accounting"
        assert event.workspace_id == workspace.id
        assert event.payload["invoice_number"] == inv.invoice_number
        assert event.payload["total"] == inv.total
        assert event.payload["amount_due"] == inv.amount_due
        assert event.payload["currency"] == "USD"

    @pytest.mark.asyncio
    async def test_emits_one_event_per_invoice(self, db: AsyncSession, workspace):
        """Multiple overdue invoices should each emit their own event."""
        for i in range(3):
            inv = _make_invoice(workspace.id, status="sent", due_date=date.today() - timedelta(days=i + 1))
            db.add(inv)
        await db.commit()

        with patch("app.modules.accounting.overdue_scanner.publish_event", new_callable=AsyncMock) as mock_pub:
            count = await _scan_overdue_invoices()

        assert count == 3
        assert mock_pub.call_count == 3

    @pytest.mark.asyncio
    async def test_event_emission_failure_does_not_crash(self, db: AsyncSession, workspace, session_factory):
        """If event publishing fails, the transition should still be committed."""
        inv = _make_invoice(workspace.id, status="sent", due_date=date.today() - timedelta(days=1))
        db.add(inv)
        await db.commit()
        inv_id = inv.id

        with patch("app.modules.accounting.overdue_scanner.publish_event", new_callable=AsyncMock, side_effect=Exception("Redis down")):
            count = await _scan_overdue_invoices()

        assert count == 1
        # Status should still be updated despite event failure
        async with session_factory() as fresh:
            result = await fresh.execute(select(Invoice).where(Invoice.id == inv_id))
            updated = result.scalar_one()
            assert updated.status == "overdue"


# ---------------------------------------------------------------------------
# Layer 4: Edge cases
# ---------------------------------------------------------------------------

class TestEdgeCases:
    @pytest.mark.asyncio
    async def test_empty_database_returns_zero(self):
        with patch("app.modules.accounting.overdue_scanner.publish_event", new_callable=AsyncMock):
            count = await _scan_overdue_invoices()
        assert count == 0

    @pytest.mark.asyncio
    async def test_mixed_statuses_only_transitions_eligible(self, db: AsyncSession, workspace):
        """Create invoices with various statuses; only sent/partial past due should transition."""
        yesterday = date.today() - timedelta(days=1)

        invoices = [
            _make_invoice(workspace.id, status="sent", due_date=yesterday),       # Should transition
            _make_invoice(workspace.id, status="partial", due_date=yesterday),     # Should transition
            _make_invoice(workspace.id, status="draft", due_date=yesterday),       # Skip
            _make_invoice(workspace.id, status="paid", due_date=yesterday),        # Skip
            _make_invoice(workspace.id, status="overdue", due_date=yesterday),     # Skip (already overdue)
            _make_invoice(workspace.id, status="sent", due_date=None),             # Skip (no due date)
            _make_invoice(workspace.id, status="sent", due_date=date.today() + timedelta(days=30)),  # Skip (future)
        ]
        for inv in invoices:
            db.add(inv)
        await db.commit()

        with patch("app.modules.accounting.overdue_scanner.publish_event", new_callable=AsyncMock) as mock_pub:
            count = await _scan_overdue_invoices()

        assert count == 2
        assert mock_pub.call_count == 2
