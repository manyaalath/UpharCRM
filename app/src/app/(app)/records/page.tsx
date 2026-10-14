import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/session';
import { one } from '@/app/api/dashboard/analytics';
import RecordsClient, { type RecordFilters, type RecordRow } from './RecordsClient';

export const metadata = {
  title: 'Challans · Uphar CRM',
  description: 'Every specimen challan, filterable by district, rep, book and date.',
};

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

type SP = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || '';
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

export default async function RecordsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const filters: RecordFilters = {
    q: str(sp.q).trim(),
    challan: str(sp.challan).trim(),
    district: str(sp.district),
    rep: str(sp.rep),
    book: str(sp.book),
    from: isDate(str(sp.from)) ? str(sp.from) : '',
    to: isDate(str(sp.to)) ? str(sp.to) : '',
  };
  const page = Math.max(1, parseInt(str(sp.page) || '1', 10) || 1);

  const supabase = await createClient();
  const session = await getSession();

  // District filtering needs inner joins down the chain; without it, keep
  // outer joins so challans with incomplete addresses still show.
  const leadsEmbed = filters.district
    ? 'leads!inner(id, lead_seq_id, status, institute_contacts!inner(contacts(name, mobile_no), institutes!inner(name, village_town, locations!inner(district))))'
    : 'leads(id, lead_seq_id, status, institute_contacts(contacts(name, mobile_no), institutes(name, village_town, locations(district))))';
  const select =
    `id, challan_no, challan_date, lead_id, ${leadsEmbed}, agents(name), challan_books(quantity, books(title))` +
    (filters.book ? ', bookmatch:challan_books!inner(book_id)' : '');

  let query = supabase
    .from('challans')
    .select(select, { count: 'exact' })
    .order('challan_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters.challan) query = query.eq('challan_no', filters.challan);
  else if (filters.q) query = query.ilike('challan_no', `%${filters.q.replace(/[%_,()]/g, '')}%`);
  if (filters.district) query = query.eq('leads.institute_contacts.institutes.locations.district', filters.district);
  if (filters.rep) query = query.eq('agent_id', filters.rep);
  if (filters.book) query = query.eq('bookmatch.book_id', filters.book);
  if (filters.from) query = query.gte('challan_date', filters.from);
  if (filters.to) query = query.lte('challan_date', filters.to);

  const offset = (page - 1) * PAGE_SIZE;
  const [{ data, count, error }, { data: agents }, { data: books }] = await Promise.all([
    query.range(offset, offset + PAGE_SIZE - 1),
    supabase.from('agents').select('id, name').order('name'),
    supabase.from('books').select('id, title').order('title'),
  ]);

  const rows: RecordRow[] = ((data as unknown as Record<string, unknown>[]) || []).map(c => {
    const lead = one<Record<string, unknown>>(c.leads as Record<string, unknown>);
    const ic = one<Record<string, unknown>>(lead?.institute_contacts as Record<string, unknown>);
    const contact = one(ic?.contacts as { name?: string; mobile_no?: string });
    const inst = one(ic?.institutes as { name?: string; village_town?: string; locations?: unknown });
    const loc = one(inst?.locations as { district?: string });
    const lines = (c.challan_books as Array<{ quantity: number; books: unknown }>) || [];
    return {
      id: c.id as string,
      challan_no: c.challan_no as string,
      challan_date: c.challan_date as string,
      lead_id: (lead?.id as string) || (c.lead_id as string),
      lead_seq_id: (lead?.lead_seq_id as string) || null,
      status: (lead?.status as string) || null,
      contact: contact?.name || null,
      mobile: contact?.mobile_no || null,
      institute: inst?.name || null,
      town: inst?.village_town || null,
      district: loc?.district || null,
      rep: one(c.agents as { name?: string })?.name || null,
      books: lines.map(l => ({ title: one(l.books as { title?: string })?.title || 'Unknown', quantity: l.quantity ?? 1 })),
    };
  });

  const canCreate = !!session && ['admin', 'manager', 'data_entry'].includes(session.role);
  const canExport = !!session && ['admin', 'manager'].includes(session.role);

  return (
    <RecordsClient
      rows={rows}
      total={count || 0}
      page={page}
      pageSize={PAGE_SIZE}
      filters={filters}
      agents={(agents as { id: string; name: string }[]) || []}
      books={(books as { id: string; title: string }[]) || []}
      canCreate={canCreate}
      canExport={canExport}
      error={error?.message || null}
    />
  );
}
