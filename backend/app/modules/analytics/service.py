"""
Analytics service — cross-module read-only aggregation queries.
All queries are workspace-scoped and run at request time (no materialized views).
"""
from datetime import date, datetime, timezone, timedelta
from dateutil.relativedelta import relativedelta

from sqlalchemy import func, select, and_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.accounting.models import Invoice
from app.modules.crm.models import Lead, Opportunity
from app.modules.sales.models import SalesOrder
from app.modules.inventory.models import InventoryItem, Product
from app.modules.workflows.models import WorkflowRun
from app.modules.analytics.schemas import (
    AnalyticsSummary,
    LeadsSummary,
    OperationsSummary,
    PipelineBreakdown,
    PipelineStage,
    PipelineSummary,
    RevenueMonth,
    RevenueSummary,
    RevenueTimeSeries,
)


# ── Summary ────────────────────────────────────────────────────────────────

async def get_summary(db: AsyncSession, workspace_id: str) -> AnalyticsSummary:
    today = date.today()
    now = datetime.now(timezone.utc)
    month_start = today.replace(day=1)

    # ── Revenue ────────────────────────────────────────────────────────
    inv_result = await db.execute(
        select(
            func.coalesce(func.sum(Invoice.total), 0.0).label("total_invoiced"),
            func.coalesce(func.sum(Invoice.amount_paid), 0.0).label("total_paid"),
            func.coalesce(
                func.sum(
                    case((Invoice.status.notin_(["paid", "void", "cancelled"]), Invoice.amount_due), else_=0.0)
                ), 0.0
            ).label("total_outstanding"),
            func.count(
                case((
                    and_(
                        Invoice.status.notin_(["paid", "void", "cancelled"]),
                        Invoice.due_date.isnot(None),
                        Invoice.due_date < today,
                    ), Invoice.id
                ))
            ).label("overdue_count"),
            func.coalesce(
                func.sum(
                    case((
                        and_(
                            Invoice.status.notin_(["paid", "void", "cancelled"]),
                            Invoice.due_date.isnot(None),
                            Invoice.due_date < today,
                        ), Invoice.amount_due
                    ), else_=0.0)
                ), 0.0
            ).label("overdue_amount"),
        ).where(Invoice.workspace_id == workspace_id)
    )
    inv = inv_result.one()

    # ── Pipeline ───────────────────────────────────────────────────────
    opp_result = await db.execute(
        select(
            func.count(Opportunity.id).filter(
                Opportunity.stage.notin_(["won", "lost"])
            ).label("open_count"),
            func.coalesce(
                func.sum(Opportunity.value).filter(
                    Opportunity.stage.notin_(["won", "lost"])
                ), 0.0
            ).label("pipeline_value"),
            func.count(Opportunity.id).filter(
                Opportunity.won_at >= datetime(today.year, month_start.month, 1, tzinfo=timezone.utc)
            ).label("won_this_month"),
            func.coalesce(
                func.sum(Opportunity.value).filter(
                    Opportunity.won_at >= datetime(today.year, month_start.month, 1, tzinfo=timezone.utc)
                ), 0.0
            ).label("won_value_this_month"),
        ).where(Opportunity.workspace_id == workspace_id)
    )
    opp = opp_result.one()

    # ── Operations ─────────────────────────────────────────────────────
    wf_result = await db.execute(
        select(func.count(WorkflowRun.id)).where(
            and_(WorkflowRun.workspace_id == workspace_id, WorkflowRun.status == "running")
        )
    )
    active_wf = wf_result.scalar() or 0

    order_result = await db.execute(
        select(func.count(SalesOrder.id)).where(
            and_(
                SalesOrder.workspace_id == workspace_id,
                SalesOrder.status.in_(["confirmed", "in_fulfillment"]),
            )
        )
    )
    orders_pending = order_result.scalar() or 0

    low_stock_result = await db.execute(
        select(func.count(InventoryItem.id))
        .join(Product, InventoryItem.product_id == Product.id)
        .where(
            and_(
                InventoryItem.workspace_id == workspace_id,
                Product.is_active == True,  # noqa: E712
                Product.is_service == False,  # noqa: E712
                InventoryItem.current_stock <= Product.min_stock,
                Product.min_stock > 0,
            )
        )
    )
    low_stock = low_stock_result.scalar() or 0

    # ── Leads ──────────────────────────────────────────────────────────
    lead_result = await db.execute(
        select(
            func.count(Lead.id).filter(
                Lead.created_at >= datetime(today.year, month_start.month, 1, tzinfo=timezone.utc)
            ).label("new_this_month"),
            func.count(Lead.id).filter(
                Lead.status.notin_(["converted", "disqualified"])
            ).label("total_active"),
        ).where(Lead.workspace_id == workspace_id)
    )
    leads = lead_result.one()

    return AnalyticsSummary(
        revenue=RevenueSummary(
            total_invoiced=round(float(inv.total_invoiced), 2),
            total_paid=round(float(inv.total_paid), 2),
            total_outstanding=round(float(inv.total_outstanding), 2),
            overdue_count=int(inv.overdue_count),
            overdue_amount=round(float(inv.overdue_amount), 2),
        ),
        pipeline=PipelineSummary(
            open_opportunities=int(opp.open_count),
            pipeline_value=round(float(opp.pipeline_value), 2),
            won_this_month=int(opp.won_this_month),
            won_value_this_month=round(float(opp.won_value_this_month), 2),
        ),
        operations=OperationsSummary(
            active_workflow_runs=active_wf,
            orders_pending=orders_pending,
            low_stock_items=low_stock,
        ),
        leads=LeadsSummary(
            new_this_month=int(leads.new_this_month),
            total_active=int(leads.total_active),
        ),
    )


# ── Revenue time-series ────────────────────────────────────────────────────

async def get_revenue_series(
    db: AsyncSession, workspace_id: str, months: int = 12
) -> RevenueTimeSeries:
    today = date.today()

    # Generate month buckets: oldest → newest
    buckets = []
    for i in range(months - 1, -1, -1):
        d = today - relativedelta(months=i)
        buckets.append(d.replace(day=1))

    result = await db.execute(
        select(Invoice).where(
            and_(
                Invoice.workspace_id == workspace_id,
                Invoice.issue_date >= buckets[0],
                Invoice.status != "void",
            )
        )
    )
    invoices = result.scalars().all()

    # Aggregate per month
    monthly: dict[str, dict] = {}
    for b in buckets:
        key = b.strftime("%Y-%m")
        monthly[key] = {"invoiced": 0.0, "paid": 0.0, "outstanding": 0.0}

    for inv in invoices:
        key = inv.issue_date.strftime("%Y-%m")
        if key not in monthly:
            continue
        monthly[key]["invoiced"] += inv.total
        monthly[key]["paid"] += inv.amount_paid
        if inv.status not in ("paid", "void", "cancelled"):
            monthly[key]["outstanding"] += inv.amount_due

    series = [
        RevenueMonth(
            month=key,
            invoiced=round(v["invoiced"], 2),
            paid=round(v["paid"], 2),
            outstanding=round(v["outstanding"], 2),
        )
        for key, v in monthly.items()
    ]

    return RevenueTimeSeries(period="monthly", months=months, series=series)


# ── Pipeline ───────────────────────────────────────────────────────────────

async def get_pipeline(db: AsyncSession, workspace_id: str) -> PipelineBreakdown:
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    # All non-lost opportunities
    opp_result = await db.execute(
        select(Opportunity).where(
            and_(
                Opportunity.workspace_id == workspace_id,
                Opportunity.stage != "lost",
            )
        )
    )
    opportunities = opp_result.scalars().all()

    # Open (non-won, non-lost) for funnel
    open_opps = [o for o in opportunities if o.stage not in ("won", "lost")]

    # Stage aggregation
    stage_map: dict[str, dict] = {}
    for opp in open_opps:
        s = opp.stage
        if s not in stage_map:
            stage_map[s] = {"count": 0, "value": 0.0}
        stage_map[s]["count"] += 1
        stage_map[s]["value"] += opp.value or 0.0

    # Canonical stage ordering (matches CRM VALID_STAGES for open opportunities)
    stage_order = ["new", "qualified", "proposal", "negotiation"]
    stages = []
    for s in stage_order:
        if s in stage_map:
            stages.append(PipelineStage(
                stage=s,
                count=stage_map[s]["count"],
                value=round(stage_map[s]["value"], 2),
            ))
    # Any non-canonical stages at the end
    for s, v in stage_map.items():
        if s not in stage_order:
            stages.append(PipelineStage(stage=s, count=v["count"], value=round(v["value"], 2)))

    total_open = len(open_opps)
    total_value = round(sum(o.value or 0.0 for o in open_opps), 2)
    avg_deal_size = round(total_value / total_open, 2) if total_open > 0 else 0.0

    # Won rate last 30 days: won / (won + lost) in that window
    won_30 = sum(
        1 for o in opportunities
        if o.stage == "won" and o.won_at and o.won_at >= thirty_days_ago
    )
    lost_30_result = await db.execute(
        select(func.count(Opportunity.id)).where(
            and_(
                Opportunity.workspace_id == workspace_id,
                Opportunity.stage == "lost",
                Opportunity.lost_at.isnot(None),
                Opportunity.lost_at >= thirty_days_ago,
            )
        )
    )
    lost_30 = lost_30_result.scalar() or 0
    total_closed_30 = won_30 + lost_30
    won_rate_30d = round(won_30 / total_closed_30, 4) if total_closed_30 > 0 else 0.0

    return PipelineBreakdown(
        stages=stages,
        total_open=total_open,
        total_value=total_value,
        avg_deal_size=avg_deal_size,
        won_rate_30d=won_rate_30d,
    )
