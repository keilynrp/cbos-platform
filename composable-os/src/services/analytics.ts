// composable-os/src/services/analytics.ts
import { api } from "@/lib/api";

// ── Types (aligned with backend analytics schemas) ────────────────────────────

export interface RevenueSummary {
  total_invoiced: number;
  total_paid: number;
  total_outstanding: number;
  overdue_count: number;
  overdue_amount: number;
}

export interface PipelineSummary {
  open_opportunities: number;
  pipeline_value: number;
  won_this_month: number;
  won_value_this_month: number;
}

export interface OperationsSummary {
  active_workflow_runs: number;
  orders_pending: number;
  low_stock_items: number;
}

export interface LeadsSummary {
  new_this_month: number;
  total_active: number;
}

export interface AnalyticsSummary {
  revenue: RevenueSummary;
  pipeline: PipelineSummary;
  operations: OperationsSummary;
  leads: LeadsSummary;
}

export interface RevenueMonth {
  month: string;  // "YYYY-MM"
  invoiced: number;
  paid: number;
  outstanding: number;
}

export interface RevenueTimeSeries {
  period: string;
  months: number;
  series: RevenueMonth[];
}

export interface PipelineStage {
  stage: string;
  count: number;
  value: number;
}

export interface PipelineBreakdown {
  stages: PipelineStage[];
  total_open: number;
  total_value: number;
  avg_deal_size: number;
  won_rate_30d: number;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const analyticsService = {
  getSummary: (): Promise<AnalyticsSummary> =>
    api.get<AnalyticsSummary>("/analytics/summary"),

  getRevenue: (months = 12): Promise<RevenueTimeSeries> =>
    api.get<RevenueTimeSeries>(`/analytics/revenue?months=${months}`),

  getPipeline: (): Promise<PipelineBreakdown> =>
    api.get<PipelineBreakdown>("/analytics/pipeline"),
};
