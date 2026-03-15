from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_workspace_id
from app.modules.identity.models import User
from app.modules.inventory import service
from app.modules.inventory.schemas import (
    CategoryCreate,
    CategoryRead,
    MovementCreate,
    MovementRead,
    OrderReserveRequest,
    OrderReserveResult,
    ProductCreate,
    ProductRead,
    ProductUpdate,
    ReleaseRequest,
    ReserveRequest,
    StockLevel,
)

router = APIRouter(prefix="/inventory", tags=["Inventory & Orders"])


# ── Categories ────────────────────────────────────────────────────────────────

@router.post("/categories", response_model=CategoryRead, status_code=201)
async def create_category(
    data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.create_category(db, workspace_id, data)


@router.get("/categories", response_model=list[CategoryRead])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.list_categories(db, workspace_id)


# ── Products ──────────────────────────────────────────────────────────────────

@router.post("/products", response_model=ProductRead, status_code=201)
async def create_product(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.create_product(db, workspace_id, data)


@router.get("/products", response_model=list[ProductRead])
async def list_products(
    category_id: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    is_service: bool | None = Query(default=None),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.list_products(db, workspace_id, category_id, is_active, is_service, limit, offset)


@router.get("/products/{product_id}", response_model=ProductRead)
async def get_product(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.get_product(db, workspace_id, product_id)


@router.patch("/products/{product_id}", response_model=ProductRead)
async def update_product(
    product_id: str,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.update_product(db, workspace_id, product_id, data)


# ── Stock ─────────────────────────────────────────────────────────────────────

@router.get("/stock", response_model=list[StockLevel])
async def get_stock_levels(
    product_id: str | None = Query(default=None),
    location: str | None = Query(default=None),
    low_stock_only: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.get_stock_levels(db, workspace_id, product_id, location, low_stock_only)


# ── Movements ─────────────────────────────────────────────────────────────────

@router.post("/movements", response_model=MovementRead, status_code=201)
async def record_movement(
    data: MovementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.record_movement(db, workspace_id, current_user.id, data)


@router.get("/movements", response_model=list[MovementRead])
async def list_movements(
    product_id: str | None = Query(default=None),
    movement_type: str | None = Query(default=None),
    reference_id: str | None = Query(default=None),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.list_movements(db, workspace_id, product_id, movement_type, reference_id, limit, offset)


# ── Reserve / Release ─────────────────────────────────────────────────────────

@router.post("/reserve", response_model=MovementRead, status_code=201)
async def reserve_stock(
    data: ReserveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.reserve_stock(db, workspace_id, current_user.id, data)


@router.post("/release", response_model=MovementRead, status_code=201)
async def release_stock(
    data: ReleaseRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    return await service.release_stock(db, workspace_id, current_user.id, data)


# ── Auto-reserve for order ────────────────────────────────────────────────────

@router.post("/orders/reserve", response_model=OrderReserveResult)
async def reserve_for_order(
    data: OrderReserveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    workspace_id: str = Depends(get_current_workspace_id),
):
    """Reserve stock for multiple products associated to a sales order."""
    return await service.auto_reserve_for_order(
        db, workspace_id, current_user.id, data.order_id, data.lines
    )
