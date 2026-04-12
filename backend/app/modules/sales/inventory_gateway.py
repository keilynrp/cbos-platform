"""
Sales→Inventory Gateway.
Centralizes all calls from the Sales domain to the Inventory domain.
See ADR 0007 for rationale.
"""
import logging
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def reserve_for_order(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str,
    order_id: str,
    lines: list[dict],  # [{"product_id": str, "quantity": float}]
) -> dict:
    """
    Best-effort stock reservation for all lines in an order.
    Returns {"reserved": [...], "failed": [...], "partial": bool}.
    Never raises — failures are logged and returned in the result.
    """
    from app.modules.inventory import service as inv_service
    from app.modules.inventory.schemas import OrderLineReserve

    try:
        result = await inv_service.auto_reserve_for_order(
            db, workspace_id, actor_id, order_id,
            [OrderLineReserve(product_id=l["product_id"], quantity=l["quantity"]) for l in lines],
        )
        return {
            "reserved": result.reserved,
            "failed": result.failed,
            "partial": result.partial,
        }
    except Exception as exc:
        logger.warning("reserve_for_order failed for order %s: %s", order_id, exc)
        return {"reserved": [], "failed": [l["product_id"] for l in lines], "partial": True}


async def consume_for_order(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str,
    order_id: str,
) -> None:
    """
    Convert all reservations for an order into actual stock consumption.
    Called when an order is fulfilled.
    """
    from app.modules.inventory import service as inv_service
    await inv_service.consume_reserved_stock(db, workspace_id, actor_id, order_id)


async def release_for_order(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str,
    order_id: str,
) -> None:
    """
    Release all stock reservations for a cancelled order.
    Called when an order is cancelled.
    """
    from app.modules.inventory import service as inv_service
    await inv_service.release_reservations_for_order(db, workspace_id, actor_id, order_id)
