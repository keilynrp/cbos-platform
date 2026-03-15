import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────
export interface Condition {
  field: string;
  op: string;
  value: unknown;
}

export interface Action {
  type: string;
  config: Record<string, unknown>;
}

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  conditions: Condition[];
  actions: Action[];
  enabled: boolean;
  run_count: number;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  status: string;
  trigger_event_type: string | null;
  trigger_event_id: string | null;
  steps_result: Array<{
    action_type: string;
    status: string;
    detail: string;
    duration_ms: number;
  }> | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface CreateWorkflowDto {
  name: string;
  description?: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  conditions?: Condition[];
  actions: Action[];
  enabled?: boolean;
}

export interface WorkflowTestResult {
  matched: boolean;
  conditions_passed: boolean;
  message: string;
  actions_preview: string[];
}

// ── API ────────────────────────────────────────────────────────────────────
export const workflowsService = {
  getAll: () => api.get<Workflow[]>("/workflows"),
  get: (id: string) => api.get<Workflow>(`/workflows/${id}`),
  create: (dto: CreateWorkflowDto) => api.post<Workflow>("/workflows", dto),
  update: (id: string, dto: Partial<CreateWorkflowDto>) =>
    api.patch<Workflow>(`/workflows/${id}`, dto),
  delete: (id: string) => api.delete(`/workflows/${id}`),
  toggle: (id: string) => api.post<Workflow>(`/workflows/${id}/toggle`),
  getRuns: (id: string) => api.get<WorkflowRun[]>(`/workflows/${id}/runs`),
  test: (id: string, payload: { event_type: string; payload: Record<string, unknown> }) =>
    api.post<WorkflowTestResult>(`/workflows/${id}/test`, payload),
};
