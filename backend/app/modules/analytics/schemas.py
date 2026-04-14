"""Pydantic schemas for analytics endpoints."""
from pydantic import BaseModel


# ── Summary ────────────────────────────────────────────────────────────────


class RevenueSummary(BaseModel):
    total_invoiced: float
    total_paid: float
    total_outstanding: float
    overdue_count: int
    overdue_amount: float


class PipelineSummary(BaseModel):
    open_opportunities: int
    pipeline_value: float
    won_this_month: int
    won_value_this_month: float


class OperationsSummary(BaseModel):
    active_workflow_runs: int
    orders_pending: int
    low_stock_items: int


class LeadsSummary(BaseModel):
    new_this_month: int
    total_active: int


class AnalyticsSummary(BaseModel):
    revenue: RevenueSummary
    pipeline: PipelineSummary
    operations: OperationsSummary
    leads: LeadsSummary


# ── Revenue time-series ────────────────────────────────────────────────────


class RevenueMonth(BaseModel):
    month: str          # "2026-04"
    invoiced: float
    paid: float
    outstanding: float


class RevenueTimeSeries(BaseModel):
    period: str = "monthly"
    months: int
    series: list[RevenueMonth]


# ── Pipeline ───────────────────────────────────────────────────────────────


class PipelineStage(BaseModel):
    stage: str
    count: int
    value: float


class PipelineBreakdown(BaseModel):
    stages: list[PipelineStage]
    total_open: int
    total_value: float
    avg_deal_size: float
    won_rate_30d: float     # 0.0 – 1.0


# ── HR ─────────────────────────────────────────────────────────────────────


class HREmploymentTypeCount(BaseModel):
    employment_type: str
    count: int


class HRAnalytics(BaseModel):
    # Headcount by status
    total_employees: int
    active_count: int
    on_leave_count: int
    terminated_count: int
    # Composition
    by_employment_type: list[HREmploymentTypeCount]
    # Departments
    department_count: int
    unassigned_employees: int   # active/on_leave with no department
    # This month activity
    new_hires_this_month: int
    terminations_this_month: int


# ── Projects ───────────────────────────────────────────────────────────────


class ProjectStatusCount(BaseModel):
    status: str
    count: int


class ProjectsAnalytics(BaseModel):
    # By status
    by_status: list[ProjectStatusCount]
    total_projects: int
    active_count: int
    # Budget
    total_budget_active: float      # sum of budget for active projects
    # Task health (across all non-terminal projects)
    total_tasks: int
    done_tasks: int
    overdue_tasks: int              # due_date < today, status not done/cancelled
    task_completion_rate: float     # 0.0 – 1.0
    # This month
    completed_this_month: int
    cancelled_this_month: int


# ── Contracts ──────────────────────────────────────────────────────────────


class ContractStatusCount(BaseModel):
    status: str
    count: int


class ContractsAnalytics(BaseModel):
    # By status
    by_status: list[ContractStatusCount]
    total_contracts: int
    # Value
    total_value_signed: float       # signed + executed
    total_value_executed: float     # executed only
    # This month
    signed_this_month: int
    executed_this_month: int
    # Risk indicators
    expiring_soon: int              # end_date within 30 days, status not expired/terminated
