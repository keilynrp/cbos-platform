import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────
export interface DiscoverySession {
  id: string;
  status: string;
  company_name: string | null;
  industry: string | null;
  company_size: string | null;
  pain_points: string[];
  answers: Record<string, unknown>;
  analysis_result: Record<string, unknown> | null;
  recommendations: Recommendation[] | null;
  created_at: string;
  updated_at: string;
}

export interface Recommendation {
  capability: string;
  priority: string;
  rationale: string;
  pain_points_addressed: string[];
}

export interface CreateSessionDto {
  company_name?: string;
  industry?: string;
  company_size?: string;
}

export interface UpdateSessionDto {
  answers?: Record<string, unknown>;
  pain_points?: string[];
  company_name?: string;
  industry?: string;
  company_size?: string;
}

// ── API ────────────────────────────────────────────────────────────────────
export const discoveryService = {
  getSessions: () => api.get<DiscoverySession[]>("/discovery/sessions"),
  getSession: (id: string) => api.get<DiscoverySession>(`/discovery/sessions/${id}`),
  createSession: (dto?: CreateSessionDto) =>
    api.post<DiscoverySession>("/discovery/sessions", dto ?? {}),
  updateSession: (id: string, dto: UpdateSessionDto) =>
    api.patch<DiscoverySession>(`/discovery/sessions/${id}`, dto),
  analyze: (id: string) =>
    api.post<DiscoverySession>(`/discovery/sessions/${id}/analyze`, {}),
};
