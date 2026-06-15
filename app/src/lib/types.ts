// ============================================================
// Uphar CRM — Shared TypeScript Types
// ============================================================

// ---- Database Row Types ----

export interface Challan {
  id: string;
  challan_no: string;
  challan_date: string;
  teacher_name: string;
  institute_name: string;
  address: string;
  district: string;
  pincode: string;
  mobile_no: string;
  specimens_given: string[];
  agent_name: string;
  created_at: string;
  updated_at: string;
}

export type ChallanInsert = Omit<Challan, 'id' | 'created_at' | 'updated_at'>;
export type ChallanUpdate = Partial<ChallanInsert>;

export interface Lead {
  id: string;
  lead_id: string;
  challan_no: string;
  contact_person: string;
  institute_name: string;
  mobile_no: string;
  district: string;
  agent_name: string | null;
  status: LeadStatus;
  last_contact_date: string | null;
  next_followup_date: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export type LeadUpdate = Partial<
  Pick<Lead, 'status' | 'last_contact_date' | 'next_followup_date' | 'remarks'>
>;

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'interested'
  | 'followup_pending'
  | 'converted'
  | 'not_interested'
  | 'closed';

export const LEAD_STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'interested', label: 'Interested' },
  { value: 'followup_pending', label: 'Follow-up Pending' },
  { value: 'converted', label: 'Converted' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'closed', label: 'Closed' },
];

export const LEAD_STATUS_COLORS: Record<LeadStatus, { bg: string; text: string; border: string }> =
  {
    new: { bg: 'bg-[#E0E7FF]', text: 'text-[#3730A3]', border: 'border-[#A5B4FC]' },
    contacted: { bg: 'bg-[#DBEAFE]', text: 'text-[#1E40AF]', border: 'border-[#93C5FD]' },
    interested: { bg: 'bg-[#ECFDF5]', text: 'text-[#065F46]', border: 'border-[#6EE7B7]' },
    followup_pending: { bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]', border: 'border-[#FCD34D]' },
    converted: { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]', border: 'border-[#6EE7B7]' },
    not_interested: { bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]', border: 'border-[#FCA5A5]' },
    closed: { bg: 'bg-[#F3F4F6]', text: 'text-[#374151]', border: 'border-[#D1D5DB]' },
  };

export interface Agent {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  role: 'data_entry' | 'super_admin';
  name: string;
}

// ---- Analytics Types ----

export interface AnalyticsSummary {
  total_challans: number;
  total_institutions: number;
  total_leads: number;
  leads_pending_followup: number;
  leads_not_contacted: number;
  challans_this_month: number;
}

export interface DistrictAnalytics {
  district: string;
  count: number;
}

export interface MonthlyAnalytics {
  month: string;
  count: number;
}

export interface AgentAnalytics {
  agent_name: string;
  challan_count: number;
  lead_count: number;
}

export interface LeadStatusAnalytics {
  status: string;
  count: number;
}

export interface SpecimenAnalytics {
  specimen: string;
  count: number;
}

export interface RepeatInstitution {
  institute_name: string;
  district: string;
  visit_count: number;
  last_visit: string;
  lead_status: string;
}

// ---- Pagination ----

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// ---- API Error ----

export interface ApiError {
  error: string;
  code?: string;
  fields?: Record<string, string>;
}
