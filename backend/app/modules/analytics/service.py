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
from app.modules.hr.models import Department, Employee
from app.modules.projects.models import Project, ProjectTask
from app.modules.contracts.models import Contract
from app.modules.analytics.schemas import (
    AnalyticsSummary,
    ContractStatusCount,
    ContractsAnalytics,
    HRAnalytics,
    HREmploymentTypeCount,
    LeadsSummary,
    OperationsSummary,
    PipelineBreakdown,
    PipelineStage,
    PipelineSummary,
    ProjectStatusCount,
    ProjectsAnalytics,
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


# ── HR Analytics ───────────────────────────────────────────────────────────

async def get_hr_analytics(db: AsyncSession, workspace_id: str) -> HRAnalytics:
    today = date.today()
    month_start = datetime(today.year, today.month, 1, tzinfo=timezone.utc)

    # ── Headcount by status ────────────────────────────────────────────
    status_result = await db.execute(
        select(Employee.status, func.count(Employee.id).label("cnt"))
        .where(Employee.workspace_id == workspace_id)
        .group_by(Employee.status)
    )
    status_map: dict[str, int] = {row.status: row.cnt for row in status_result}
    total = sum(status_map.values())
    active_count = status_map.get("active", 0)
    on_leave_count = status_map.get("on_leave", 0)
    terminated_count = status_map.get("terminated", 0)

    # ── By employment type (active + on_leave only — terminated excluded) ──
    type_result = await db.execute(
        select(Employee.employment_type, func.count(Employee.id).label("cnt"))
        .where(
            and_(
                Employee.workspace_id == workspace_id,
                Employee.status.in_(["active", "on_leave"]),
            )
        )
        .group_by(Employee.employment_type)
        .order_by(func.count(Employee.id).desc())
    )
    by_employment_type = [
        HREmploymentTypeCount(employment_type=row.employment_type, count=row.cnt)
        for row in type_result
    ]

    # ── Departments ────────────────────────────────────────────────────
    dept_result = await db.execute(
        select(func.count(Department.id)).where(Department.workspace_id == workspace_id)
    )
    department_count = dept_result.scalar() or 0

    unassigned_result = await db.execute(
        select(func.count(Employee.id)).where(
            and_(
                Employee.workspace_id == workspace_id,
                Employee.status.in_(["active", "on_leave"]),
                Employee.department_id.is_(None),
            )
        )
    )
    unassigned_employees = unassigned_result.scalar() or 0

    # ── This month activity ────────────────────────────────────────────
    new_hires_result = await db.execute(
        select(func.count(Employee.id)).where(
            and_(
                Employee.workspace_id == workspace_id,
                Employee.start_date.isnot(None),
                Employee.start_date >= today.replace(day=1),
            )
        )
    )
    new_hires_this_month = new_hires_result.scalar() or 0

    terminations_result = await db.execute(
        select(func.count(Employee.id)).where(
            and_(
                Employee.workspace_id == workspace_id,
                Employee.terminated_at.isnot(None),
                Employee.terminated_at >= month_start,
            )
        )
    )
    terminations_this_month = terminations_result.scalar() or 0

    return HRAnalytics(
        total_employees=total,
        active_count=active_count,
        on_leave_count=on_leave_count,
        terminated_count=terminated_count,
        by_employment_type=by_employment_type,
        department_count=department_count,
        unassigned_employees=unassigned_employees,
        new_hires_this_month=new_hires_this_month,
        terminations_this_month=terminations_this_month,
    )


# ── Projects Analytics ─────────────────────────────────────────────────────

async def get_projects_analytics(db: AsyncSession, workspace_id: str) -> ProjectsAnalytics:
    today = date.today()
    month_start = datetime(today.year, today.month, 1, tzinfo=timezone.utc)

    # ── By status ──────────────────────────────────────────────────────
    status_result = await db.execute(
        select(Project.status, func.count(Project.id).label("cnt"))
        .where(Project.workspace_id == workspace_id)
        .group_by(Project.status)
    )
    status_order = ["planning", "active", "on_hold", "completed", "cancelled"]
    raw_map: dict[str, int] = {row.status: row.cnt for row in status_result}
    by_status = [
        ProjectStatusCount(status=s, count=raw_map[s])
        for s in status_order
        if s in raw_map
    ]
    # Any unlisted statuses appended at the end
    for s, c in raw_map.items():
        if s not in status_order:
            by_status.append(ProjectStatusCount(status=s, count=c))

    total_projects = sum(raw_map.values())
    active_count = raw_map.get("active", 0)

    # ── Budget (active projects only) ──────────────────────────────────
    budget_result = await db.execute(
        select(func.coalesce(func.sum(Project.budget), 0.0)).where(
            and_(
                Project.workspace_id == workspace_id,
                Project.status == "active",
                Project.budget.isnot(None),
            )
        )
    )
    total_budget_active = round(float(budget_result.scalar() or 0.0), 2)

    # ── Task health (non-terminal projects) ────────────────────────────
    # Total tasks and done tasks for active/planning/on_hold projects
    task_result = await db.execute(
        select(
            func.count(ProjectTask.id).label("total"),
            func.count(
                case((ProjectTask.status == "done", ProjectTask.id))
            ).label("done"),
        )
        .join(Project, ProjectTask.project_id == Project.id)
        .where(
            and_(
                Project.workspace_id == workspace_id,
                Project.status.notin_(["completed", "cancelled"]),
                ProjectTask.status != "cancelled",
            )
        )
    )
    task_row = task_result.one()
    total_tasks = int(task_row.total)
    done_tasks = int(task_row.done)
    task_completion_rate = round(done_tasks / total_tasks, 4) if total_tasks > 0 else 0.0

    # Overdue tasks: due_date < today, status not done/cancelled
    overdue_result = await db.execute(
        select(func.count(ProjectTask.id))
        .join(Project, ProjectTask.project_id == Project.id)
        .where(
            and_(
                Project.workspace_id == workspace_id,
                Project.status.notin_(["completed", "cancelled"]),
                ProjectTask.due_date.isnot(None),
                ProjectTask.due_date < today,
                ProjectTask.status.notin_(["done", "cancelled"]),
            )
        )
    )
    overdue_tasks = overdue_result.scalar() or 0

    # ── This month ─────────────────────────────────────────────────────
    completed_result = await db.execute(
        select(func.count(Project.id)).where(
            and_(
                Project.workspace_id == workspace_id,
                Project.completed_at.isnot(None),
                Project.completed_at >= month_start,
            )
        )
    )
    completed_this_month = completed_result.scalar() or 0

    cancelled_result = await db.execute(
        select(func.count(Project.id)).where(
            and_(
                Project.workspace_id == workspace_id,
                Project.cancelled_at.isnot(None),
                Project.cancelled_at >= month_start,
            )
        )
    )
    cancelled_this_month = cancelled_result.scalar() or 0

    return ProjectsAnalytics(
        by_status=by_status,
        total_projects=total_projects,
        active_count=active_count,
        total_budget_active=total_budget_active,
        total_tasks=total_tasks,
        done_tasks=done_tasks,
        overdue_tasks=int(overdue_tasks),
        task_completion_rate=task_completion_rate,
        completed_this_month=completed_this_month,
        cancelled_this_month=cancelled_this_month,
    )


# ── Contracts Analytics ────────────────────────────────────────────────────

async def get_contracts_analytics(db: AsyncSession, workspace_id: str) -> ContractsAnalytics:
    today = date.today()
    month_start = datetime(today.year, today.month, 1, tzinfo=timezone.utc)
    thirty_days_out = today + timedelta(days=30)

    # ── By status ──────────────────────────────────────────────────────
    status_result = await db.execute(
        select(Contract.status, func.count(Contract.id).label("cnt"))
        .where(Contract.workspace_id == workspace_id)
        .group_by(Contract.status)
    )
    status_order = ["draft", "sent", "signed", "executed", "expired", "terminated"]
    raw_map: dict[str, int] = {row.status: row.cnt for row in status_result}
    by_status = [
        ContractStatusCount(status=s, count=raw_map[s])
        for s in status_order
        if s in raw_map
    ]
    for s, c in raw_map.items():
        if s not in status_order:
            by_status.append(ContractStatusCount(status=s, count=c))

    total_contracts = sum(raw_map.values())

    # ── Value ──────────────────────────────────────────────────────────
    value_result = await db.execute(
        select(
            func.coalesce(
                func.sum(
                    case((Contract.status.in_(["signed", "executed"]), Contract.value), else_=0.0)
                ), 0.0
            ).label("signed_value"),
            func.coalesce(
                func.sum(
                    case((Contract.status == "executed", Contract.value), else_=0.0)
                ), 0.0
            ).label("executed_value"),
        ).where(
            and_(
                Contract.workspace_id == workspace_id,
                Contract.value.isnot(None),
            )
        )
    )
    val = value_result.one()

    # ── This month ─────────────────────────────────────────────────────
    signed_result = await db.execute(
        select(func.count(Contract.id)).where(
            and_(
                Contract.workspace_id == workspace_id,
                Contract.signed_at.isnot(None),
                Contract.signed_at >= month_start,
            )
        )
    )
    signed_this_month = signed_result.scalar() or 0

    executed_result = await db.execute(
        select(func.count(Contract.id)).where(
            and_(
                Contract.workspace_id == workspace_id,
                Contract.executed_at.isnot(None),
                Contract.executed_at >= month_start,
            )
        )
    )
    executed_this_month = executed_result.scalar() or 0

    # ── Expiring soon: end_date within 30 days, not already expired/terminated ──
    expiring_result = await db.execute(
        select(func.count(Contract.id)).where(
            and_(
                Contract.workspace_id == workspace_id,
                Contract.end_date.isnot(None),
                Contract.end_date >= today,
                Contract.end_date <= thirty_days_out,
                Contract.status.notin_(["expired", "terminated"]),
            )
        )
    )
    expiring_soon = expiring_result.scalar() or 0

    return ContractsAnalytics(
        by_status=by_status,
        total_contracts=total_contracts,
        total_value_signed=round(float(val.signed_value), 2),
        total_value_executed=round(float(val.executed_value), 2),
        signed_this_month=signed_this_month,
        executed_this_month=executed_this_month,
        expiring_soon=int(expiring_soon),
    )
