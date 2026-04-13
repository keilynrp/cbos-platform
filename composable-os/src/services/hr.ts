// composable-os/src/services/hr.ts
import { api } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Department {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeListItem {
  id: string;
  employee_number: string;
  full_name: string;
  email: string | null;
  status: string;
  employment_type: string;
  position: string | null;
  department_id: string | null;
  start_date: string | null;
  created_at: string;
}

export interface Employee extends EmployeeListItem {
  workspace_id: string;
  phone: string | null;
  end_date: string | null;
  on_leave_since: string | null;
  terminated_at: string | null;
  salary: number | null;
  currency: string;
  notes: string | null;
  updated_at: string;
}

export interface CreateDepartmentDto {
  name: string;
  description?: string;
}

export interface UpdateDepartmentDto {
  name?: string;
  description?: string;
}

export interface CreateEmployeeDto {
  full_name: string;
  email?: string;
  phone?: string;
  position?: string;
  employment_type?: string;
  department_id?: string;
  start_date?: string;
  end_date?: string;
  salary?: number;
  currency?: string;
  notes?: string;
}

export interface UpdateEmployeeDto {
  full_name?: string;
  email?: string;
  phone?: string;
  position?: string;
  employment_type?: string;
  department_id?: string;
  start_date?: string;
  end_date?: string;
  salary?: number;
  currency?: string;
  notes?: string;
  status?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const hrService = {
  // Departments
  getDepartments: () => api.get<Department[]>("/departments"),
  createDepartment: (dto: CreateDepartmentDto) => api.post<Department>("/departments", dto),
  updateDepartment: (id: string, dto: UpdateDepartmentDto) =>
    api.patch<Department>(`/departments/${id}`, dto),
  deleteDepartment: (id: string) => api.delete(`/departments/${id}`),

  // Employees
  getAll: (params?: { status?: string; department_id?: string; employment_type?: string }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => v != null) as [string, string][]
    ).toString();
    return api.get<EmployeeListItem[]>(`/employees${qs ? `?${qs}` : ""}`);
  },
  get: (id: string) => api.get<Employee>(`/employees/${id}`),
  create: (dto: CreateEmployeeDto) => api.post<Employee>("/employees", dto),
  update: (id: string, dto: UpdateEmployeeDto) => api.patch<Employee>(`/employees/${id}`, dto),
  delete: (id: string) => api.delete(`/employees/${id}`),

  // Status transitions
  putOnLeave: (id: string) => api.patch<Employee>(`/employees/${id}`, { status: "on_leave" }),
  returnFromLeave: (id: string) => api.patch<Employee>(`/employees/${id}`, { status: "active" }),
  terminate: (id: string) => api.patch<Employee>(`/employees/${id}`, { status: "terminated" }),
};
