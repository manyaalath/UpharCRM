import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { istDayBoundsUTC, todayIST } from '@/lib/date';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const OPEN_STATUSES = ['pending', 'overdue'];

const FOLLOWUP_SELECT = `
  id, lead_id, challan_id, followup_date, status, remarks, created_at, updated_at,
  agents(name),
  leads:lead_id (
    id, lead_seq_id, status, last_contact_date,
    agents(name),
    institute_contacts(
      contacts(name, mobile_no),
      institutes(name, village_town, locations(district))
    )
  )`;

// Flat row shape returned to the UI.
export interface FollowUpRow {
  id: string;
  lead_id: string;
  lead_seq_id: string | null;
  lead_status: string | null;
  followup_date: string;
  status: string; // pending | overdue | completed (overdue computed at read time)
  remarks: string | null;
  contact_name: string | null;
  mobile_no: string | null;
  institute_name: string | null;
  village_town: string | null;
  district: string | null;
  rep_name: string | null;
  last_outcome: string | null;
  last_outcome_at: string | null;
  updated_at: string | null;
}

type Raw = Record<string, unknown>;
const one = <T,>(v: unknown): T | undefined => (Array.isArray(v) ? v[0] : v) as T | undefined;

function flatten(f: Raw, today: string, outcomes: Map<string, { outcome: string; at: string }>): FollowUpRow {
  const lead = one<Raw>(f.leads);
  const ic = one<Raw>(lead?.institute_contacts);
  const contact = one<{ name?: string; mobile_no?: string }>(ic?.contacts);
  const inst = one<{ name?: string; village_town?: string | null; locations?: unknown }>(ic?.institutes);
  const loc = one<{ district?: string }>(inst?.locations);
  const fuAgent = one<{ name?: string }>(f.agents);
  const leadAgent = one<{ name?: string }>(lead?.agents);
  const status = String(f.status);
  const date = String(f.followup_date);
  const last = outcomes.get(String(f.lead_id));
  return {
    id: String(f.id),
    lead_id: String(f.lead_id),
    lead_seq_id: (lead?.lead_seq_id as string) ?? null,
    lead_status: (lead?.status as string) ?? null,
    followup_date: date,
    status: OPEN_STATUSES.includes(status) ? (date < today ? 'overdue' : 'pending') : status,
    remarks: (f.remarks as string) ?? null,
    contact_name: contact?.name ?? null,
    mobile_no: contact?.mobile_no ?? null,
    institute_name: inst?.name ?? null,
    village_town: inst?.village_town ?? null,
    district: loc?.district ?? null,
    rep_name: fuAgent?.name ?? leadAgent?.name ?? null,
    last_outcome: last?.outcome ?? null,
    last_outcome_at: last?.at ?? null,
    updated_at: (f.updated_at as string) ?? null,
  };
}

// Latest call outcome per lead, for the given leads.
async function latestOutcomes(supabase: SupabaseClient, leadIds: string[]) {
  const map = new Map<string, { outcome: string; at: string }>();
  if (!leadIds.length) return map;
  const { data } = await supabase
    .from('call_feedback')
    .select('lead_id, call_outcome, created_at')
    .in('lead_id', leadIds)
    .order('created_at', { ascending: false });
  for (const r of data || []) {
    if (!map.has(r.lead_id)) map.set(r.lead_id, { outcome: r.call_outcome, at: r.created_at || '' });
  }
  return map;
}

async function queueCounts(supabase: SupabaseClient, today: string) {
  const { start } = istDayBoundsUTC(today);
  const head = { count: 'exact' as const, head: true };
  const [overdue, dueToday, upcoming, completedToday] = await Promise.all([
    supabase.from('follow_ups').select('id', head).lt('followup_date', today).in('status', OPEN_STATUSES),
    supabase.from('follow_ups').select('id', head).eq('followup_date', today).in('status', OPEN_STATUSES),
    supabase.from('follow_ups').select('id', head).gt('followup_date', today).in('status', OPEN_STATUSES),
    supabase.from('follow_ups').select('id', head).eq('status', 'completed').gte('updated_at', start),
  ]);
  return {
    overdue: overdue.count || 0,
    due_today: dueToday.count || 0,
    upcoming: upcoming.count || 0,
    completed_today: completedToday.count || 0,
  };
}

// Context for call mode: books given, recent activity, past remarks.
async function leadDetail(supabase: SupabaseClient, leadId: string) {
  const [challansRes, activitiesRes, remarksRes] = await Promise.all([
    supabase
      .from('challans')
      .select('challan_no, challan_date, challan_books(quantity, books(title))')
      .eq('lead_id', leadId)
      .order('challan_date', { ascending: false }),
    supabase
      .from('lead_activities')
      .select('id, activity_type, description, created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('call_feedback')
      .select('call_outcome, remarks, suggestions, complaints, created_at, created_by')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const books: { title: string; quantity: number; challan_no: string; date: string }[] = [];
  for (const c of challansRes.data || []) {
    for (const cb of (c.challan_books as unknown as Array<{ quantity: number; books: unknown }>) || []) {
      books.push({
        title: one<{ title?: string }>(cb.books)?.title || 'Unknown title',
        quantity: cb.quantity || 1,
        challan_no: c.challan_no,
        date: c.challan_date,
      });
    }
  }

  return {
    books,
    activities: activitiesRes.data || [],
    calls: remarksRes.data || [],
  };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const today = todayIST();

  // ?counts=1 — numbers for the tabs only.
  if (searchParams.get('counts')) {
    return NextResponse.json({ counts: await queueCounts(supabase, today) });
  }

  // ?detail=<lead_id> — call-mode context for one lead.
  const detailLead = searchParams.get('detail');
  if (detailLead) {
    return NextResponse.json({ data: await leadDetail(supabase, detailLead) });
  }

  const leadId = searchParams.get('lead_id');
  const status = searchParams.get('status');
  // due_today | overdue | upcoming | completed | open (all not-done) | call (overdue + today)
  const queue = searchParams.get('queue');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50') || 50));
  const from = (page - 1) * limit;

  let query = supabase.from('follow_ups').select(FOLLOWUP_SELECT, { count: 'exact' });

  if (leadId) query = query.eq('lead_id', leadId);
  if (status === 'overdue') query = query.lt('followup_date', today).in('status', OPEN_STATUSES);
  else if (status === 'pending') query = query.in('status', OPEN_STATUSES);
  else if (status) query = query.eq('status', status);

  if (queue === 'due_today') {
    query = query.eq('followup_date', today).in('status', OPEN_STATUSES);
  } else if (queue === 'overdue') {
    query = query.lt('followup_date', today).in('status', OPEN_STATUSES);
  } else if (queue === 'upcoming') {
    query = query.gt('followup_date', today).in('status', OPEN_STATUSES);
  } else if (queue === 'open') {
    query = query.in('status', OPEN_STATUSES);
  } else if (queue === 'call') {
    query = query.lte('followup_date', today).in('status', OPEN_STATUSES);
  }

  if (queue === 'completed') {
    query = query.eq('status', 'completed').order('updated_at', { ascending: false });
  } else {
    query = query.order('followup_date', { ascending: true }).order('created_at', { ascending: true });
  }

  const { data, count, error } = await query.range(from, from + limit - 1);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data || []) as unknown as Raw[];
  const outcomes = await latestOutcomes(supabase, [...new Set(rows.map(r => String(r.lead_id)))]);

  return NextResponse.json({
    data: rows.map(r => flatten(r, today, outcomes)),
    pagination: { page, limit, total: count || 0, total_pages: count ? Math.ceil(count / limit) : 0 },
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  if (!body.lead_id || !body.followup_date) {
    return NextResponse.json({ error: 'lead_id and followup_date are required' }, { status: 422 });
  }

  let agentId = body.agent_id;
  if (!agentId && body.agent_name) {
    const { data: agent } = await supabase.from('agents').select('id').eq('name', body.agent_name).maybeSingle();
    if (agent) agentId = agent.id;
  }

  const { data, error } = await supabase
    .from('follow_ups')
    .insert([{
      lead_id: body.lead_id,
      challan_id: body.challan_id || null,
      agent_id: agentId || null,
      followup_date: body.followup_date,
      status: 'pending',
      remarks: body.remarks || null,
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('lead_activities').insert([{
    lead_id: body.lead_id,
    activity_type: 'followup_created',
    description: `Follow-up scheduled for ${body.followup_date}`,
    metadata: { followup_date: body.followup_date },
  }]);

  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  if (!body.id) {
    return NextResponse.json({ error: 'Follow-up ID is required' }, { status: 422 });
  }

  const updates: Record<string, unknown> = {};
  if (body.status) updates.status = body.status;
  if (body.followup_date) updates.followup_date = body.followup_date;
  if (body.remarks !== undefined) updates.remarks = body.remarks;

  if (body.agent_id !== undefined) updates.agent_id = body.agent_id;
  else if (body.agent_name) {
    const { data: agent } = await supabase.from('agents').select('id').eq('name', body.agent_name).maybeSingle();
    if (agent) updates.agent_id = agent.id;
  }

  // Rescheduling puts the follow-up back in the pending queue.
  if (body.status === 'rescheduled') {
    updates.status = 'pending';
  }

  const { data, error } = await supabase
    .from('follow_ups')
    .update(updates)
    .eq('id', body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.status && body.lead_id) {
    await supabase.from('lead_activities').insert([{
      lead_id: body.lead_id,
      activity_type: 'status_changed',
      description: `Follow-up ${body.status}${body.followup_date ? ` to ${body.followup_date}` : ''}`,
      metadata: { followup_id: body.id, new_status: body.status, ...(body.followup_date && { new_date: body.followup_date }) },
    }]);
  }

  return NextResponse.json(data);
}
