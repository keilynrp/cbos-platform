# Q4 2026 Sprint Plan

> Derived from: Q3 closure (all 9 modules Tier 1, 320 tests, 28 files), ADR 0010 open gap, frontend audit.
> Q3 closed at: 320 tests, 28 files, all 9 modules Tier 1 (6/6), Q3 backlog 17/17 items done.

---

## Sprint Priorities

| Priority | Code | Item | Rationale |
|----------|------|------|-----------|
| 1 | **G2** | Overdue invoice automation | Last open gap in ADR 0010; Accounting Tier 1 incomplete without it |
| 2 | **G6** | Frontend exploratory pages cleanup | 28 mock pages pollute the codebase; only 11 pages are API-backed |
| 3 | **E1** | Dashboard — real data wiring | Analytics.tsx exists with recharts but 100% mock data; no backend endpoints |

---

## G2 — Overdue Invoice Automation

_ADR 0010 remaining gap: "Overdue invoice status transitions are not automated — `overdue` state requires a scheduled job not yet built."_

### Current State

- Invoice model defines `overdue` as valid status but **never sets it automatically**
- `get_summary()` calculates overdue count at read-time (`due_date < today`) but doesn't persist the transition
- No `INVOICE_OVERDUE` event type exists
- Pattern precedent: `invoice_consumer.py` (Redis Streams) and `email_notifier.py` (asyncio task)

### Deliverables

| # | Item | Type | Evidence |
|---|------|------|----------|
| G2.1 | Add `INVOICE_OVERDUE` event constant to `app/events/types.py` | Code | ✅ Done |
| G2.2 | Implement `overdue_scanner` background task | Code | ✅ Done — `overdue_scanner.py` (hourly scan, transitions sent/partial → overdue) |
| G2.3 | Register scanner in `main.py` lifespan | Code | ✅ Done — `asyncio.create_task(run_overdue_scanner())` |
| G2.4 | Add `InvoiceOverdue` to `NOTIFY_EVENTS` (WS) and `EMAIL_NOTIFY_EVENTS` (email) | Code | ✅ Done — 14 WS events, 5 email events |
| G2.5 | Add UI label for `InvoiceOverdue` in notifications | Code | ✅ Done — "Factura vencida" WS label + "Facturas vencidas" email toggle in Settings |
| G2.6 | Tests: overdue scanner logic (unit + integration) | Tests | ✅ Done — `test_overdue_scanner.py` (15 tests, 4 layers) |
| G2.7 | Update ADR 0010 — resolve final gap (strikethrough) | Docs | ✅ Done — all 4 gaps in ADR 0010 now resolved |
| G2.8 | Update `docs/capabilities/accounting.md` — remove overdue gap | Docs | ✅ Done — full rewrite reflecting Tier 1 status + overdue scanner |

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| `asyncio.create_task` with hourly scan interval | Simpler than Redis Streams consumer; no external scheduler needed; hourly is sufficient for invoice SLA |
| Transition only `sent` and `partial` → `overdue` | `draft` invoices haven't been sent yet; `paid`/`void`/`cancelled` are terminal |
| Emit event per invoice transitioned | Enables per-invoice notification; batch emit would lose granularity |
| Idempotent: skip already-overdue invoices | Scanner runs repeatedly; must not re-emit events for already-overdue invoices |

---

## G6 — Frontend Exploratory Pages Cleanup

_28 of 39 pages use mock/static data. These were early UI explorations that predate the wedge architecture. They confuse navigation, inflate bundle size, and create false expectations._

### Current State

**API-backed pages (keep):** 11

| Page | Service | Status |
|------|---------|--------|
| Index.tsx (Dashboard) | sales, crm, inventory, workflows | ✅ Real API |
| CRM.tsx | crmService | ✅ Real API |
| Sales.tsx | salesService | ✅ Real API |
| SalesBuilder.tsx | salesService + crmService | ⚠️ Hybrid (some mock) |
| InventoryOrders.tsx | inventoryService | ✅ Real API |
| Workflows.tsx | workflowsService | ✅ Real API |
| Discovery.tsx | discoveryService | ✅ Real API |
| PortalBuilder.tsx | portalService + salesService | ✅ Real API |
| Invoicing.tsx | accountingService | ✅ Real API |
| Settings.tsx | direct API calls | ✅ Real API |
| CustomerPortal.tsx | custom fetch (public) | ✅ Real API |

**Mock/exploratory pages (cleanup candidates):** 28

| Category | Pages | Count |
|----------|-------|-------|
| **Builder explorations** | ChatbotBuilder, AppointmentBuilder, EventBuilder, LeadMagnetBuilder, PersonaBuilder, ShopBuilder, POSBuilder, WarehouseBuilder, IoTBuilder, ContractStudio | 10 |
| **Intelligence explorations** | IntelligenceGraphOS, PlatformMap, KnowledgeGraph | 3 |
| **Mock analytics** | Analytics, RevPathIntelligence | 2 |
| **Mock operational** | Projects, TeamStructure, AccountManagement, MCPIntegrationHub, ExperienceMapper, Documents, Marketplace, Prospecting, AIAgents | 9 |
| **SalesBuilder mock portions** | Inline mock arrays in otherwise real page | 1 (partial) |
| **Auth/system (keep as-is)** | Login, Register, NotFound | 3 (no action) |

### Deliverables

| # | Item | Type | Details |
|---|------|------|---------|
| G6.1 | Move 25 pure-mock pages to `pages/_archived/` | Code | ✅ Done — 25 files archived |
| G6.2 | Remove routes for archived pages from `App.tsx` | Code | ✅ Done — 10 active routes (was 33) |
| G6.3 | Remove sidebar navigation items for archived pages | Code | ✅ Done — 10 items in 4 sections (was 35 items across 6 sections) |
| G6.4 | Clean SalesBuilder.tsx mock data | Code | ✅ Done — SalesBuilder archived; Sales.tsx is the active real page |
| G6.5 | Keep Analytics.tsx (for E1) but mark clearly as "pending backend" | Code | ✅ Done — Analytics kept, route `/analytics` active |
| G6.6 | Update test counts for added InvoiceOverdue event | CI | ✅ Done — test_notifications.py (13→14) + test_notification_preferences.py (4→5) |

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| Archive to `_archived/` instead of delete | Preserves UI work for potential future modules; easy to restore |
| Keep Analytics.tsx | E1 will wire it to real data — it's the most complete mock page |
| Keep Login, Register, NotFound | System pages, not exploratory |
| Single PR | All cleanup in one commit — atomic change, easy to revert |

---

## E1 — Dashboard with Real Data

_Analytics.tsx has production-grade UI with recharts but 100% mock data. The frontend is ready; the backend has no analytics endpoints._

### Current State

- **Frontend:** `Analytics.tsx` with 5 tabs (Revenue, Projects, Marketing, Knowledge, AI Insights), all recharts
- **Libraries:** recharts 2.15.4, @tanstack/react-query, zustand — all installed
- **Backend:** Zero analytics endpoints; data exists in module tables but no aggregation layer
- **Events:** Full event bus operational (13+ event types across 9 modules)

### Deliverables

| # | Item | Type | Details |
|---|------|------|---------|
| E1.1 | Define dashboard scope: which metrics are real for wedge MVP | Design | ✅ Done — Revenue (invoices), Pipeline (opportunities), Fulfillment (orders), Inventory (stock levels) |
| E1.2 | Add `GET /api/v1/analytics/summary` endpoint | Code | ✅ Done — `app/modules/analytics/router.py` + `service.py` |
| E1.3 | Add `GET /api/v1/analytics/revenue` endpoint | Code | ✅ Done — time-series with `?months=1-24`, `relativedelta` month buckets |
| E1.4 | Add `GET /api/v1/analytics/pipeline` endpoint | Code | ✅ Done — stage breakdown, avg deal size, won_rate_30d |
| E1.5 | Wire `Index.tsx` (Dashboard) to real summary endpoint | Code | ✅ Done — KPI cards + charts from analytics endpoints; detail lists from module services |
| E1.6 | Wire `Analytics.tsx` Revenue tab to real revenue endpoint | Code | ✅ Done — area chart + 4 KPI cards from real invoice data |
| E1.7 | Wire `Analytics.tsx` Pipeline tab to real pipeline endpoint | Code | ✅ Done — new Pipeline tab with stage bar chart + won rate |
| E1.8 | Remove or disable tabs with no backend (Marketing, Knowledge, AI Insights) | Code | ✅ Done — Marketing + Knowledge tabs disabled; AI Insights tab removed |
| E1.9 | Analytics service file: `services/analytics.ts` | Code | ✅ Done — `getSummary()`, `getRevenue(months)`, `getPipeline()` |
| E1.10 | Tests: analytics endpoints (contract + integration) | Tests | ✅ Done — `test_analytics.py` (24 tests: auth, workspace isolation, shape, empty state, date range) |

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| Query-time aggregation (not materialized views) | MVP volume doesn't justify pre-computed metrics; direct SQL aggregation is fast enough |
| Single analytics module with cross-module queries | Simpler than per-module analytics endpoints; analytics is a read-only cross-cutting concern |
| Remove fake tabs rather than show mock data | Users must trust the dashboard shows real data; mixing mock and real destroys credibility |
| No new database tables for analytics | Aggregate from existing invoice, opportunity, order, inventory tables |

---

## Execution Order

```
Week 1-2:  G2 — Overdue invoice automation (small, closes ADR gap)
Week 2-3:  G6 — Frontend cleanup (mechanical, reduces noise before E1)
Week 3-5:  E1 — Dashboard real data (largest item, benefits from clean frontend)
```

### Success Criteria

| Metric | Q3 End | Q4 Target |
|--------|--------|-----------|
| Test count | 320 | ✅ 359 (G2: 15 tests, E1: 24 tests) |
| Test files | 28 | ✅ 30 (`test_overdue_scanner.py`, `test_analytics.py`) |
| ADR 0010 gaps | 1 open | ✅ 0 open — all 4 gaps resolved |
| Mock-only frontend pages | 28 | ✅ 0 in active routing (25 archived, Analytics wired, Index wired) |
| Dashboard data source | Mock | ✅ Real (Summary KPIs + Revenue time-series + Pipeline breakdown) |

---

_Created: 2026-04-12 | Based on: Q3_2026_BACKLOG.md, CAPABILITY_MATURITY_SCORECARD.md, frontend audit, ADR 0010_
