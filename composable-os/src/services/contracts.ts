// composable-os/src/services/contracts.ts
import { api } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ContractClause {
  id: string;
  contract_id: string;
  clause_order: number;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface ContractListItem {
  id: string;
  contract_number: string;
  title: string;
  status: string;
  value: number | null;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  organization_id: string | null;
  contact_id: string | null;
  sales_order_id: string | null;
  created_at: string;
}

export interface Contract extends ContractListItem {
  workspace_id: string;
  description: string | null;
  sent_at: string | null;
  signed_at: string | null;
  executed_at: string | null;
  terminated_at: string | null;
  expired_at: string | null;
  notes: string | null;
  opportunity_id: string | null;
  owner_id: string | null;
  clauses: ContractClause[];
  updated_at: string;
}

export interface CreateContractDto {
  title: string;
  description?: string;
  value?: number;
  currency?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  sales_order_id?: string;
  opportunity_id?: string;
  contact_id?: string;
  organization_id?: string;
  clauses?: { title: string; body?: string; clause_order?: number }[];
}

export interface UpdateContractDto {
  title?: string;
  description?: string;
  value?: number;
  currency?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  contact_id?: string;
  organization_id?: string;
  status?: string;
}

export interface CreateClauseDto {
  title: string;
  body?: string;
  clause_order?: number;
}

export interface UpdateClauseDto {
  title?: string;
  body?: string;
  clause_order?: number;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const contractsService = {
  getAll: (params?: { status?: string; organization_id?: string }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => v != null) as [string, string][]
    ).toString();
    return api.get<ContractListItem[]>(`/contracts${qs ? `?${qs}` : ""}`);
  },

  get: (id: string) => api.get<Contract>(`/contracts/${id}`),

  create: (dto: CreateContractDto) => api.post<Contract>("/contracts", dto),

  update: (id: string, dto: UpdateContractDto) =>
    api.patch<Contract>(`/contracts/${id}`, dto),

  delete: (id: string) => api.delete(`/contracts/${id}`),

  // Status transitions (convenience wrappers)
  send: (id: string) =>
    api.patch<Contract>(`/contracts/${id}`, { status: "sent" }),
  markSigned: (id: string) =>
    api.patch<Contract>(`/contracts/${id}`, { status: "signed" }),
  execute: (id: string) =>
    api.patch<Contract>(`/contracts/${id}`, { status: "executed" }),
  terminate: (id: string) =>
    api.patch<Contract>(`/contracts/${id}`, { status: "terminated" }),

  // Clauses
  addClause: (contractId: string, dto: CreateClauseDto) =>
    api.post<Contract>(`/contracts/${contractId}/clauses`, dto),

  updateClause: (contractId: string, clauseId: string, dto: UpdateClauseDto) =>
    api.patch<Contract>(`/contracts/${contractId}/clauses/${clauseId}`, dto),

  deleteClause: (contractId: string, clauseId: string) =>
    api.delete(`/contracts/${contractId}/clauses/${clauseId}`),
};
