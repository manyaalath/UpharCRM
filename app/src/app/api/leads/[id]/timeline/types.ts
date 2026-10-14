// Shape of GET /api/leads/[id]/timeline — shared with the lead UI.

export type TimelineKind =
  | 'challan' | 'call' | 'followup' | 'whatsapp_out' | 'whatsapp_in' | 'status' | 'created' | 'note';

export interface TimelineItem {
  id: string;
  kind: TimelineKind;
  at: string;            // ISO timestamp or YYYY-MM-DD, used for sorting
  dateOnly?: boolean;    // `at` is a calendar date, not a moment
  title: string;
  detail?: string | null;
  meta?: string | null;  // small right-hand text: challan no, rep, status…
  tone?: 'ok' | 'warn' | 'bad' | 'info' | 'neutral';
  lines?: { label: string; value: string }[];
}

export interface LeadBookTotal {
  id: string;
  title: string;
  total_quantity: number;
  visits: number;
}

export interface TimelineResponse {
  items: TimelineItem[];
  books: LeadBookTotal[];
  totals: { challans: number; calls: number; books: number };
}
