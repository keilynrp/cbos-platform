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

// ── HR ────────────────────────────────────────────────────────────────────────

export interface HREmploymentTypeCount {
  employment_type: string;
  count: number;
}

export interface HRAnalytics {
  total_employees: number;
  active_count: number;
  on_leave_count: number;
  terminated_count: number;
  by_employment_type: HREmploymentTypeCount[];
  department_count: number;
  unassigned_employees: number;
  new_hires_this_month: number;
  terminations_this_month: number;
}

// ── Projects ──────────────────────────────────────────────────────────────────

export interface ProjectStatusCount {
  status: string;
  count: number;
}

export interface ProjectsAnalytics {
  by_status: ProjectStatusCount[];
  total_projects: number;
  active_count: number;
  total_budget_active: number;
  total_tasks: number;
  done_tasks: number;
  overdue_tasks: number;
  task_completion_rate: number;
  completed_this_month: number;
  cancelled_this_month: number;
}

// ── Contracts ─────────────────────────────────────────────────────────────────

export interface ContractStatusCount {
  status: string;
  count: number;
}

export interface ContractsAnalytics {
  by_status: ContractStatusCount[];
  total_contracts: number;
  total_value_signed: number;
  total_value_executed: number;
  signed_this_month: number;
  executed_this_month: number;
  expiring_soon: number;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const analyticsService = {
  getSummary: (): Promise<AnalyticsSummary> =>
    api.get<AnalyticsSummary>("/analytics/summary"),

  getRevenue: (months = 12): Promise<RevenueTimeSeries> =>
    api.get<RevenueTimeSeries>(`/analytics/revenue?months=${months}`),

  getPipeline: (): Promise<PipelineBreakdown> =>
    api.get<PipelineBreakdown>("/analytics/pipeline"),

  getHR: (): Promise<HRAnalytics> =>
    api.get<HRAnalytics>("/analytics/hr"),

  getProjects: (): Promise<ProjectsAnalytics> =>
    api.get<ProjectsAnalytics>("/analytics/projects"),

  getContracts: (): Promise<ContractsAnalytics> =>
    api.get<ContractsAnalytics>("/analytics/contracts"),
};
