// Flatten the nested Supabase lead shape (lead → institute_contacts → contacts/institutes → locations)
// into the fields the UI shows.

type Obj = Record<string, unknown>;
const one = <T,>(v: T | T[] | null | undefined): T | undefined => (Array.isArray(v) ? v[0] : v ?? undefined);

export interface LeadRow {
  id: string;
  lead_seq_id: string;
  status: string;
  lead_type?: string | null;
  created_at?: string | null;
  last_contact_date?: string | null;
  next_followup_date?: string | null;
  whatsapp_status?: string | null;
  reply_status?: string | null;
  [key: string]: unknown;
}

export interface LeadView {
  id: string;
  seq: string;
  status: string;
  contact: string;
  mobile: string;
  altMobile: string | null;
  institute: string;
  district: string;
  town: string | null;
  address: string | null;
  pincode: string | null;
  rep: string | null;
  leadType: string | null;
  visits: number | null;
  createdAt: string | null;
  lastContact: string | null;
  nextFollowUp: string | null;
}

export function leadView(lead: LeadRow): LeadView {
  const ic = one(lead.institute_contacts as Obj | Obj[] | null) as Obj | undefined;
  const contact = one(ic?.contacts as Obj | Obj[] | null) as Obj | undefined;
  const institute = one(ic?.institutes as Obj | Obj[] | null) as Obj | undefined;
  const location = one(institute?.locations as Obj | Obj[] | null) as Obj | undefined;
  const agent = one(lead.agents as Obj | Obj[] | null) as Obj | undefined;
  const challans = lead.challans as { count?: number }[] | undefined;

  const town = [institute?.village_town, institute?.locality].filter(Boolean).join(', ');

  return {
    id: lead.id,
    seq: lead.lead_seq_id,
    status: lead.status,
    contact: (contact?.name as string) || 'Unknown contact',
    mobile: (contact?.mobile_no as string) || '',
    altMobile: (contact?.alt_mobile_no as string) || null,
    institute: (institute?.name as string) || 'Unknown institute',
    district: (location?.district as string) || '—',
    town: town || null,
    address: (institute?.address_line as string) || null,
    pincode: (location?.pincode as string) || null,
    rep: (agent?.name as string) || null,
    leadType: lead.lead_type || null,
    visits: Array.isArray(challans) && typeof challans[0]?.count === 'number' ? challans[0].count : null,
    createdAt: lead.created_at || null,
    lastContact: lead.last_contact_date || null,
    nextFollowUp: lead.next_followup_date || null,
  };
}

// wa.me needs country code + number, digits only.
export function waLink(mobile: string): string | null {
  const digits = mobile.replace(/\D/g, '');
  if (digits.length === 10) return `https://wa.me/91${digits}`;
  if (digits.length > 10) return `https://wa.me/${digits}`;
  return null;
}

// 98765 43210
export function formatMobile(mobile: string): string {
  const d = mobile.replace(/\D/g, '');
  return d.length === 10 ? `${d.slice(0, 5)} ${d.slice(5)}` : mobile;
}
