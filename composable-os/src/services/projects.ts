// composable-os/src/services/projects.ts
import { api } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProjectTask {
  id: string;
  project_id: string;
  task_order: number;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectListItem {
  id: string;
  project_number: string;
  title: string;
  status: string;
  budget: number | null;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  organization_id: string | null;
  contact_id: string | null;
  contract_id: string | null;
  created_at: string;
}

export interface Project extends ProjectListItem {
  workspace_id: string;
  description: string | null;
  activated_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  notes: string | null;
  sales_order_id: string | null;
  owner_id: string | null;
  tasks: ProjectTask[];
  updated_at: string;
}

export interface CreateProjectDto {
  title: string;
  description?: string;
  budget?: number;
  currency?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  contract_id?: string;
  sales_order_id?: string;
  contact_id?: string;
  organization_id?: string;
  tasks?: { title: string; description?: string; status?: string; task_order?: number }[];
}

export interface UpdateProjectDto {
  title?: string;
  description?: string;
  budget?: number;
  currency?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  contact_id?: string;
  organization_id?: string;
  status?: string;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  status?: string;
  due_date?: string;
  assignee_id?: string;
  task_order?: number;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: string;
  due_date?: string;
  assignee_id?: string;
  task_order?: number;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const projectsService = {
  getAll: (params?: { status?: string; organization_id?: string }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => v != null) as [string, string][]
    ).toString();
    return api.get<ProjectListItem[]>(`/projects${qs ? `?${qs}` : ""}`);
  },

  get: (id: string) => api.get<Project>(`/projects/${id}`),

  create: (dto: CreateProjectDto) => api.post<Project>("/projects", dto),

  update: (id: string, dto: UpdateProjectDto) =>
    api.patch<Project>(`/projects/${id}`, dto),

  delete: (id: string) => api.delete(`/projects/${id}`),

  // Status transitions
  activate: (id: string) =>
    api.patch<Project>(`/projects/${id}`, { status: "active" }),
  hold: (id: string) =>
    api.patch<Project>(`/projects/${id}`, { status: "on_hold" }),
  complete: (id: string) =>
    api.patch<Project>(`/projects/${id}`, { status: "completed" }),
  cancel: (id: string) =>
    api.patch<Project>(`/projects/${id}`, { status: "cancelled" }),

  // Tasks
  addTask: (projectId: string, dto: CreateTaskDto) =>
    api.post<Project>(`/projects/${projectId}/tasks`, dto),

  updateTask: (projectId: string, taskId: string, dto: UpdateTaskDto) =>
    api.patch<Project>(`/projects/${projectId}/tasks/${taskId}`, dto),

  deleteTask: (projectId: string, taskId: string) =>
    api.delete(`/projects/${projectId}/tasks/${taskId}`),
};
