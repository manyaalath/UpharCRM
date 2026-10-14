// Shared helpers for challan creation (manual entry + Excel import).
import type { SupabaseClient } from '@supabase/supabase-js';

export interface SpecimenLine {
  title: string;
  quantity: number;
}

export interface ExistingLeadMatch {
  id: string;
  lead_id: string; // human id, e.g. L-0042
  contact_person: string | null;
  institute_name: string | null;
  district: string | null;
  village_town: string | null;
  mobile_no: string | null;
  status: string;
  last_visit: string | null;
  last_books: string[];
}

type Row = Record<string, unknown>;
const one = <T,>(v: T | T[] | null | undefined): T | undefined => (Array.isArray(v) ? v[0] : v ?? undefined);

// Accepts ['Title', …] or [{ title, quantity }, …]; merges repeats, drops blanks.
export function normalizeSpecimens(input: unknown): SpecimenLine[] {
  if (!Array.isArray(input)) return [];
  const map = new Map<string, SpecimenLine>();
  for (const item of input) {
    const title = String(typeof item === 'string' ? item : (item as Row)?.title ?? '').trim();
    if (!title) continue;
    const q = typeof item === 'string' ? 1 : Number((item as Row)?.quantity) || 1;
    const key = title.toLowerCase();
    const prev = map.get(key);
    if (prev) prev.quantity += Math.max(1, Math.floor(q));
    else map.set(key, { title, quantity: Math.max(1, Math.floor(q)) });
  }
  return [...map.values()];
}

// The create_challan_transaction RPC inserts every book with quantity 1.
// Patch the real quantities afterwards (only lines with quantity > 1).
export async function applyBookQuantities(supabase: SupabaseClient, challanId: string, lines: SpecimenLine[]) {
  const multi = lines.filter(l => l.quantity > 1);
  if (!multi.length) return;
  const { data: books } = await supabase.from('books').select('id, title').in('title', multi.map(l => l.title));
  const idByTitle = new Map((books || []).map(b => [b.title as string, b.id as string]));
  await Promise.all(
    multi.map(l => {
      const bookId = idByTitle.get(l.title);
      if (!bookId) return null;
      return supabase.from('challan_books').update({ quantity: l.quantity }).eq('challan_id', challanId).eq('book_id', bookId);
    })
  );
}

// Most recent lead attached to a mobile number, with last visit details.
export async function findLeadByMobile(supabase: SupabaseClient, mobile: string): Promise<ExistingLeadMatch | null> {
  const { data: contacts } = await supabase.from('contacts').select('id').eq('mobile_no', mobile).limit(10);
  if (!contacts?.length) return null;

  const { data: leads } = await supabase
    .from('leads')
    .select('id, lead_seq_id, status, created_at, institute_contacts!inner(contact_id, contacts(name, mobile_no), institutes(name, village_town, locations(district)))')
    .in('institute_contacts.contact_id', contacts.map(c => c.id))
    .order('created_at', { ascending: false })
    .limit(1);
  const lead = leads?.[0] as Row | undefined;
  if (!lead) return null;

  const ic = one(lead.institute_contacts as Row | Row[]);
  const contact = one(ic?.contacts as Row | Row[]);
  const inst = one(ic?.institutes as Row | Row[]);
  const loc = one(inst?.locations as Row | Row[]);

  const { data: last } = await supabase
    .from('challans')
    .select('challan_date, challan_books(books(title))')
    .eq('lead_id', lead.id as string)
    .order('challan_date', { ascending: false })
    .limit(1);
  const lastChallan = last?.[0] as Row | undefined;
  const lastBooks = ((lastChallan?.challan_books as Row[]) || [])
    .map(cb => one(cb.books as Row | Row[])?.title as string | undefined)
    .filter((t): t is string => !!t);

  return {
    id: lead.id as string,
    lead_id: lead.lead_seq_id as string,
    contact_person: (contact?.name as string) ?? null,
    institute_name: (inst?.name as string) ?? null,
    district: (loc?.district as string) ?? null,
    village_town: (inst?.village_town as string) ?? null,
    mobile_no: (contact?.mobile_no as string) ?? null,
    status: lead.status as string,
    last_visit: (lastChallan?.challan_date as string) ?? null,
    last_books: lastBooks,
  };
}
