import logging

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_workspace_id
from app.modules.identity.models import User
from app.modules.sales import service

logger = logging.getLogger(__name__)
from app.modules.sales.pdf import generate_quote_pdf
from app.modules.sales.schemas import (
    QuoteCreate,
    QuoteLineCreate,
    QuoteRead,
    QuoteReject,
    QuoteUpdate,
    SalesOrderConfirm,
    SalesOrderCreate,
    SalesOrderRead,
)

router = APIRouter(prefix="/sales", tags=["Sales Builder"])


# ── Quotes ────────────────────────────────────────────────────────────────────

@router.post("/quotes", response_model=QuoteRead, status_code=201)
async def create_quote(
    data: QuoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.create_quote(db, workspace_id, current_user.id, data)


@router.get("/quotes", response_model=list[QuoteRead])
async def list_quotes(
    status: str | None = Query(default=None),
    opportunity_id: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.list_quotes(db, workspace_id, status, opportunity_id, limit, offset)


@router.get("/quotes/{quote_id}", response_model=QuoteRead)
async def get_quote(
    quote_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.get_quote(db, workspace_id, quote_id)


@router.patch("/quotes/{quote_id}", response_model=QuoteRead)
async def update_quote(
    quote_id: str,
    data: QuoteUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.update_quote(db, workspace_id, quote_id, data)


@router.post("/quotes/{quote_id}/lines", response_model=QuoteRead, status_code=201)
async def add_line(
    quote_id: str,
    data: QuoteLineCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.add_line(db, workspace_id, quote_id, data)


@router.delete("/quotes/{quote_id}/lines/{line_id}", response_model=QuoteRead)
async def remove_line(
    quote_id: str,
    line_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.remove_line(db, workspace_id, quote_id, line_id)


@router.patch("/quotes/{quote_id}/send", response_model=QuoteRead)
async def send_quote(
    quote_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.send_quote(db, workspace_id, current_user.id, quote_id)


@router.patch("/quotes/{quote_id}/accept", response_model=SalesOrderRead)
async def accept_quote(
    quote_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    quote, order = await service.accept_quote(db, workspace_id, current_user.id, quote_id)

    # Auto-reserve inventory for lines that have a product_id linked.
    # Best-effort: a failure here never blocks the quote acceptance.
    lines_with_product = [
        line for line in quote.lines if line.product_id
    ]
    if lines_with_product:
        try:
            from app.modules.inventory import service as inv_service
            from app.modules.inventory.schemas import OrderLineReserve
            await inv_service.auto_reserve_for_order(
                db, workspace_id, current_user.id, order.id,
                [OrderLineReserve(product_id=l.product_id, quantity=l.quantity) for l in lines_with_product],
            )
        except Exception as exc:
            logger.warning("Auto-reserve failed for order %s: %s", order.id, exc)

    return order


@router.patch("/quotes/{quote_id}/reject", response_model=QuoteRead)
async def reject_quote(
    quote_id: str,
    data: QuoteReject,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.reject_quote(db, workspace_id, current_user.id, quote_id, data)


@router.get("/quotes/{quote_id}/pdf")
async def download_quote_pdf(
    quote_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    """Returns the quote as a downloadable PDF."""
    quote, contact_name, org_name = await service.get_quote_pdf_data(
        db, workspace_id, quote_id
    )

    # Use workspace name from the user's workspace
    # We'll pass workspace_id as a fallback name for now; Phase 4 can enrich this
    from app.modules.identity.models import Workspace
    from sqlalchemy import select
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    ws = result.scalar_one_or_none()
    workspace_name = ws.name if ws else workspace_id

    pdf_bytes = generate_quote_pdf(quote, workspace_name, contact_name, org_name)

    filename = f"{quote.quote_number}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Sales Orders ──────────────────────────────────────────────────────────────

@router.get("/orders", response_model=list[SalesOrderRead])
async def list_orders(
    status: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.list_orders(db, workspace_id, status, limit, offset)


@router.get("/orders/{order_id}", response_model=SalesOrderRead)
async def get_order(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.get_order(db, workspace_id, order_id)


@router.patch("/orders/{order_id}/confirm", response_model=SalesOrderRead)
async def confirm_order(
    order_id: str,
    data: SalesOrderConfirm,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.confirm_order(db, workspace_id, current_user.id, order_id, data)


@router.patch("/orders/{order_id}/start-fulfillment", response_model=SalesOrderRead)
async def start_fulfillment(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.start_fulfillment(db, workspace_id, current_user.id, order_id)


@router.patch("/orders/{order_id}/fulfill", response_model=SalesOrderRead)
async def fulfill_order(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.fulfill_order(db, workspace_id, current_user.id, order_id)


@router.patch("/orders/{order_id}/cancel", response_model=SalesOrderRead)
async def cancel_order(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.cancel_order(db, workspace_id, current_user.id, order_id)
