# Quote Line Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated `/sales/quotes/:id` detail page with inline-editable line items, running totals, notes/terms, and a change history log.

**Architecture:** Backend gains 4 new columns on `quote_lines`, a new `quote_events` audit table, and 3 new REST endpoints (PATCH/PUT lines, GET history). Frontend adds a `QuoteDetail` page wired to those endpoints, extracts `QuoteStatusBadge` to a shared component, and makes the Sales quote list rows navigable.

**Tech Stack:** FastAPI, SQLAlchemy async, Alembic, Pydantic v2, React 18, TypeScript, @tanstack/react-query, react-router-dom v6, shadcn/ui, sonner toasts.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `backend/alembic/versions/<hash>_quote_line_and_events.py` | Create | DB migration — new columns + table |
| `backend/app/modules/sales/models.py` | Modify | QuoteLine new cols; QuoteEvent model |
| `backend/app/modules/sales/schemas.py` | Modify | QuoteLineCreate/Read updates; new schemas |
| `backend/app/modules/sales/service.py` | Modify | Updated calc; new update_line/replace_lines/get_history/_log_event |
| `backend/app/modules/sales/router.py` | Modify | 3 new endpoints |
| `backend/tests/conftest.py` | Modify | Import QuoteEvent model |
| `backend/tests/test_sales_quote_lines.py` | Create | Tests for new endpoints |
| `composable-os/src/components/sales/QuoteStatusBadge.tsx` | Create | Shared badge component |
| `composable-os/src/services/sales.ts` | Modify | New types + service methods |
| `composable-os/src/pages/QuoteDetail.tsx` | Create | Full detail page |
| `composable-os/src/App.tsx` | Modify | Add /sales/quotes/:id route |
| `composable-os/src/pages/Sales.tsx` | Modify | Import shared badge; rows clickable |

---

## Task 1: Alembic migration — quote_lines columns + quote_events table

**Files:**
- Create: `backend/alembic/versions/b4f9e2a1c7d3_quote_line_and_events.py`

- [ ] **Step 1: Create the migration file**

Create `backend/alembic/versions/b4f9e2a1c7d3_quote_line_and_events.py` with this exact content:

```python
"""quote_line_and_events

Revision ID: b4f9e2a1c7d3
Revises: c3e6a9d2f1b8
Create Date: 2026-05-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b4f9e2a1c7d3'
down_revision: Union[str, None] = 'c3e6a9d2f1b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── New columns on quote_lines ────────────────────────────────────────
    op.add_column('quote_lines', sa.Column('sku', sa.String(100), nullable=True))
    op.add_column('quote_lines', sa.Column('unit', sa.String(50), nullable=True))
    op.add_column('quote_lines', sa.Column('tax_percent', sa.Float(), nullable=False, server_default='0'))
    op.add_column('quote_lines', sa.Column('notes', sa.Text(), nullable=True))

    # ── New table: quote_events ───────────────────────────────────────────
    op.create_table(
        'quote_events',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('workspace_id', sa.String(), nullable=False),
        sa.Column('quote_id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['quote_id'], ['quotes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_quote_events_quote_id', 'quote_events', ['quote_id'])
    op.create_index('ix_quote_events_workspace_id', 'quote_events', ['workspace_id'])


def downgrade() -> None:
    op.drop_index('ix_quote_events_workspace_id', table_name='quote_events')
    op.drop_index('ix_quote_events_quote_id', table_name='quote_events')
    op.drop_table('quote_events')
    op.drop_column('quote_lines', 'notes')
    op.drop_column('quote_lines', 'tax_percent')
    op.drop_column('quote_lines', 'unit')
    op.drop_column('quote_lines', 'sku')
```

- [ ] **Step 2: Run the migration in Docker**

```bash
docker compose exec backend alembic upgrade head
```

Expected output ends with: `Running upgrade c3e6a9d2f1b8 -> b4f9e2a1c7d3, quote_line_and_events`

- [ ] **Step 3: Commit**

```bash
git add backend/alembic/versions/b4f9e2a1c7d3_quote_line_and_events.py
git commit -m "feat(sales): add quote_line columns (sku, unit, tax_percent, notes) + quote_events table"
```

---

## Task 2: Models + Schemas

**Files:**
- Modify: `backend/app/modules/sales/models.py`
- Modify: `backend/app/modules/sales/schemas.py`

- [ ] **Step 1: Update QuoteLine model and add QuoteEvent model**

In `backend/app/modules/sales/models.py`:

1. Add `JSON` to the sqlalchemy import line:
```python
from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
```

2. Add 4 new columns to `QuoteLine` after `product_id`:
```python
    # New fields — line-level details
    sku: Mapped[str | None] = mapped_column(String(100), nullable=True)
    unit: Mapped[str | None] = mapped_column(String(50), nullable=True)
    tax_percent: Mapped[float] = mapped_column(Float, default=0.0)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
```

3. Add a back-reference to `Quote.lines` relationship (add `events` relationship after `sales_order`):
```python
    events: Mapped[list["QuoteEvent"]] = relationship(
        "QuoteEvent", back_populates="quote", cascade="all, delete-orphan"
    )
```

4. Add `QuoteEvent` model at the end of the file:
```python
class QuoteEvent(Base):
    """Audit log entry for a quote — immutable once created."""

    __tablename__ = "quote_events"

    workspace_id: Mapped[str] = mapped_column(
        String, ForeignKey("workspaces.id"), index=True
    )
    quote_id: Mapped[str] = mapped_column(
        String, ForeignKey("quotes.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("users.id"), nullable=True
    )
    event_type: Mapped[str] = mapped_column(String(50))
    description: Mapped[str] = mapped_column(Text)
    metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    quote: Mapped["Quote"] = relationship("Quote", back_populates="events")
```

- [ ] **Step 2: Update schemas**

In `backend/app/modules/sales/schemas.py`:

1. Update `QuoteLineCreate` — add the new optional fields after `product_id`:
```python
class QuoteLineCreate(BaseModel):
    description: str
    quantity: float = Field(default=1.0, gt=0)
    unit_price: float = Field(default=0.0, ge=0)
    discount_percent: float = Field(default=0.0, ge=0, le=100)
    tax_percent: float = Field(default=0.0, ge=0, le=100)
    line_order: int = Field(default=1, ge=1)
    sku: str | None = None
    unit: str | None = None
    notes: str | None = None
    product_id: str | None = None
```

2. Update `QuoteLineRead` — add the new fields after `product_id`:
```python
class QuoteLineRead(BaseModel):
    id: str
    quote_id: str
    line_order: int
    sku: str | None
    description: str
    unit: str | None
    quantity: float
    unit_price: float
    discount_percent: float
    tax_percent: float
    amount: float
    notes: str | None
    product_id: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
```

3. Add `QuoteLineUpdate` after `QuoteLineRead`:
```python
class QuoteLineUpdate(BaseModel):
    sku: str | None = None
    description: str | None = None
    unit: str | None = None
    quantity: float | None = Field(default=None, gt=0)
    unit_price: float | None = Field(default=None, ge=0)
    discount_percent: float | None = Field(default=None, ge=0, le=100)
    tax_percent: float | None = Field(default=None, ge=0, le=100)
    notes: str | None = None
    line_order: int | None = Field(default=None, ge=1)
    product_id: str | None = None
```

4. Add `QuoteLineUpsert` after `QuoteLineUpdate`:
```python
class QuoteLineUpsert(BaseModel):
    id: str | None = None
    sku: str | None = None
    description: str
    unit: str | None = None
    quantity: float = Field(default=1.0, gt=0)
    unit_price: float = Field(default=0.0, ge=0)
    discount_percent: float = Field(default=0.0, ge=0, le=100)
    tax_percent: float = Field(default=0.0, ge=0, le=100)
    notes: str | None = None
    line_order: int = Field(default=1, ge=1)
    product_id: str | None = None
```

5. Add `QuoteEventRead` after `QuoteReject`:
```python
class QuoteEventRead(BaseModel):
    id: str
    quote_id: str
    user_id: str | None
    event_type: str
    description: str
    metadata: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 3: Update conftest.py import**

In `backend/tests/conftest.py`, update the sales models import line (line 39):
```python
from app.modules.sales.models import Quote, QuoteLine, SalesOrder, SalesOrderLine, QuoteEvent  # noqa: F401
```

- [ ] **Step 4: Verify the app still boots**

```bash
docker compose exec backend python -c "from app.main import app; print('OK')"
```

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add backend/app/modules/sales/models.py backend/app/modules/sales/schemas.py backend/tests/conftest.py
git commit -m "feat(sales): extend QuoteLine model with sku/unit/tax_percent/notes; add QuoteEvent model and schemas"
```

---

## Task 3: Service — updated calc + new functions + event logging

**Files:**
- Modify: `backend/app/modules/sales/service.py`

- [ ] **Step 1: Update `_calc_line_amount` to include tax**

Replace the existing `_calc_line_amount` function (currently line ~63):
```python
def _calc_line_amount(
    quantity: float,
    unit_price: float,
    discount_percent: float,
    tax_percent: float = 0.0,
) -> float:
    pretax = quantity * unit_price * (1 - discount_percent / 100)
    return round(pretax * (1 + tax_percent / 100), 4)
```

- [ ] **Step 2: Update `_recalculate_totals` to derive totals from raw line fields**

Replace the existing `_recalculate_totals` function (currently line ~67):
```python
async def _recalculate_totals(db: AsyncSession, quote: Quote) -> None:
    lines = quote.lines
    subtotal = round(sum(
        l.quantity * l.unit_price * (1 - l.discount_percent / 100)
        for l in lines
    ), 4)
    tax_amount = round(sum(
        l.quantity * l.unit_price * (1 - l.discount_percent / 100) * l.tax_percent / 100
        for l in lines
    ), 4)
    total = round(subtotal - quote.discount_amount + tax_amount, 4)
    quote.subtotal = subtotal
    quote.tax_amount = tax_amount
    quote.total = total
```

- [ ] **Step 3: Add `_log_event` helper and update imports**

Add these imports at the top of `service.py` (add to existing import block):
```python
from app.modules.sales.models import Quote, QuoteLine, QuoteEvent, SalesOrder, SalesOrderLine
```
(Replace the existing line that imports from `app.modules.sales.models`.)

Add `_log_event` helper after `_recalculate_totals`:
```python
def _log_event(
    db: AsyncSession,
    workspace_id: str,
    quote_id: str,
    actor_id: str | None,
    event_type: str,
    description: str,
    metadata: dict | None = None,
) -> None:
    db.add(QuoteEvent(
        workspace_id=workspace_id,
        quote_id=quote_id,
        user_id=actor_id,
        event_type=event_type,
        description=description,
        metadata=metadata,
    ))
```

- [ ] **Step 4: Update `create_quote` to pass new line fields and log event**

In `create_quote`, update the line creation loop (inside `for i, line_data in enumerate(data.lines, start=1):`):
```python
    for i, line_data in enumerate(data.lines, start=1):
        amount = _calc_line_amount(
            line_data.quantity, line_data.unit_price,
            line_data.discount_percent, line_data.tax_percent,
        )
        line = QuoteLine(
            workspace_id=workspace_id,
            quote_id=quote.id,
            line_order=line_data.line_order or i,
            sku=line_data.sku,
            description=line_data.description,
            unit=line_data.unit,
            quantity=line_data.quantity,
            unit_price=line_data.unit_price,
            discount_percent=line_data.discount_percent,
            tax_percent=line_data.tax_percent,
            notes=line_data.notes,
            amount=amount,
            product_id=line_data.product_id,
        )
        db.add(line)
```

After `await _recalculate_totals(db, quote)` and before `await publish_event(...)`, add:
```python
    _log_event(db, workspace_id, quote.id, actor_id, "created", f"Cotización creada: {quote.quote_number}")
```

- [ ] **Step 5: Update `add_line` to pass new line fields and log event**

In `add_line`, replace the `QuoteLine(...)` constructor:
```python
    amount = _calc_line_amount(data.quantity, data.unit_price, data.discount_percent, data.tax_percent)
    line = QuoteLine(
        workspace_id=workspace_id,
        quote_id=quote.id,
        line_order=data.line_order,
        sku=data.sku,
        description=data.description,
        unit=data.unit,
        quantity=data.quantity,
        unit_price=data.unit_price,
        discount_percent=data.discount_percent,
        tax_percent=data.tax_percent,
        notes=data.notes,
        amount=amount,
        product_id=data.product_id,
    )
```

After `await _recalculate_totals(db, quote)` and before `await db.commit()`, add:
```python
    _log_event(db, workspace_id, quote_id, None, "line_added", f"Línea agregada: {data.description}")
```

- [ ] **Step 6: Add event logging to `remove_line`, `send_quote`, `accept_quote`, `reject_quote`**

In `remove_line`, after `await _recalculate_totals(db, quote)` and before `await db.commit()`:
```python
    _log_event(db, workspace_id, quote_id, None, "line_removed", f"Línea eliminada: {line.description}")
```

In `send_quote`, after `quote.sent_at = datetime.now(timezone.utc)`:
```python
    _log_event(db, workspace_id, quote_id, actor_id, "sent", "Cotización enviada")
```

In `accept_quote`, after `quote.accepted_at = now`:
```python
    _log_event(db, workspace_id, quote_id, actor_id, "accepted", "Cotización aceptada — orden de venta creada")
```

In `reject_quote`, after `quote.rejected_at = datetime.now(timezone.utc)`:
```python
    _log_event(db, workspace_id, quote_id, actor_id, "rejected", f"Cotización rechazada. Razón: {data.reason or '—'}")
```

- [ ] **Step 7: Add `update_line` function**

Add after `remove_line`:
```python
async def update_line(
    db: AsyncSession,
    workspace_id: str,
    quote_id: str,
    line_id: str,
    actor_id: str,
    data: "QuoteLineUpdate",
) -> Quote:
    quote = await _load_quote(db, workspace_id, quote_id)
    if quote.status != "draft":
        raise HTTPException(status_code=409, detail="Only draft quotes can be modified")

    line = next((l for l in quote.lines if l.id == line_id), None)
    if not line:
        raise HTTPException(status_code=404, detail="Line not found")

    changes = data.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(line, field, value)

    line.amount = _calc_line_amount(line.quantity, line.unit_price, line.discount_percent, line.tax_percent)

    await db.flush()
    await db.refresh(quote, attribute_names=["lines"])
    await _recalculate_totals(db, quote)

    desc_parts = [f"{k}: {v}" for k, v in changes.items()]
    _log_event(
        db, workspace_id, quote_id, actor_id, "line_updated",
        f"Línea modificada — {', '.join(desc_parts)}",
        metadata=changes,
    )

    await db.commit()
    return await _reload_quote(db, workspace_id, quote_id)
```

- [ ] **Step 8: Add `replace_lines` function**

Add after `update_line`:
```python
async def replace_lines(
    db: AsyncSession,
    workspace_id: str,
    quote_id: str,
    actor_id: str,
    lines_data: list["QuoteLineUpsert"],
) -> Quote:
    quote = await _load_quote(db, workspace_id, quote_id)
    if quote.status != "draft":
        raise HTTPException(status_code=409, detail="Only draft quotes can be modified")

    incoming_ids = {d.id for d in lines_data if d.id}

    # Delete lines not in payload
    for line in list(quote.lines):
        if line.id not in incoming_ids:
            await db.delete(line)

    await db.flush()
    await db.refresh(quote, attribute_names=["lines"])

    existing_by_id = {l.id: l for l in quote.lines}

    for i, ld in enumerate(lines_data, start=1):
        amount = _calc_line_amount(ld.quantity, ld.unit_price, ld.discount_percent, ld.tax_percent)
        if ld.id and ld.id in existing_by_id:
            line = existing_by_id[ld.id]
            line.line_order = ld.line_order or i
            line.sku = ld.sku
            line.description = ld.description
            line.unit = ld.unit
            line.quantity = ld.quantity
            line.unit_price = ld.unit_price
            line.discount_percent = ld.discount_percent
            line.tax_percent = ld.tax_percent
            line.notes = ld.notes
            line.product_id = ld.product_id
            line.amount = amount
        else:
            db.add(QuoteLine(
                workspace_id=workspace_id,
                quote_id=quote_id,
                line_order=ld.line_order or i,
                sku=ld.sku,
                description=ld.description,
                unit=ld.unit,
                quantity=ld.quantity,
                unit_price=ld.unit_price,
                discount_percent=ld.discount_percent,
                tax_percent=ld.tax_percent,
                notes=ld.notes,
                product_id=ld.product_id,
                amount=amount,
            ))

    await db.flush()
    await db.refresh(quote, attribute_names=["lines"])
    await _recalculate_totals(db, quote)
    _log_event(db, workspace_id, quote_id, actor_id, "updated", "Líneas actualizadas (batch)")

    await db.commit()
    return await _reload_quote(db, workspace_id, quote_id)
```

- [ ] **Step 9: Add `get_history` function**

Add after `replace_lines`:
```python
async def get_history(
    db: AsyncSession,
    workspace_id: str,
    quote_id: str,
) -> list[QuoteEvent]:
    await _load_quote(db, workspace_id, quote_id)  # 404 if not found / wrong workspace
    result = await db.execute(
        select(QuoteEvent)
        .where(QuoteEvent.workspace_id == workspace_id, QuoteEvent.quote_id == quote_id)
        .order_by(QuoteEvent.created_at.desc())
    )
    return result.scalars().all()
```

- [ ] **Step 10: Update schema imports in service.py**

Add `QuoteLineUpdate` and `QuoteLineUpsert` to the existing imports from `app.modules.sales.schemas`:
```python
from app.modules.sales.schemas import (
    QuoteCreate,
    QuoteLineCreate,
    QuoteLineUpdate,
    QuoteLineUpsert,
    QuoteReject,
    QuoteUpdate,
    SalesOrderConfirm,
    SalesOrderCreate,
)
```

- [ ] **Step 11: Verify the app boots with no import errors**

```bash
docker compose exec backend python -c "from app.modules.sales import service; print('OK')"
```

Expected: `OK`

- [ ] **Step 12: Commit**

```bash
git add backend/app/modules/sales/service.py
git commit -m "feat(sales): updated line calc with tax_percent; add update_line, replace_lines, get_history, event logging"
```

---

## Task 4: Router — 3 new endpoints

**Files:**
- Modify: `backend/app/modules/sales/router.py`

- [ ] **Step 1: Add schema imports**

In `router.py`, add to the existing import from `app.modules.sales.schemas`:
```python
from app.modules.sales.schemas import (
    QuoteCreate,
    QuoteEventRead,
    QuoteLineCreate,
    QuoteLineUpdate,
    QuoteLineUpsert,
    QuoteRead,
    QuoteReject,
    QuoteUpdate,
    SalesOrderConfirm,
    SalesOrderCreate,
    SalesOrderRead,
)
```

- [ ] **Step 2: Add 3 new endpoints after the existing `remove_line` endpoint**

After the `remove_line` endpoint (after line ~93 in router.py), add:
```python
@router.patch("/quotes/{quote_id}/lines/{line_id}", response_model=QuoteRead)
async def update_line(
    quote_id: str,
    line_id: str,
    data: QuoteLineUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.update_line(db, workspace_id, quote_id, line_id, current_user.id, data)


@router.put("/quotes/{quote_id}/lines", response_model=QuoteRead)
async def replace_lines(
    quote_id: str,
    lines: list[QuoteLineUpsert],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.replace_lines(db, workspace_id, quote_id, current_user.id, lines)


@router.get("/quotes/{quote_id}/history", response_model=list[QuoteEventRead])
async def get_history(
    quote_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.get_history(db, workspace_id, quote_id)
```

- [ ] **Step 3: Verify endpoints appear in OpenAPI**

```bash
docker compose exec backend python -c "
from app.main import app
routes = [r.path for r in app.routes]
assert '/api/v1/sales/quotes/{quote_id}/lines/{line_id}' in routes
assert '/api/v1/sales/quotes/{quote_id}/history' in routes
print('OK')
"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/app/modules/sales/router.py
git commit -m "feat(sales): add PATCH/PUT /lines and GET /history endpoints"
```

---

## Task 5: Backend tests

**Files:**
- Create: `backend/tests/test_sales_quote_lines.py`

- [ ] **Step 1: Write the tests**

Create `backend/tests/test_sales_quote_lines.py`:

```python
"""
Tests for quote line editing endpoints:
  PATCH /sales/quotes/{id}/lines/{line_id}
  PUT   /sales/quotes/{id}/lines
  GET   /sales/quotes/{id}/history
"""
import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio
BASE = "/api/v1/sales"


async def _create_quote(client: AsyncClient, headers: dict) -> dict:
    resp = await client.post(f"{BASE}/quotes", headers=headers, json={
        "title": "Line Test Quote",
        "currency": "USD",
        "tax_rate": 0,
        "discount_amount": 0,
        "lines": [
            {"description": "Widget A", "quantity": 2, "unit_price": 100.0, "discount_percent": 0, "tax_percent": 10},
        ],
    })
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── PATCH /lines/{line_id} ────────────────────────────────────────────────────

async def test_update_line_changes_description(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers)
    line_id = quote["lines"][0]["id"]

    resp = await client.patch(
        f"{BASE}/quotes/{quote['id']}/lines/{line_id}",
        headers=auth_headers,
        json={"description": "Widget Z"},
    )
    assert resp.status_code == 200
    updated = resp.json()
    assert updated["lines"][0]["description"] == "Widget Z"


async def test_update_line_recalculates_totals(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers)
    line_id = quote["lines"][0]["id"]

    # qty=2, price=100, disc=0, tax=10 → pretax=200, tax=20, amount=220
    assert quote["lines"][0]["amount"] == pytest.approx(220.0)
    assert quote["subtotal"] == pytest.approx(200.0)
    assert quote["tax_amount"] == pytest.approx(20.0)
    assert quote["total"] == pytest.approx(220.0)

    resp = await client.patch(
        f"{BASE}/quotes/{quote['id']}/lines/{line_id}",
        headers=auth_headers,
        json={"quantity": 3},
    )
    updated = resp.json()
    # qty=3, price=100, disc=0, tax=10 → pretax=300, tax=30, amount=330
    assert updated["lines"][0]["amount"] == pytest.approx(330.0)
    assert updated["subtotal"] == pytest.approx(300.0)
    assert updated["tax_amount"] == pytest.approx(30.0)
    assert updated["total"] == pytest.approx(330.0)


async def test_update_line_returns_new_fields(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers)
    line_id = quote["lines"][0]["id"]

    resp = await client.patch(
        f"{BASE}/quotes/{quote['id']}/lines/{line_id}",
        headers=auth_headers,
        json={"sku": "SKU-001", "unit": "hrs", "notes": "Rush delivery"},
    )
    assert resp.status_code == 200
    line = resp.json()["lines"][0]
    assert line["sku"] == "SKU-001"
    assert line["unit"] == "hrs"
    assert line["notes"] == "Rush delivery"


async def test_update_line_on_sent_quote_returns_409(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers)
    await client.patch(f"{BASE}/quotes/{quote['id']}/send", headers=auth_headers)
    line_id = quote["lines"][0]["id"]

    resp = await client.patch(
        f"{BASE}/quotes/{quote['id']}/lines/{line_id}",
        headers=auth_headers,
        json={"quantity": 5},
    )
    assert resp.status_code == 409


async def test_update_line_with_wrong_line_id_returns_404(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers)
    resp = await client.patch(
        f"{BASE}/quotes/{quote['id']}/lines/nonexistent-id",
        headers=auth_headers,
        json={"quantity": 1},
    )
    assert resp.status_code == 404


# ── PUT /lines ────────────────────────────────────────────────────────────────

async def test_replace_lines_reorders(client: AsyncClient, auth_headers: dict):
    # Create quote with 2 lines
    resp = await client.post(f"{BASE}/quotes", headers=auth_headers, json={
        "title": "Reorder Test",
        "currency": "USD",
        "tax_rate": 0,
        "discount_amount": 0,
        "lines": [
            {"description": "First", "quantity": 1, "unit_price": 10, "discount_percent": 0, "tax_percent": 0, "line_order": 1},
            {"description": "Second", "quantity": 1, "unit_price": 20, "discount_percent": 0, "tax_percent": 0, "line_order": 2},
        ],
    })
    quote = resp.json()
    line_a_id = next(l["id"] for l in quote["lines"] if l["description"] == "First")
    line_b_id = next(l["id"] for l in quote["lines"] if l["description"] == "Second")

    # Swap order
    resp = await client.put(
        f"{BASE}/quotes/{quote['id']}/lines",
        headers=auth_headers,
        json=[
            {"id": line_b_id, "description": "Second", "quantity": 1, "unit_price": 20, "discount_percent": 0, "tax_percent": 0, "line_order": 1},
            {"id": line_a_id, "description": "First", "quantity": 1, "unit_price": 10, "discount_percent": 0, "tax_percent": 0, "line_order": 2},
        ],
    )
    assert resp.status_code == 200
    lines = resp.json()["lines"]
    assert lines[0]["description"] == "Second"
    assert lines[1]["description"] == "First"


async def test_replace_lines_deletes_omitted_lines(client: AsyncClient, auth_headers: dict):
    resp = await client.post(f"{BASE}/quotes", headers=auth_headers, json={
        "title": "Delete Test",
        "currency": "USD",
        "tax_rate": 0,
        "discount_amount": 0,
        "lines": [
            {"description": "Keep", "quantity": 1, "unit_price": 10, "discount_percent": 0, "tax_percent": 0},
            {"description": "Delete me", "quantity": 1, "unit_price": 5, "discount_percent": 0, "tax_percent": 0},
        ],
    })
    quote = resp.json()
    keep_id = next(l["id"] for l in quote["lines"] if l["description"] == "Keep")

    resp = await client.put(
        f"{BASE}/quotes/{quote['id']}/lines",
        headers=auth_headers,
        json=[
            {"id": keep_id, "description": "Keep", "quantity": 1, "unit_price": 10, "discount_percent": 0, "tax_percent": 0, "line_order": 1},
        ],
    )
    assert resp.status_code == 200
    assert len(resp.json()["lines"]) == 1
    assert resp.json()["lines"][0]["description"] == "Keep"


async def test_replace_lines_on_sent_quote_returns_409(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers)
    await client.patch(f"{BASE}/quotes/{quote['id']}/send", headers=auth_headers)

    resp = await client.put(
        f"{BASE}/quotes/{quote['id']}/lines",
        headers=auth_headers,
        json=[],
    )
    assert resp.status_code == 409


# ── GET /history ──────────────────────────────────────────────────────────────

async def test_history_has_created_event(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers)
    resp = await client.get(f"{BASE}/quotes/{quote['id']}/history", headers=auth_headers)
    assert resp.status_code == 200
    events = resp.json()
    assert len(events) >= 1
    types = [e["event_type"] for e in events]
    assert "created" in types


async def test_history_records_line_update(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers)
    line_id = quote["lines"][0]["id"]
    await client.patch(
        f"{BASE}/quotes/{quote['id']}/lines/{line_id}",
        headers=auth_headers,
        json={"quantity": 5},
    )
    resp = await client.get(f"{BASE}/quotes/{quote['id']}/history", headers=auth_headers)
    types = [e["event_type"] for e in resp.json()]
    assert "line_updated" in types


async def test_history_newest_first(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers)
    line_id = quote["lines"][0]["id"]
    await client.patch(
        f"{BASE}/quotes/{quote['id']}/lines/{line_id}",
        headers=auth_headers,
        json={"quantity": 3},
    )
    resp = await client.get(f"{BASE}/quotes/{quote['id']}/history", headers=auth_headers)
    events = resp.json()
    # First event in list should be the most recent (line_updated)
    assert events[0]["event_type"] == "line_updated"


async def test_history_is_readable_for_non_draft_quote(client: AsyncClient, auth_headers: dict):
    quote = await _create_quote(client, auth_headers)
    await client.patch(f"{BASE}/quotes/{quote['id']}/send", headers=auth_headers)
    resp = await client.get(f"{BASE}/quotes/{quote['id']}/history", headers=auth_headers)
    assert resp.status_code == 200
```

- [ ] **Step 2: Run the tests**

```bash
docker compose exec backend pytest tests/test_sales_quote_lines.py -v --tb=short
```

Expected: all tests PASS.

- [ ] **Step 3: Run the full test suite to catch regressions**

```bash
docker compose exec backend pytest tests/ -v --tb=short
```

Expected: all existing tests still PASS (the calc change may affect totals — the existing `test_create_quote_returns_201` test expects `total == 200.0`, which with `tax_rate=0` should still be 200.0).

- [ ] **Step 4: Commit**

```bash
git add backend/tests/test_sales_quote_lines.py
git commit -m "test(sales): add tests for update_line, replace_lines, get_history endpoints"
```

---

## Task 6: Frontend — shared QuoteStatusBadge + new sales.ts types

**Files:**
- Create: `composable-os/src/components/sales/QuoteStatusBadge.tsx`
- Modify: `composable-os/src/services/sales.ts`
- Modify: `composable-os/src/pages/Sales.tsx`

- [ ] **Step 1: Create the shared QuoteStatusBadge component**

Create `composable-os/src/components/sales/QuoteStatusBadge.tsx`:

```tsx
import { Badge } from "@/components/ui/badge";

type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

const STATUS_MAP: Record<QuoteStatus, {
  variant: "secondary" | "default" | "destructive" | "outline";
  label: string;
  className?: string;
}> = {
  draft:    { variant: "secondary",   label: "Draft" },
  sent:     { variant: "default",     label: "Sent" },
  accepted: { variant: "secondary",   label: "Accepted", className: "bg-green-100 text-green-700 border-green-200" },
  rejected: { variant: "destructive", label: "Rejected" },
  expired:  { variant: "secondary",   label: "Expired",  className: "bg-orange-100 text-orange-700 border-orange-200" },
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const cfg = STATUS_MAP[status] ?? { variant: "secondary" as const, label: status };
  return (
    <Badge variant={cfg.variant} className={cfg.className}>
      {cfg.label}
    </Badge>
  );
}
```

- [ ] **Step 2: Update Sales.tsx to import the shared component**

In `composable-os/src/pages/Sales.tsx`:

Remove the inline `QuoteStatusBadge` component definition (the function starting at line 29 through line 43) and add this import at the top of the file (with the other imports):
```tsx
import { QuoteStatusBadge } from "@/components/sales/QuoteStatusBadge";
```

Also remove the `type QuoteStatus = Quote["status"];` line since it's now in the shared component.

Also add `useNavigate` to the react-router-dom import if not already present:
```tsx
import { useNavigate } from "react-router-dom";
```

Inside the `QuotesTab` component function body, add:
```tsx
const navigate = useNavigate();
```

Make each `<TableRow key={quote.id}>` clickable by adding `onClick` and `cursor-pointer`:
```tsx
<TableRow
  key={quote.id}
  className="cursor-pointer"
  onClick={() => navigate(`/sales/quotes/${quote.id}`)}
>
```

Important: wrap the action buttons' `onClick` handlers with `e.stopPropagation()` to prevent row navigation when clicking buttons:
```tsx
onClick={(e) => { e.stopPropagation(); sendQuote.mutate(quote.id); }}
```
Do this for all action button `onClick` handlers inside the quote `<TableRow>`.

- [ ] **Step 3: Add new types and methods to sales.ts**

In `composable-os/src/services/sales.ts`:

1. Add new fields to `QuoteLine` interface:
```ts
export interface QuoteLine {
  id: string;
  quote_id: string;
  line_order: number;
  sku: string | null;
  description: string;
  unit: string | null;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_percent: number;
  amount: number;
  notes: string | null;
  product_id: string | null;
  created_at: string;
  updated_at: string;
}
```

2. Add `QuoteLineUpdate` interface after `CreateQuoteLineDto`:
```ts
export interface QuoteLineUpdateDto {
  sku?: string | null;
  description?: string;
  unit?: string | null;
  quantity?: number;
  unit_price?: number;
  discount_percent?: number;
  tax_percent?: number;
  notes?: string | null;
  line_order?: number;
  product_id?: string | null;
}
```

3. Add `QuoteLineUpsertDto` after `QuoteLineUpdateDto`:
```ts
export interface QuoteLineUpsertDto {
  id?: string;
  sku?: string | null;
  description: string;
  unit?: string | null;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_percent: number;
  notes?: string | null;
  line_order: number;
  product_id?: string | null;
}
```

4. Add `QuoteEvent` interface after `QuoteLineUpsertDto`:
```ts
export interface QuoteEvent {
  id: string;
  quote_id: string;
  user_id: string | null;
  event_type: string;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
```

5. Add new service methods inside `salesService` after `getQuotePdfUrl`:
```ts
  updateLine: (quoteId: string, lineId: string, dto: QuoteLineUpdateDto) =>
    api.patch<Quote>(`/sales/quotes/${quoteId}/lines/${lineId}`, dto),
  replaceLines: (quoteId: string, lines: QuoteLineUpsertDto[]) =>
    api.put<Quote>(`/sales/quotes/${quoteId}/lines`, lines),
  getQuoteHistory: (quoteId: string) =>
    api.get<QuoteEvent[]>(`/sales/quotes/${quoteId}/history`),
```

Note: `api.put` may not exist yet. Check `composable-os/src/lib/api.ts`. If it only has `get`, `post`, `patch`, `delete`, add a `put` method using the same pattern as `patch`.

- [ ] **Step 4: Check and add `put` to the api client if missing**

Read `composable-os/src/lib/api.ts`. If there is no `put` method, add it following the exact same pattern as `patch`.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd composable-os && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 6: Commit**

```bash
git add composable-os/src/components/sales/QuoteStatusBadge.tsx composable-os/src/services/sales.ts composable-os/src/pages/Sales.tsx composable-os/src/lib/api.ts
git commit -m "feat(sales): extract QuoteStatusBadge; add QuoteLineUpdate/Upsert/Event types; add updateLine/replaceLines/getHistory service methods"
```

---

## Task 7: Frontend — QuoteDetail page

**Files:**
- Create: `composable-os/src/pages/QuoteDetail.tsx`

- [ ] **Step 1: Write the QuoteDetail page**

Create `composable-os/src/pages/QuoteDetail.tsx`:

```tsx
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  salesService,
  type Quote,
  type QuoteLine,
  type QuoteLineUpdateDto,
  type QuoteLineUpsertDto,
  type QuoteEvent,
} from "@/services/sales";
import { QuoteStatusBadge } from "@/components/sales/QuoteStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "USD" }).format(n);
}

function calcLineAmount(qty: number, price: number, disc: number, tax: number): number {
  const pretax = qty * price * (1 - disc / 100);
  return pretax * (1 + tax / 100);
}

// ── Inline editable cell ──────────────────────────────────────────────────────

interface EditableCellProps {
  value: string | number;
  lineId: string;
  field: keyof QuoteLineUpdateDto;
  disabled: boolean;
  type?: "text" | "number";
  className?: string;
  onSave: (lineId: string, field: keyof QuoteLineUpdateDto, value: string | number) => void;
}

function EditableCell({ value, lineId, field, disabled, type = "text", className = "", onSave }: EditableCellProps) {
  if (disabled) {
    return <span className={`text-xs ${className}`}>{value ?? "—"}</span>;
  }
  return (
    <Input
      key={`${lineId}-${field}-${String(value)}`}
      type={type}
      defaultValue={String(value ?? "")}
      onBlur={(e) => {
        const raw = e.target.value;
        const parsed = type === "number" ? parseFloat(raw) : raw;
        if (String(parsed) !== String(value)) {
          onSave(lineId, field, parsed);
        }
      }}
      className={`h-7 text-xs px-1 min-w-0 ${className}`}
    />
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: quote, isLoading, error } = useQuery({
    queryKey: ["quote", id],
    queryFn: () => salesService.getQuote(id!),
    enabled: !!id,
  });

  const { data: history } = useQuery({
    queryKey: ["quote-history", id],
    queryFn: () => salesService.getQuoteHistory(id!),
    enabled: !!id,
  });

  const invalidateQuote = () => {
    qc.invalidateQueries({ queryKey: ["quote", id] });
    qc.invalidateQueries({ queryKey: ["quote-history", id] });
  };

  // ── Line mutations ─────────────────────────────────────────────────────────

  const updateLineMutation = useMutation({
    mutationFn: ({ lineId, data }: { lineId: string; data: QuoteLineUpdateDto }) =>
      salesService.updateLine(id!, lineId, data),
    onSuccess: invalidateQuote,
    onError: (e: Error) => toast.error(`Error al guardar: ${e.message}`),
  });

  const addLineMutation = useMutation({
    mutationFn: () =>
      salesService.addLine(id!, {
        description: "Nueva línea",
        quantity: 1,
        unit_price: 0,
        discount_percent: 0,
        tax_percent: 0,
        line_order: (quote?.lines.length ?? 0) + 1,
      }),
    onSuccess: invalidateQuote,
    onError: (e: Error) => toast.error(e.message),
  });

  const removeLineMutation = useMutation({
    mutationFn: (lineId: string) => salesService.removeLine(id!, lineId),
    onSuccess: invalidateQuote,
    onError: (e: Error) => toast.error(e.message),
  });

  const replaceLinesMutation = useMutation({
    mutationFn: (lines: QuoteLineUpsertDto[]) => salesService.replaceLines(id!, lines),
    onSuccess: invalidateQuote,
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Quote-level mutations ──────────────────────────────────────────────────

  const updateQuoteMutation = useMutation({
    mutationFn: (data: Parameters<typeof salesService.updateQuote>[1]) =>
      salesService.updateQuote(id!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quote", id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const sendMutation = useMutation({
    mutationFn: () => salesService.sendQuote(id!),
    onSuccess: () => { invalidateQuote(); toast.success("Cotización enviada"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const acceptMutation = useMutation({
    mutationFn: () => salesService.acceptQuote(id!),
    onSuccess: () => {
      invalidateQuote();
      qc.invalidateQueries({ queryKey: ["sales-quotes"] });
      qc.invalidateQueries({ queryKey: ["sales-orders"] });
      toast.success("Cotización aceptada — orden creada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: () => salesService.rejectQuote(id!),
    onSuccess: () => { invalidateQuote(); toast.success("Cotización rechazada"); },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleCellSave(lineId: string, field: keyof QuoteLineUpdateDto, value: string | number) {
    updateLineMutation.mutate({ lineId, data: { [field]: value } });
  }

  const isDraft = quote?.status === "draft";

  // ── Loading / error states ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-muted-foreground">Cotización no encontrada.</p>
        <Button variant="outline" onClick={() => navigate("/sales")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Volver a Ventas
        </Button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/sales")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Cotizaciones
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">{quote.quote_number}</span>
              <QuoteStatusBadge status={quote.status} />
            </div>
            <h1 className="text-xl font-semibold mt-0.5">{quote.title}</h1>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {quote.status === "draft" && (
            <Button
              size="sm"
              disabled={sendMutation.isPending || !quote.lines.length}
              onClick={() => sendMutation.mutate()}
            >
              {sendMutation.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              Enviar
            </Button>
          )}
          {quote.status === "sent" && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-green-700 border-green-300 hover:bg-green-50"
                disabled={acceptMutation.isPending}
                onClick={() => acceptMutation.mutate()}
              >
                Aceptar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-700 border-red-300 hover:bg-red-50"
                disabled={rejectMutation.isPending}
                onClick={() => rejectMutation.mutate()}
              >
                Rechazar
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(salesService.getQuotePdfUrl(id!), "_blank")}
          >
            <Download className="h-3 w-3 mr-1" /> PDF
          </Button>
        </div>
      </div>

      {/* Lines table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Líneas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="w-8">#</TableHead>
                  <TableHead className="w-24">SKU</TableHead>
                  <TableHead className="min-w-[180px]">Descripción</TableHead>
                  <TableHead className="w-20">Unidad</TableHead>
                  <TableHead className="w-20 text-right">Cant.</TableHead>
                  <TableHead className="w-24 text-right">P. Unit</TableHead>
                  <TableHead className="w-16 text-right">Desc%</TableHead>
                  <TableHead className="w-16 text-right">IVA%</TableHead>
                  <TableHead className="w-28 text-right">Total línea</TableHead>
                  <TableHead className="min-w-[120px]">Notas</TableHead>
                  {isDraft && <TableHead className="w-8" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {quote.lines.map((line, idx) => {
                  const lineTotal = calcLineAmount(line.quantity, line.unit_price, line.discount_percent, line.tax_percent);
                  return (
                    <TableRow key={line.id}>
                      <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <EditableCell value={line.sku ?? ""} lineId={line.id} field="sku" disabled={!isDraft} onSave={handleCellSave} />
                      </TableCell>
                      <TableCell>
                        <EditableCell value={line.description} lineId={line.id} field="description" disabled={!isDraft} className="w-full" onSave={handleCellSave} />
                      </TableCell>
                      <TableCell>
                        <EditableCell value={line.unit ?? ""} lineId={line.id} field="unit" disabled={!isDraft} onSave={handleCellSave} />
                      </TableCell>
                      <TableCell className="text-right">
                        <EditableCell value={line.quantity} lineId={line.id} field="quantity" type="number" disabled={!isDraft} className="text-right" onSave={handleCellSave} />
                      </TableCell>
                      <TableCell className="text-right">
                        <EditableCell value={line.unit_price} lineId={line.id} field="unit_price" type="number" disabled={!isDraft} className="text-right" onSave={handleCellSave} />
                      </TableCell>
                      <TableCell className="text-right">
                        <EditableCell value={line.discount_percent} lineId={line.id} field="discount_percent" type="number" disabled={!isDraft} className="text-right" onSave={handleCellSave} />
                      </TableCell>
                      <TableCell className="text-right">
                        <EditableCell value={line.tax_percent} lineId={line.id} field="tax_percent" type="number" disabled={!isDraft} className="text-right" onSave={handleCellSave} />
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {fmtCurrency(lineTotal)}
                      </TableCell>
                      <TableCell>
                        <EditableCell value={line.notes ?? ""} lineId={line.id} field="notes" disabled={!isDraft} onSave={handleCellSave} />
                      </TableCell>
                      {isDraft && (
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            disabled={removeLineMutation.isPending}
                            onClick={() => removeLineMutation.mutate(line.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
                {quote.lines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isDraft ? 11 : 10} className="text-center text-muted-foreground text-sm py-8">
                      Sin líneas. {isDraft && "Agrega una para comenzar."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {isDraft && (
            <div className="p-3 border-t">
              <Button
                size="sm"
                variant="outline"
                className="gap-1 h-7 text-xs"
                disabled={addLineMutation.isPending}
                onClick={() => addLineMutation.mutate()}
              >
                {addLineMutation.isPending
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Plus className="h-3 w-3" />}
                Agregar línea
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Totals */}
      <div className="flex justify-end">
        <Card className="w-72">
          <CardContent className="pt-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{fmtCurrency(quote.subtotal)}</span>
            </div>
            {quote.discount_amount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Descuento</span>
                <span>-{fmtCurrency(quote.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Impuestos</span>
              <span>{fmtCurrency(quote.tax_amount)}</span>
            </div>
            <div className="flex justify-between font-semibold text-base border-t pt-1.5 mt-1">
              <span>Total</span>
              <span>{fmtCurrency(quote.total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes & Terms */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Notas generales</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              key={`notes-${quote.updated_at}`}
              defaultValue={quote.notes ?? ""}
              disabled={!isDraft}
              rows={4}
              placeholder="Notas visibles al cliente..."
              onBlur={(e) => {
                if (e.target.value !== (quote.notes ?? "")) {
                  updateQuoteMutation.mutate({ notes: e.target.value });
                }
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Términos y condiciones</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              key={`terms-${quote.updated_at}`}
              defaultValue={quote.terms ?? ""}
              disabled={!isDraft}
              rows={4}
              placeholder="Términos de la cotización..."
              onBlur={(e) => {
                if (e.target.value !== (quote.terms ?? "")) {
                  updateQuoteMutation.mutate({ terms: e.target.value });
                }
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Historial</CardTitle>
        </CardHeader>
        <CardContent>
          {!history || history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin eventos registrados.</p>
          ) : (
            <ul className="space-y-2">
              {history.map((ev) => (
                <li key={ev.id} className="flex gap-3 text-sm">
                  <span className="text-muted-foreground text-xs whitespace-nowrap pt-0.5">
                    {format(new Date(ev.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                  </span>
                  <span>{ev.description}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd composable-os && npx tsc --noEmit 2>&1 | head -30
```

Fix any type errors before continuing.

- [ ] **Step 3: Commit**

```bash
git add composable-os/src/pages/QuoteDetail.tsx
git commit -m "feat(sales): add QuoteDetail page with inline-editable lines, totals, notes, and history"
```

---

## Task 8: App.tsx route + Sales.tsx row navigation

**Files:**
- Modify: `composable-os/src/App.tsx`

- [ ] **Step 1: Add the route and import**

In `composable-os/src/App.tsx`:

1. Add the import at the top (with other page imports):
```tsx
import QuoteDetail from "./pages/QuoteDetail";
```

2. Add the route inside the protected `<Route element={<RequireAuth><AppLayout /></RequireAuth>}>` block, after the `/sales` route:
```tsx
<Route path="/sales/quotes/:id" element={<QuoteDetail />} />
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd composable-os && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Smoke test in dev (optional but recommended)**

```bash
cd composable-os && npm run dev
```

Navigate to `/sales`, click a quote row, verify the detail page loads.

- [ ] **Step 4: Commit**

```bash
git add composable-os/src/App.tsx
git commit -m "feat(sales): add /sales/quotes/:id route for QuoteDetail page"
```

---

## Final Verification

- [ ] Run backend tests

```bash
docker compose exec backend pytest tests/ -v --tb=short
```

Expected: all pass.

- [ ] Run TypeScript check

```bash
cd composable-os && npx tsc --noEmit
```

Expected: no new errors.

- [ ] Manually test the full flow in the browser:
  1. Sales list → click a draft quote → see detail page
  2. Click a cell → type new value → click away → value saves (no error)
  3. Click "+ Agregar línea" → new row appears
  4. Delete a line → row disappears, totals update
  5. Edit Notas → blur → saved
  6. Click "Enviar" → status changes to Sent, inputs go read-only
  7. History section shows all events
