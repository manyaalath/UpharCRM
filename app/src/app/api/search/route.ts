import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/date';

const LIMIT = 8;

type Rec = Record<string, unknown>;
const one = <T,>(v: unknown): T | undefined => (Array.isArray(v) ? v[0] : v) as T | undefined;

// GET /api/search?q= — global search for the command palette.
// Leads match on contact name, mobile, institute name or lead ID; challans on challan no.
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('q') || '';
  // Strip characters that would break PostgREST or()/ilike syntax.
  const q = raw.replace(/[%*,()\\"']/g, ' ').replace(/\s+/g, ' ').trim();
  if (q.length < 2) return NextResponse.json({ data: [] });

  const supabase = await createClient();
  const like = `%${q}%`;
  const digits = q.replace(/\D/g, '');

  // 1. Contacts and institutes that match, in parallel with direct lead/challan matches.
  const contactFilter = digits.length >= 3 ? `name.ilike.${like},mobile_no.ilike.%${digits}%` : `name.ilike.${like}`;
  const [contactsRes, institutesRes, leadIdRes, challansRes] = await Promise.all([
    supabase.from('contacts').select('id').or(contactFilter).limit(25),
    supabase.from('institutes').select('id').ilike('name', like).limit(25),
    supabase.from('leads').select('id').ilike('lead_seq_id', like).limit(LIMIT),
    supabase
      .from('challans')
      .select('id, challan_no, challan_date, leads(institute_contacts(contacts(name), institutes(name)))')
      .ilike('challan_no', like)
      .order('challan_date', { ascending: false })
      .limit(LIMIT),
  ]);

  const contactIds = (contactsRes.data || []).map(c => c.id);
  const instituteIds = (institutesRes.data || []).map(i => i.id);

  // 2. institute_contacts linking those contacts/institutes.
  let icIds: string[] = [];
  if (contactIds.length || instituteIds.length) {
    const parts: string[] = [];
    if (contactIds.length) parts.push(`contact_id.in.(${contactIds.join(',')})`);
    if (instituteIds.length) parts.push(`institute_id.in.(${instituteIds.join(',')})`);
    const { data } = await supabase.from('institute_contacts').select('id').or(parts.join(',')).limit(50);
    icIds = (data || []).map(r => r.id);
  }

  // 3. Leads for those links + direct lead ID matches.
  const leadFilters: string[] = [];
  if (icIds.length) leadFilters.push(`institute_contact_id.in.(${icIds.join(',')})`);
  const directLeadIds = (leadIdRes.data || []).map(l => l.id);
  if (directLeadIds.length) leadFilters.push(`id.in.(${directLeadIds.join(',')})`);

  let leads: Rec[] = [];
  if (leadFilters.length) {
    const { data } = await supabase
      .from('leads')
      .select('id, lead_seq_id, status, institute_contacts(contacts(name, mobile_no), institutes(name, locations(district)))')
      .or(leadFilters.join(','))
      .order('updated_at', { ascending: false })
      .limit(LIMIT);
    leads = (data || []) as Rec[];
  }

  const results = [
    ...leads.map(l => {
      const ic = one<Rec>(l.institute_contacts);
      const contact = one<{ name?: string; mobile_no?: string }>(ic?.contacts);
      const inst = one<{ name?: string; locations?: unknown }>(ic?.institutes);
      const district = one<{ district?: string }>(inst?.locations)?.district;
      return {
        type: 'lead' as const,
        id: String(l.id),
        title: contact?.name || inst?.name || String(l.lead_seq_id || 'Lead'),
        subtitle: [inst?.name, district, contact?.mobile_no, l.lead_seq_id].filter(Boolean).join(' · '),
        href: `/leads/${l.id}`,
      };
    }),
    ...((challansRes.data || []) as Rec[]).map(c => {
      const lead = one<Rec>(c.leads);
      const ic = one<Rec>(lead?.institute_contacts);
      const contact = one<{ name?: string }>(ic?.contacts);
      const inst = one<{ name?: string }>(ic?.institutes);
      return {
        type: 'challan' as const,
        id: String(c.id),
        title: `Challan ${c.challan_no}`,
        subtitle: [contact?.name, inst?.name, formatDate(c.challan_date as string)].filter(Boolean).join(' · '),
        href: `/records?challan=${encodeURIComponent(String(c.challan_no))}`,
      };
    }),
  ];

  return NextResponse.json({ data: results });
}
