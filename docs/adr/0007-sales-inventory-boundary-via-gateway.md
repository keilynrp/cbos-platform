# ADR 0007 — Sales→Inventory Boundary via Gateway Pattern

**Status:** Accepted  
**Date:** 2026-04-11  
**Deciders:** Platform team

---

## Context

The Sales module calls Inventory functions directly in three places:

1. `sales/router.py` — `accept_quote` calls `inv_service.auto_reserve_for_order()` (best-effort)
2. `sales/service.py` — `fulfill_order` calls `inv_service.consume_reserved_stock()` (blocking)
3. `sales/service.py` — `cancel_order` calls `inv_service.release_reservations_for_order()` (blocking)

All imports are lazy (inside functions), but the calls are synchronous and direct. This creates an implicit coupling that:
- Scatters inventory logic across Sales files
- Makes the boundary hard to test (requires full Inventory service in tests)
- Would require touching multiple Sales files to change the integration contract

The coupling was flagged in the Implementation Alignment Gap Register (Sprint 5) and the Q2 backlog.

---

## Decision

Introduce a **Gateway module** at `sales/inventory_gateway.py` that:
1. Centralizes all Sales→Inventory calls in one file
2. Provides a clean interface (`reserve_for_order`, `consume_for_order`, `release_for_order`)
3. Keeps calls synchronous — full event-driven decoupling is premature for the current MVP monolith
4. Makes the boundary explicit, documented, and mockable in tests

**We do NOT adopt full event-driven decoupling at this stage** because:
- It introduces eventual consistency that complicates the wedge flow
- The consumer would need to read from Redis, add latency to quote acceptance
- The modular monolith can afford synchronous cross-module calls if the boundary is explicit

---

## Implementation

`sales/inventory_gateway.py` wraps three operations:

```python
async def reserve_for_order(db, workspace_id, actor_id, order_id, lines) -> dict
async def consume_for_order(db, workspace_id, actor_id, order_id) -> None
async def release_for_order(db, workspace_id, actor_id, order_id) -> None
```

Sales router and service import only from `inventory_gateway`, never directly from `inventory.service`.

---

## Consequences

**Positive:**
- Single file documents the entire Sales→Inventory contract
- Inventory module can evolve its service API without touching Sales files
- Gateway can be mocked in Sales tests
- Easy to replace with event-driven calls in a future ADR if needed

**Negative:**
- Still synchronous — doesn't eliminate the temporal coupling
- Adds one indirection layer

---

## Promotion Notes

With this ADR implemented, the Sales→Inventory Action Register item is closed. The remaining architectural concern (eventual consistency) is deferred to a future ADR when the platform scales beyond MVP.

---

## Related

- ADR 0004: Events as versioned domain contracts
- Implementation Alignment Gap Register: "Sales to Inventory boundary"
- Q2 2026 Backlog: Priority 4 item
