import { api } from "@/lib/api";

export interface PortalSession {
  id: string;
  workspace_id: string;
  quote_id: string;
  token: string;
  expires_at: string;
  accessed_at: string | null;
  completed_at: string | null;
  action: string | null;      // "accepted" | "rejected" | null
  client_name: string | null;
  client_email: string | null;
  created_by_id: string | null;
  portal_url: string;
  created_at: string;
}

export interface CreateSessionDto {
  quote_id: string;
  client_name?: string;
  client_email?: string;
  expire_hours?: number;
}

export const portalService = {
  getSessions: (quote_id?: string) =>
    api.get<PortalSession[]>(`/portal/sessions${quote_id ? `?quote_id=${quote_id}` : ""}`),

  createSession: (dto: CreateSessionDto) =>
    api.post<PortalSession>("/portal/sessions", dto),

  sendEmail: (session_id: string) =>
    api.post<{ sent: boolean; message: string }>(`/portal/sessions/${session_id}/send-email`, {}),
};
