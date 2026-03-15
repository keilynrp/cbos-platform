import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────
export interface DiscoverySession {
  id: string;
  workspace_id: string;
  status: "active" | "completed";
  business_description: string | null;
  industry: string | null;
  company_size: string | null;
  detected_pain_points: string[] | null;
  matched_capabilities: string[] | null;
  recommended_package: string | null;
  blueprint: Record<string, unknown> | null;
  created_at: string;
}

export interface DiscoveryMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  token_count: number | null;
  created_at: string;
}

export interface ChatResponse {
  message: DiscoveryMessage;
  session: DiscoverySession;
}

export interface BlueprintCapability {
  id: string;
  name: string;
  description: string;
  module: string;
}

export interface BlueprintResponse {
  session_id: string;
  blueprint: Record<string, unknown>;
  recommended_package: string;
  matched_capabilities: BlueprintCapability[];
}

export interface ApplyResult {
  success: boolean;
  message: string;
  workspace_id: string;
  activated_modules: string[];
}

export interface CreateSessionDto {
  business_description?: string;
  industry?: string;
  company_size?: string;
}

// ── API ────────────────────────────────────────────────────────────────────
export const discoveryService = {
  listCapabilities: () =>
    api.get<{ capabilities: unknown[] }>("/discovery/capabilities"),

  listPackages: () =>
    api.get<{ packages: Record<string, unknown> }>("/discovery/packages"),

  listSessions: () =>
    api.get<DiscoverySession[]>("/discovery/sessions"),

  getSession: (id: string) =>
    api.get<DiscoverySession>(`/discovery/sessions/${id}`),

  createSession: (dto: CreateSessionDto) =>
    api.post<DiscoverySession>("/discovery/sessions", dto),

  sendMessage: (sessionId: string, content: string) =>
    api.post<ChatResponse>(`/discovery/sessions/${sessionId}/messages`, { content }),

  generateBlueprint: (sessionId: string) =>
    api.post<BlueprintResponse>(`/discovery/sessions/${sessionId}/generate-blueprint`, {}),

  applyBlueprint: (sessionId: string) =>
    api.post<ApplyResult>(`/discovery/sessions/${sessionId}/apply`, {}),
};
