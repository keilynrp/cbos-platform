from typing import Sequence

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.events.bus import publish as publish_event
from app.events.types import (
    INVENTORY_LOW_THRESHOLD_DETECTED,
    INVENTORY_RELEASED,
    INVENTORY_RESERVED,
    STOCK_MOVEMENT_RECORDED,
    Event,
)
from app.modules.inventory.models import InventoryItem, Product, ProductCategory, StockMovement
from app.modules.inventory.schemas import (
    CategoryCreate,
    MovementCreate,
    OrderLineReserve,
    OrderReserveResult,
    ProductCreate,
    ProductUpdate,
    ReleaseRequest,
    ReserveRequest,
    StockLevel,
)


# ── Categories ────────────────────────────────────────────────────────────────

async def create_category(
    db: AsyncSession, workspace_id: str, data: CategoryCreate
) -> ProductCategory:
    cat = ProductCategory(workspace_id=workspace_id, **data.model_dump())
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return cat


async def list_categories(
    db: AsyncSession, workspace_id: str
) -> Sequence[ProductCategory]:
    result = await db.execute(
        select(ProductCategory)
        .where(ProductCategory.workspace_id == workspace_id)
        .order_by(ProductCategory.name)
    )
    return result.scalars().all()


# ── Products ──────────────────────────────────────────────────────────────────

async def create_product(
    db: AsyncSession, workspace_id: str, data: ProductCreate
) -> Product:
    # Check unique SKU
    existing = await db.execute(
        select(Product).where(
            Product.workspace_id == workspace_id, Product.sku == data.sku
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"SKU '{data.sku}' already exists")

    product = Product(workspace_id=workspace_id, **data.model_dump())
    db.add(product)
    await db.flush()

    # Create default inventory item (location: main) for physical products
    if not data.is_service:
        item = InventoryItem(
            workspace_id=workspace_id,
            product_id=product.id,
            location="main",
            current_stock=0.0,
            reserved_stock=0.0,
        )
        db.add(item)

    await db.commit()
    await db.refresh(product)
    return product


async def list_products(
    db: AsyncSession,
    workspace_id: str,
    category_id: str | None = None,
    is_active: bool | None = None,
    is_service: bool | None = None,
    limit: int = 100,
    offset: int = 0,
) -> Sequence[Product]:
    q = select(Product).where(Product.workspace_id == workspace_id)
    if category_id:
        q = q.where(Product.category_id == category_id)
    if is_active is not None:
        q = q.where(Product.is_active == is_active)
    if is_service is not None:
        q = q.where(Product.is_service == is_service)
    q = q.order_by(Product.name).limit(limit).offset(offset)
    result = await db.execute(q)
    return result.scalars().all()


async def get_product(db: AsyncSession, workspace_id: str, product_id: str) -> Product:
    result = await db.execute(
        select(Product).where(
            Product.id == product_id, Product.workspace_id == workspace_id
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


async def update_product(
    db: AsyncSession, workspace_id: str, product_id: str, data: ProductUpdate
) -> Product:
    product = await get_product(db, workspace_id, product_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    await db.commit()
    await db.refresh(product)
    return product


# ── Stock levels ──────────────────────────────────────────────────────────────

async def get_stock_levels(
    db: AsyncSession,
    workspace_id: str,
    product_id: str | None = None,
    location: str | None = None,
    low_stock_only: bool = False,
) -> list[StockLevel]:
    # Load products with their inventory items
    q = (
        select(Product)
        .options(selectinload(Product.inventory_items))
        .where(Product.workspace_id == workspace_id, Product.is_service == False)  # noqa: E712
    )
    if product_id:
        q = q.where(Product.id == product_id)
    result = await db.execute(q)
    products = result.scalars().all()

    levels = []
    for p in products:
        items = p.inventory_items
        if location:
            items = [i for i in items if i.location == location]

        total_current = sum(i.current_stock for i in items)
        total_reserved = sum(i.reserved_stock for i in items)
        total_available = sum(i.available_stock for i in items)
        is_low = total_available < p.min_stock

        if low_stock_only and not is_low:
            continue

        from app.modules.inventory.schemas import InventoryItemRead
        levels.append(StockLevel(
            product_id=p.id,
            sku=p.sku,
            name=p.name,
            unit=p.unit,
            min_stock=p.min_stock,
            total_current=total_current,
            total_reserved=total_reserved,
            total_available=total_available,
            is_low_stock=is_low,
            locations=[InventoryItemRead.model_validate(i) for i in items],
        ))

    return levels


async def _get_or_create_inventory_item(
    db: AsyncSession, workspace_id: str, product_id: str, location: str
) -> InventoryItem:
    result = await db.execute(
        select(InventoryItem).where(
            InventoryItem.workspace_id == workspace_id,
            InventoryItem.product_id == product_id,
            InventoryItem.location == location,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        item = InventoryItem(
            workspace_id=workspace_id,
            product_id=product_id,
            location=location,
            current_stock=0.0,
            reserved_stock=0.0,
        )
        db.add(item)
        await db.flush()
    return item


async def _check_low_stock(
    db: AsyncSession,
    workspace_id: str,
    product: Product,
    item: InventoryItem,
) -> None:
    """Emit InventoryLowThresholdDetected if available stock drops below min."""
    if product.min_stock > 0 and item.available_stock < product.min_stock:
        await publish_event(Event(
            event_type=INVENTORY_LOW_THRESHOLD_DETECTED,
            source_module="inventory",
            workspace_id=workspace_id,
            entity_id=product.id,
            payload={
                "product_id": product.id,
                "sku": product.sku,
                "name": product.name,
                "location": item.location,
                "available_stock": item.available_stock,
                "min_stock": product.min_stock,
            },
        ))


# ── Stock movements ───────────────────────────────────────────────────────────

async def record_movement(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str,
    data: MovementCreate,
) -> StockMovement:
    product = await get_product(db, workspace_id, data.product_id)

    if product.is_service:
        raise HTTPException(status_code=422, detail="Services do not track inventory")
    if data.movement_type not in ("in", "out", "adjustment"):
        raise HTTPException(status_code=422, detail="movement_type must be in | out | adjustment")

    item = await _get_or_create_inventory_item(db, workspace_id, product.id, data.location)

    stock_before = item.current_stock

    if data.movement_type == "in":
        item.current_stock += data.quantity
        qty_recorded = data.quantity
    elif data.movement_type == "out":
        if item.available_stock < data.quantity:
            raise HTTPException(
                status_code=409,
                detail=f"Insufficient available stock: {item.available_stock} {product.unit} available"
            )
        item.current_stock -= data.quantity
        qty_recorded = -data.quantity
    else:  # adjustment
        item.current_stock = data.quantity
        qty_recorded = data.quantity - stock_before

    movement = StockMovement(
        workspace_id=workspace_id,
        product_id=product.id,
        inventory_item_id=item.id,
        movement_type=data.movement_type,
        quantity=qty_recorded,
        stock_before=stock_before,
        stock_after=item.current_stock,
        reference_type=data.reference_type,
        reference_id=data.reference_id,
        notes=data.notes,
        user_id=actor_id,
    )
    db.add(movement)

    await publish_event(Event(
        event_type=STOCK_MOVEMENT_RECORDED,
        source_module="inventory",
        workspace_id=workspace_id,
        actor_id=actor_id,
        entity_id=product.id,
        payload={
            "product_id": product.id,
            "sku": product.sku,
            "movement_type": data.movement_type,
            "quantity": qty_recorded,
            "stock_before": stock_before,
            "stock_after": item.current_stock,
            "location": data.location,
        },
    ))

    await db.commit()
    await db.refresh(movement)

    # Check low stock after out movement
    if data.movement_type == "out":
        await _check_low_stock(db, workspace_id, product, item)

    return movement


async def reserve_stock(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str,
    data: ReserveRequest,
) -> StockMovement:
    product = await get_product(db, workspace_id, data.product_id)
    if product.is_service:
        raise HTTPException(status_code=422, detail="Services do not track inventory")

    item = await _get_or_create_inventory_item(db, workspace_id, product.id, data.location)

    if item.available_stock < data.quantity:
        raise HTTPException(
            status_code=409,
            detail=f"Insufficient available stock: {item.available_stock} {product.unit} available"
        )

    stock_before = item.current_stock
    item.reserved_stock += data.quantity

    movement = StockMovement(
        workspace_id=workspace_id,
        product_id=product.id,
        inventory_item_id=item.id,
        movement_type="reserve",
        quantity=data.quantity,
        stock_before=stock_before,
        stock_after=item.current_stock,  # current doesn't change on reserve
        reference_type=data.reference_type,
        reference_id=data.reference_id,
        notes=data.notes,
        user_id=actor_id,
    )
    db.add(movement)

    await publish_event(Event(
        event_type=INVENTORY_RESERVED,
        source_module="inventory",
        workspace_id=workspace_id,
        actor_id=actor_id,
        entity_id=product.id,
        payload={
            "product_id": product.id,
            "sku": product.sku,
            "quantity": data.quantity,
            "location": data.location,
            "reference_type": data.reference_type,
            "reference_id": data.reference_id,
            "available_after": item.available_stock,
        },
    ))

    await db.commit()
    await db.refresh(movement)
    await _check_low_stock(db, workspace_id, product, item)
    return movement


async def release_stock(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str,
    data: ReleaseRequest,
) -> StockMovement:
    product = await get_product(db, workspace_id, data.product_id)
    item = await _get_or_create_inventory_item(db, workspace_id, product.id, data.location)

    release_qty = min(data.quantity, item.reserved_stock)  # can't release more than reserved
    stock_before = item.current_stock
    item.reserved_stock -= release_qty

    movement = StockMovement(
        workspace_id=workspace_id,
        product_id=product.id,
        inventory_item_id=item.id,
        movement_type="release",
        quantity=release_qty,
        stock_before=stock_before,
        stock_after=item.current_stock,
        reference_type="manual",
        reference_id=data.reference_id,
        notes=data.notes,
        user_id=actor_id,
    )
    db.add(movement)

    await publish_event(Event(
        event_type=INVENTORY_RELEASED,
        source_module="inventory",
        workspace_id=workspace_id,
        actor_id=actor_id,
        entity_id=product.id,
        payload={
            "product_id": product.id,
            "sku": product.sku,
            "quantity": release_qty,
            "location": data.location,
            "reference_id": data.reference_id,
        },
    ))

    await db.commit()
    await db.refresh(movement)
    return movement


async def list_movements(
    db: AsyncSession,
    workspace_id: str,
    product_id: str | None = None,
    movement_type: str | None = None,
    reference_id: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> Sequence[StockMovement]:
    q = select(StockMovement).where(StockMovement.workspace_id == workspace_id)
    if product_id:
        q = q.where(StockMovement.product_id == product_id)
    if movement_type:
        q = q.where(StockMovement.movement_type == movement_type)
    if reference_id:
        q = q.where(StockMovement.reference_id == reference_id)
    q = q.order_by(StockMovement.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    return result.scalars().all()


# ── Auto-reserve for SalesOrder ───────────────────────────────────────────────

async def auto_reserve_for_order(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str,
    order_id: str,
    lines: list[OrderLineReserve],
) -> OrderReserveResult:
    """
    Best-effort reservation for a list of product lines.
    Called from the sales router when a quote is accepted.
    Skips lines without product_id, skips services, continues on stock failures.
    """
    reserved: list[str] = []
    failed: list[str] = []

    for line in lines:
        try:
            await reserve_stock(
                db, workspace_id, actor_id,
                ReserveRequest(
                    product_id=line.product_id,
                    quantity=line.quantity,
                    location=line.location,
                    reference_type="sales_order",
                    reference_id=order_id,
                    notes=f"Auto-reserved on order {order_id}",
                )
            )
            reserved.append(line.product_id)
        except HTTPException:
            failed.append(line.product_id)

    return OrderReserveResult(
        order_id=order_id,
        reserved=reserved,
        failed=failed,
        partial=len(failed) > 0,
    )
