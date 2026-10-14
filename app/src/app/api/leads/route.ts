import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { istDayBoundsUTC } from '@/lib/date';

const LEAD_SELECT =
  '*, institute_contacts!inner(id, contacts(name, mobile_no), institutes!inner(name, village_town, locality, locations!inner(district))), agents(name), challans(count)';

const SORTS: Record<string, { column: string; ascending: boolean }> = {
  newest: { column: 'created_at', ascending: false },
  oldest: { column: 'created_at', ascending: true },
  last_contact: { column: 'last_contact_date', ascending: false },
  stale: { column: 'last_contact_date', ascending: true },
};

// Escape characters that have meaning inside PostgREST or() / ilike patterns.
const clean = (s: string) => s.replace(/[,()*%\\]/g, ' ').trim();

// Resolve a free-text search into the institute_contact ids it matches
// (contact name / mobile, institute name). Lead id is matched separately.
async function searchInstituteContactIds(supabase: Awaited<ReturnType<typeof createClient>>, term: string) {
  const digits = term.replace(/\D/g, '');
  const pattern = `%${term}%`;

  const [contactsRes, institutesRes] = await Promise.all([
    supabase
      .from('contacts')
      .select('id')
      .or(digits.length >= 4 ? `name.ilike.${pattern},mobile_no.ilike.%${digits}%` : `name.ilike.${pattern}`)
      .limit(200),
    supabase.from('institutes').select('id').ilike('name', pattern).limit(200),
  ]);
  if (contactsRes.error) throw contactsRes.error;
  if (institutesRes.error) throw institutesRes.error;

  const contactIds = (contactsRes.data || []).map(c => c.id);
  const instituteIds = (institutesRes.data || []).map(i => i.id);
  if (!contactIds.length && !instituteIds.length) return [];

  const ors: string[] = [];
  if (contactIds.length) ors.push(`contact_id.in.(${contactIds.join(',')})`);
  if (instituteIds.length) ors.push(`institute_id.in.(${instituteIds.join(',')})`);

  const { data, error } = await supabase.from('institute_contacts').select('id').or(ors.join(",")).limit(300);
  if (error) throw error;
  return (data || []).map(r => r.id);
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20));
  const offset = (page - 1) * limit;
  const sort = SORTS[searchParams.get('sort') || 'newest'] || SORTS.newest;

  try {
    let query = supabase
      .from('leads')
      .select(LEAD_SELECT, { count: 'exact' })
      .order(sort.column, { ascending: sort.ascending, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const status = searchParams.get('status');
    if (status) query = query.eq('status', status);

    const district = searchParams.get('district');
    if (district) query = query.eq('institute_contacts.institutes.locations.district', district);

    // Rep filter: resolve the name to an id. Filtering on the embedded
    // agents.name without !inner would not filter the parent rows.
    const agentName = searchParams.get('agent_name');
    if (agentName) {
      const { data: agent, error } = await supabase.from('agents').select('id').eq('name', agentName).maybeSingle();
      if (error) throw error;
      if (!agent) return NextResponse.json({ data: [], pagination: { page, limit, total: 0, total_pages: 0 } });
      query = query.eq('agent_id', agent.id);
    }

    // Created-date range, interpreted as IST calendar days.
    const dateStart = searchParams.get('date_start');
    if (dateStart) query = query.gte('created_at', istDayBoundsUTC(dateStart).start);
    const dateEnd = searchParams.get('date_end');
    if (dateEnd) query = query.lte('created_at', istDayBoundsUTC(dateEnd).end);

    const search = clean(searchParams.get('search') || '');
    if (search) {
      const icIds = await searchInstituteContactIds(supabase, search);
      const ors = [`lead_seq_id.ilike.%${search}%`];
      if (icIds.length) ors.push(`institute_contact_id.in.(${icIds.join(',')})`);
      query = query.or(ors.join(','));
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      data,
      pagination: { page, limit, total: count || 0, total_pages: count ? Math.ceil(count / limit) : 0 },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message || 'Failed to load leads';
    console.error('GET /api/leads failed:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
