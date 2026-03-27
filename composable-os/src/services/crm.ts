import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────
export interface Lead {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  source: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  organization_id: string | null;
  organization_name?: string;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  created_at: string;
}

export interface Opportunity {
  id: string;
  title: string;
  stage: string;
  value: number | null;
  currency: string;
  probability: number | null;
  close_date: string | null;
  description: string | null;
  contact_id: string | null;
  organization_id: string | null;
  lost_reason: string | null;
  won_at: string | null;
  lost_at: string | null;
  created_at: string;
}

export interface Activity {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  entity_type: string;
  entity_id: string;
  user_id: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface CreateLeadDto {
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company_name?: string;
  source?: string;
  notes?: string;
}

export interface CreateOpportunityDto {
  title: string;
  stage?: string;
  value?: number;
  probability?: number;
  close_date?: string;
  contact_id?: string;
  organization_id?: string;
}

export interface CreateContactDto {
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  title?: string;
  organization_id?: string;
}

export interface CreateOrganizationDto {
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
}

export interface ChangeStageDto {
  stage: string;
  lost_reason?: string;
}

export interface CreateActivityDto {
  activity_type: "call" | "email" | "meeting" | "note" | "task";
  title: string;
  description?: string;
  entity_type: "lead" | "opportunity";
  entity_id: string;
  due_date?: string;
}

// ── API ────────────────────────────────────────────────────────────────────
export const crmService = {
  // Leads
  getLeads: () => api.get<Lead[]>("/crm/leads"),
  createLead: (dto: CreateLeadDto) => api.post<Lead>("/crm/leads", dto),
  updateLead: (id: string, dto: Partial<CreateLeadDto>) => api.patch<Lead>(`/crm/leads/${id}`, dto),
  deleteLead: (id: string) => api.delete(`/crm/leads/${id}`),
  convertLead: (leadId: string, dto: { title: string; value?: number; close_date?: string }) =>
    api.post<Opportunity>(`/crm/leads/${leadId}/convert`, dto),

  // Contacts
  getContacts: () => api.get<Contact[]>("/crm/contacts"),
  createContact: (dto: CreateContactDto) => api.post<Contact>("/crm/contacts", dto),

  // Organizations
  getOrganizations: () => api.get<Organization[]>("/crm/organizations"),
  createOrganization: (dto: CreateOrganizationDto) => api.post<Organization>("/crm/organizations", dto),

  // Opportunities
  getOpportunities: () => api.get<Opportunity[]>("/crm/opportunities"),
  createOpportunity: (dto: CreateOpportunityDto) => api.post<Opportunity>("/crm/opportunities", dto),
  updateOpportunity: (id: string, dto: Partial<CreateOpportunityDto>) =>
    api.patch<Opportunity>(`/crm/opportunities/${id}`, dto),
  changeStage: (id: string, dto: ChangeStageDto) =>
    api.patch<Opportunity>(`/crm/opportunities/${id}/stage`, dto),

  // Activities
  getActivities: (params?: { entity_type?: string; entity_id?: string }) =>
    api.get<Activity[]>(
      params?.entity_type
        ? `/crm/activities?entity_type=${params.entity_type}&entity_id=${params.entity_id}`
        : "/crm/activities"
    ),
  logActivity: (dto: CreateActivityDto) => api.post<Activity>("/crm/activities", dto),
};
