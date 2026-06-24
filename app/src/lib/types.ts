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
  village_town: string | null;
  locality: string | null;
  district: string;
  pincode: string;
  mobile_no: string;
  specimens_given: string[];
  agent_name: string;
  lead_id: string | null;
  created_at: string;
  updated_at: string;
}

export type ChallanInsert = Omit<Challan, 'id' | 'created_at' | 'updated_at'>;
export type ChallanUpdate = Partial<ChallanInsert>;

export interface Lead {
  id: string;
  lead_id: string;
  contact_person: string;
  institute_name: string;
  mobile_no: string;
  address: string | null;
  village_town: string | null;
  locality: string | null;
  district: string;
  pincode: string | null;
  agent_name: string | null;
  status: LeadStatus;
  last_contact_date: string | null;
  next_followup_date: string | null;
  suggestions: string | null;
  complaints: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export type LeadUpdate = Partial<
  Pick<Lead, 'status' | 'last_contact_date' | 'next_followup_date' | 'remarks' | 'suggestions' | 'complaints'>
>;

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'interested'
  | 'followup_pending'
  | 'not_interested'
  | 'closed';

export const LEAD_STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'interested', label: 'Interested' },
  { value: 'followup_pending', label: 'Follow-up Pending' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'closed', label: 'Closed' },
];

export const LEAD_STATUS_COLORS: Record<LeadStatus, { bg: string; text: string; border: string }> =
  {
    new: { bg: 'bg-[#E0E7FF]', text: 'text-[#3730A3]', border: 'border-[#A5B4FC]' },
    contacted: { bg: 'bg-[#DBEAFE]', text: 'text-[#1E40AF]', border: 'border-[#93C5FD]' },
    interested: { bg: 'bg-[#ECFDF5]', text: 'text-[#065F46]', border: 'border-[#6EE7B7]' },
    followup_pending: { bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]', border: 'border-[#FCD34D]' },
    not_interested: { bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]', border: 'border-[#FCA5A5]' },
    closed: { bg: 'bg-[#F3F4F6]', text: 'text-[#374151]', border: 'border-[#D1D5DB]' },
  };

export interface Representative {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

// Keep backward-compatible alias
export type Agent = Representative;

export interface Profile {
  id: string;
  email: string;
  role: 'data_entry' | 'super_admin';
  name: string;
}

// ---- Follow-Up Types ----

export type FollowUpStatus = 'pending' | 'completed' | 'overdue' | 'rescheduled';

export const FOLLOWUP_STATUS_OPTIONS: { value: FollowUpStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'rescheduled', label: 'Rescheduled' },
];

export const FOLLOWUP_STATUS_COLORS: Record<FollowUpStatus, { bg: string; text: string; border: string }> = {
  pending: { bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]', border: 'border-[#FCD34D]' },
  completed: { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]', border: 'border-[#6EE7B7]' },
  overdue: { bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]', border: 'border-[#FCA5A5]' },
  rescheduled: { bg: 'bg-[#DBEAFE]', text: 'text-[#1E40AF]', border: 'border-[#93C5FD]' },
};

export interface FollowUp {
  id: string;
  lead_id: string;
  challan_no: string | null;
  followup_date: string;
  status: FollowUpStatus;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields (from lead)
  lead?: Lead;
}

// ---- Lead Activity Types ----

export type ActivityType =
  | 'specimen_distributed'
  | 'followup_created'
  | 'call_completed'
  | 'suggestion_received'
  | 'complaint_received'
  | 'additional_specimen'
  | 'status_changed'
  | 'lead_created'
  | 'challan_attached';

export interface LeadActivity {
  id: string;
  lead_id: string;
  activity_type: ActivityType;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ---- Call Feedback Types ----

export type CallOutcome =
  | 'not_reachable'
  | 'busy'
  | 'call_back_later'
  | 'interested'
  | 'not_interested'
  | 'wants_more_specimens';

export const CALL_OUTCOME_OPTIONS: { value: CallOutcome; label: string }[] = [
  { value: 'not_reachable', label: 'Not Reachable' },
  { value: 'busy', label: 'Busy' },
  { value: 'call_back_later', label: 'Call Back Later' },
  { value: 'interested', label: 'Interested' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'wants_more_specimens', label: 'Wants More Specimens' },
];

export interface CallFeedback {
  id: string;
  lead_id: string;
  call_outcome: CallOutcome;
  suggestions: string | null;
  complaints: string | null;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
}

// ---- Analytics Types ----

export interface AnalyticsSummary {
  total_challans: number;
  total_leads: number;
  pending_followups: number;
  books_distributed: number;
  districts_covered: number;
}

export interface DistrictAnalytics {
  district: string;
  challan_count: number;
  lead_count: number;
  followup_count: number;
}

export interface MonthlyAnalytics {
  month: string;
  count: number;
}

export interface RepresentativeAnalytics {
  representative_name: string;
  challan_count: number;
  lead_count: number;
  interested_count: number;
  followups_completed: number;
  performance_score: number;
}

export interface BookAnalytics {
  book_name: string;
  distribution_count: number;
  unique_leads: number;
  repeat_count: number;
}

export interface LeadStatusAnalytics {
  status: string;
  count: number;
}

export interface FollowUpQueueItem {
  id: string;
  lead_id: string;
  contact_person: string;
  institute_name: string;
  district: string;
  mobile_no: string;
  followup_date: string;
  status: FollowUpStatus;
}

export interface LeadIntelligence {
  name: string;
  district: string;
  visit_count: number;
  last_visit: string;
  category: 'hot' | 'warm' | 'cold';
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

// ---- Duplicate Detection ----

export interface DuplicateCheckResult {
  duplicate_found: boolean;
  existing_lead?: Lead;
  match_type?: 'mobile' | 'secondary';
}
