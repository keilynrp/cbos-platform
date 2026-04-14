"""Analytics router — 6 cross-module aggregation endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_workspace_id
from app.modules.analytics.schemas import (
    AnalyticsSummary,
    ContractsAnalytics,
    HRAnalytics,
    PipelineBreakdown,
    ProjectsAnalytics,
    RevenueTimeSeries,
)
from app.modules.analytics import service

router = APIRouter(tags=["Analytics"])


@router.get("/analytics/summary", response_model=AnalyticsSummary)
async def analytics_summary(
    workspace_id: str = Depends(get_current_workspace_id),
    db: AsyncSession = Depends(get_db),
) -> AnalyticsSummary:
    """
    Cross-module dashboard summary.
    Returns revenue KPIs, pipeline snapshot, operations health, and lead counts.
    """
    return await service.get_summary(db, workspace_id)


@router.get("/analytics/revenue", response_model=RevenueTimeSeries)
async def analytics_revenue(
    months: int = Query(default=12, ge=1, le=24, description="Number of months to return (1-24)"),
    workspace_id: str = Depends(get_current_workspace_id),
    db: AsyncSession = Depends(get_db),
) -> RevenueTimeSeries:
    """
    Monthly revenue time-series for the past N months.
    Returns invoiced, paid, and outstanding amounts per month.
    """
    return await service.get_revenue_series(db, workspace_id, months)


@router.get("/analytics/pipeline", response_model=PipelineBreakdown)
async def analytics_pipeline(
    workspace_id: str = Depends(get_current_workspace_id),
    db: AsyncSession = Depends(get_db),
) -> PipelineBreakdown:
    """
    CRM opportunity pipeline breakdown by stage.
    Includes win rate for the last 30 days.
    """
    return await service.get_pipeline(db, workspace_id)


@router.get("/analytics/hr", response_model=HRAnalytics)
async def analytics_hr(
    workspace_id: str = Depends(get_current_workspace_id),
    db: AsyncSession = Depends(get_db),
) -> HRAnalytics:
    """
    HR headcount analytics.
    Returns employee counts by status, employment type breakdown, department
    coverage, and this-month hiring / termination activity.
    """
    return await service.get_hr_analytics(db, workspace_id)


@router.get("/analytics/projects", response_model=ProjectsAnalytics)
async def analytics_projects(
    workspace_id: str = Depends(get_current_workspace_id),
    db: AsyncSession = Depends(get_db),
) -> ProjectsAnalytics:
    """
    Projects analytics.
    Returns project counts by status, active budget, task health
    (completion rate, overdue count), and this-month activity.
    """
    return await service.get_projects_analytics(db, workspace_id)


@router.get("/analytics/contracts", response_model=ContractsAnalytics)
async def analytics_contracts(
    workspace_id: str = Depends(get_current_workspace_id),
    db: AsyncSession = Depends(get_db),
) -> ContractsAnalytics:
    """
    Contracts analytics.
    Returns contract counts by status, signed/executed value,
    this-month closings, and contracts expiring within 30 days.
    """
    return await service.get_contracts_analytics(db, workspace_id)
