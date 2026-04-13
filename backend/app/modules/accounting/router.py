from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_workspace_id
from app.modules.accounting import service
from app.modules.accounting.pdf import generate_invoice_pdf
from app.modules.accounting.schemas import (
    AccountingSummary,
    InvoiceCreate,
    InvoiceListItem,
    InvoiceRead,
    InvoiceUpdate,
    PaymentCreate,
    PaymentRead,
)
from app.modules.identity.models import User

router = APIRouter(prefix="/accounting", tags=["Accounting"])


@router.get("/summary", response_model=AccountingSummary)
async def get_summary(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.get_summary(db, workspace_id)


# ── Invoices ──────────────────────────────────────────────────────────────────

@router.get("/invoices", response_model=list[InvoiceListItem])
async def list_invoices(
    status: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.list_invoices(db, workspace_id, status=status, limit=limit, offset=offset)


@router.get("/invoices/{invoice_id}", response_model=InvoiceRead)
async def get_invoice(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    inv = await service.get_invoice(db, workspace_id, invoice_id)
    return InvoiceRead.model_validate(inv)


@router.post("/invoices", response_model=InvoiceRead, status_code=201)
async def create_invoice(
    data: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.create_invoice(db, workspace_id, current_user.id, data)


@router.patch("/invoices/{invoice_id}", response_model=InvoiceRead)
async def update_invoice(
    invoice_id: str,
    data: InvoiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.update_invoice(db, workspace_id, current_user.id, invoice_id, data)


@router.get("/invoices/{invoice_id}/pdf", response_class=Response)
async def download_invoice_pdf(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    """Download a PDF rendition of an invoice."""
    inv = await service.get_invoice(db, workspace_id, invoice_id)
    pdf_bytes = generate_invoice_pdf(inv)
    filename = f"{inv.invoice_number}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/invoices/{invoice_id}", status_code=204)
async def delete_invoice(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    await service.delete_invoice(db, workspace_id, invoice_id)


# ── Payments ──────────────────────────────────────────────────────────────────

@router.get("/invoices/{invoice_id}/payments", response_model=list[PaymentRead])
async def list_payments(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.list_payments(db, workspace_id, invoice_id)


@router.post("/invoices/{invoice_id}/payments", response_model=PaymentRead, status_code=201)
async def record_payment(
    invoice_id: str,
    data: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.record_payment(db, workspace_id, current_user.id, invoice_id, data)
