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
