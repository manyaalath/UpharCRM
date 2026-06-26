import { Database } from './database.types';

// ============================================================
// Uphar CRM — Shared TypeScript Types (Normalized V4)
// ============================================================

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// ---- Base Entities ----
export type Location = Tables<'locations'>;
export type Agent = Tables<'agents'>;
export type Book = Tables<'books'>;
export type Contact = Tables<'contacts'>;
export type Institute = Tables<'institutes'>;

export interface InstituteWithLocation extends Institute {
  locations?: Location;
}

export type InstituteContact = Tables<'institute_contacts'>;

export interface InstituteContactDetails extends InstituteContact {
  institutes?: InstituteWithLocation;
  contacts?: Contact;
}

// ---- Transactions ----

export type LeadStatus = 'new' | 'contacted' | 'interested' | 'followup_pending' | 'not_interested' | 'closed';

export const LEAD_STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'interested', label: 'Interested' },
  { value: 'followup_pending', label: 'Follow-up Pending' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'closed', label: 'Closed' },
];

export const LEAD_STATUS_COLORS: Record<LeadStatus, { bg: string; text: string; border: string }> = {
  new: { bg: 'bg-[#E0E7FF]', text: 'text-[#3730A3]', border: 'border-[#A5B4FC]' },
  contacted: { bg: 'bg-[#DBEAFE]', text: 'text-[#1E40AF]', border: 'border-[#93C5FD]' },
  interested: { bg: 'bg-[#ECFDF5]', text: 'text-[#065F46]', border: 'border-[#6EE7B7]' },
  followup_pending: { bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]', border: 'border-[#FCD34D]' },
  not_interested: { bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]', border: 'border-[#FCA5A5]' },
  closed: { bg: 'bg-[#F3F4F6]', text: 'text-[#374151]', border: 'border-[#D1D5DB]' },
};

export type Lead = Tables<'leads'>;

export interface LeadDetails extends Lead {
  institute_contacts?: InstituteContactDetails;
  agents?: Agent | null;
}

export type Challan = Tables<'challans'>;

export interface ChallanDetails extends Challan {
  leads?: LeadDetails;
  agents?: Agent | null;
  challan_books?: { books: Book; quantity: number }[];
}

export type ChallanBook = Tables<'challan_books'>;

// ---- Activities ----

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

export type FollowUp = Tables<'follow_ups'>;

export interface FollowUpDetails extends FollowUp {
  leads?: LeadDetails;
  agents?: Agent | null;
  challans?: Challan | null;
}

export type LeadActivity = Tables<'lead_activities'>;

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


export type CallFeedback = Tables<'call_feedback'>;

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

// ---- Dashboard Analytics Types ----

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

// ---- Pagination & API Error ----

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

export interface ApiError {
  error: string;
  code?: string;
  fields?: Record<string, string>;
}
