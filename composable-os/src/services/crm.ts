import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────
export interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  source: string | null;
  status: string;
  score: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
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
  name: string;
  stage: string;
  value: number;
  probability: number;
  close_date: string | null;
  contact_id: string | null;
  contact_name?: string;
  organization_id: string | null;
  organization_name?: string;
  lost_reason: string | null;
  created_at: string;
}

export interface ChangeStageDto {
  stage: string;
  lost_reason?: string;
}

export interface Activity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  contact_id: string | null;
  opportunity_id: string | null;
  created_at: string;
}

export interface CreateLeadDto {
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  source?: string;
  notes?: string;
}

export interface CreateOpportunityDto {
  name: string;
  stage: string;
  value: number;
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

// ── API ────────────────────────────────────────────────────────────────────
export const crmService = {
  // Leads
  getLeads: () => api.get<Lead[]>("/crm/leads"),
  createLead: (dto: CreateLeadDto) => api.post<Lead>("/crm/leads", dto),
  updateLead: (id: string, dto: Partial<CreateLeadDto>) => api.patch<Lead>(`/crm/leads/${id}`, dto),
  deleteLead: (id: string) => api.delete(`/crm/leads/${id}`),

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
  getActivities: () => api.get<Activity[]>("/crm/activities"),
};
