// ============================================================
// Live CRM analytics shared by /api/dashboard, /api/export and the
// AI dashboard summary. Pages through every table in 1000-row chunks
// (PostgREST's max per request) so numbers stay right as data grows.
// No writes: "overdue" is derived from the date, not stored.
// ============================================================
import type { SupabaseClient } from '@supabase/supabase-js';
import { addDaysIST, daysBetween, isoDateIST, todayIST } from '@/lib/date';

const PAGE = 1000;

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

// Fetch every row of a query. `make` must apply a stable .order().
export async function fetchAll<T>(make: (from: number, to: number) => PageResult<T>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await make(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = data || [];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

// PostgREST returns many-to-one embeds as objects, but older code saw arrays.
export function one<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

export interface AnalyticsFilters {
  from?: string | null; // YYYY-MM-DD (IST), inclusive
  to?: string | null;   // YYYY-MM-DD (IST), inclusive
  district?: string | null;
}

export interface QueueItem {
  id: string;
  lead_id: string;
  contact_person: string | null;
  institute_name: string | null;
  district: string | null;
  mobile_no: string | null;
  followup_date: string;
  status: string;
}

export interface Analytics {
  generated_at: string;
  range: { from: string | null; to: string | null; prev_from: string | null; prev_to: string | null; days: number | null };
  district: string | null;
  summary: {
    challans: { value: number; prev: number | null };
    leads: { value: number; prev: number | null };
    books: { value: number; prev: number | null };
    pending_followups: number;
    overdue_followups: number;
    districts_covered: number;
  };
  districts: { district: string; challans: number; leads: number; pending_followups: number }[];
  books: { title: string; copies: number; unique_leads: number; repeat: number }[];
  reps: { name: string; challans: number; leads: number; interested: number; followups_done: number }[];
  lead_status: { status: string; count: number }[];
  queue: { overdue: QueueItem[]; due_today: QueueItem[]; upcoming: QueueItem[]; counts: { overdue: number; due_today: number; upcoming: number } };
  top_institutions: { name: string; district: string; visits: number; last_visit: string }[];
  top_teachers: { name: string; district: string; visits: number; last_visit: string }[];
}

interface LeadRow {
  id: string;
  status: string;
  created_at: string | null;
  agent_id: string | null;
  institute_contacts: unknown;
}
interface ChallanRow { id: string; lead_id: string; agent_id: string | null; challan_date: string }
interface ChallanBookRow { challan_id: string; quantity: number | null; books: unknown }
interface FollowUpRow { id: string; lead_id: string; agent_id: string | null; status: string; followup_date: string; updated_at: string | null }
interface AgentRow { id: string; name: string }

interface LeadInfo {
  district: string;
  contact: string | null;
  mobile: string | null;
  institute: string | null;
}

const UNKNOWN = 'Unknown';

function leadInfo(l: LeadRow): LeadInfo {
  const ic = one(l.institute_contacts as Record<string, unknown> | Record<string, unknown>[]);
  const contact = one(ic?.contacts as { name?: string; mobile_no?: string } | undefined);
  const inst = one(ic?.institutes as { name?: string; locations?: unknown } | undefined);
  const loc = one(inst?.locations as { district?: string } | undefined);
  return {
    district: loc?.district || UNKNOWN,
    contact: contact?.name || null,
    mobile: contact?.mobile_no || null,
    institute: inst?.name || null,
  };
}

// Day (YYYY-MM-DD, IST) of a timestamptz.
const dayOf = (ts: string | null) => (ts ? isoDateIST(new Date(ts)) : null);

const inRange = (day: string | null, from: string | null, to: string | null) =>
  !!day && (!from || day >= from) && (!to || day <= to);

export function previousWindow(from: string | null, to: string | null) {
  if (!from || !to) return { prev_from: null, prev_to: null, days: null };
  const days = daysBetween(from, to) + 1;
  return { prev_from: addDaysIST(-days, from), prev_to: addDaysIST(-1, from), days };
}

export async function computeAnalytics(supabase: SupabaseClient, filters: AnalyticsFilters): Promise<Analytics> {
  const from = filters.from || null;
  const to = filters.to || null;
  const district = filters.district || null;
  const { prev_from, prev_to, days } = previousWindow(from, to);
  const today = todayIST();
  const weekAhead = addDaysIST(7, today);

  const [leads, challans, challanBooks, followUps, agents] = await Promise.all([
    fetchAll<LeadRow>((a, b) =>
      supabase
        .from('leads')
        .select('id, status, created_at, agent_id, institute_contacts(contacts(name, mobile_no), institutes(name, locations(district)))')
        .order('id')
        .range(a, b)
    ),
    fetchAll<ChallanRow>((a, b) =>
      supabase.from('challans').select('id, lead_id, agent_id, challan_date').order('id').range(a, b)
    ),
    fetchAll<ChallanBookRow>((a, b) =>
      supabase.from('challan_books').select('challan_id, quantity, books(title)').order('challan_id').order('book_id').range(a, b)
    ),
    fetchAll<FollowUpRow>((a, b) =>
      supabase.from('follow_ups').select('id, lead_id, agent_id, status, followup_date, updated_at').order('id').range(a, b)
    ),
    fetchAll<AgentRow>((a, b) => supabase.from('agents').select('id, name').order('id').range(a, b)),
  ]);

  const agentName = new Map(agents.map(a => [a.id, a.name]));

  // Lead lookups, scoped to the district filter.
  const info = new Map<string, LeadInfo>();
  const leadById = new Map<string, LeadRow>();
  for (const l of leads) {
    const li = leadInfo(l);
    if (district && li.district !== district) continue;
    info.set(l.id, li);
    leadById.set(l.id, l);
  }
  const inScope = (leadId: string) => info.has(leadId);

  const scopedChallans = challans.filter(c => inScope(c.lead_id));
  const challanById = new Map(scopedChallans.map(c => [c.id, c]));
  const scopedFollowUps = followUps.filter(f => inScope(f.lead_id));
  const scopedLeads = [...leadById.values()];

  const challansIn = (f: string | null, t: string | null) => scopedChallans.filter(c => inRange(c.challan_date, f, t));
  const leadsIn = (f: string | null, t: string | null) => scopedLeads.filter(l => (!f && !t ? true : inRange(dayOf(l.created_at), f, t)));
  const booksIn = (ids: Set<string>) =>
    challanBooks.reduce((sum, cb) => (ids.has(cb.challan_id) ? sum + (cb.quantity ?? 1) : sum), 0);

  const curChallans = challansIn(from, to);
  const curChallanIds = new Set(curChallans.map(c => c.id));
  const curLeads = leadsIn(from, to);

  const hasPrev = !!(prev_from && prev_to);
  const prevChallans = hasPrev ? challansIn(prev_from, prev_to) : [];
  const prevLeads = hasPrev ? leadsIn(prev_from, prev_to) : [];

  // ---- Follow-up queue (current state, not date-filtered) ----
  const open = scopedFollowUps.filter(f => f.status === 'pending' || f.status === 'overdue');
  const toItem = (f: FollowUpRow): QueueItem => {
    const li = info.get(f.lead_id);
    return {
      id: f.id,
      lead_id: f.lead_id,
      contact_person: li?.contact ?? null,
      institute_name: li?.institute ?? null,
      district: li?.district ?? null,
      mobile_no: li?.mobile ?? null,
      followup_date: f.followup_date,
      status: f.followup_date < today ? 'overdue' : f.status,
    };
  };
  const byDate = (a: FollowUpRow, b: FollowUpRow) => a.followup_date.localeCompare(b.followup_date);
  const overdue = open.filter(f => f.followup_date < today).sort(byDate);
  const dueToday = open.filter(f => f.followup_date === today);
  const upcoming = open.filter(f => f.followup_date > today && f.followup_date <= weekAhead).sort(byDate);

  // ---- Districts ----
  const dStats = new Map<string, { challans: number; leads: number; pending_followups: number }>();
  const d = (name: string) => {
    let s = dStats.get(name);
    if (!s) dStats.set(name, (s = { challans: 0, leads: 0, pending_followups: 0 }));
    return s;
  };
  curChallans.forEach(c => d(info.get(c.lead_id)!.district).challans++);
  curLeads.forEach(l => d(info.get(l.id)!.district).leads++);
  open.forEach(f => d(info.get(f.lead_id)!.district).pending_followups++);
  const districts = [...dStats.entries()]
    .map(([name, s]) => ({ district: name, ...s }))
    .filter(s => s.challans || s.leads || s.pending_followups)
    .sort((a, b) => b.challans - a.challans || b.leads - a.leads);
  const districtsCovered = new Set(curChallans.map(c => info.get(c.lead_id)!.district).filter(n => n !== UNKNOWN)).size;

  // ---- Books ----
  const bStats = new Map<string, { copies: number; leads: Set<string> }>();
  for (const cb of challanBooks) {
    const c = challanById.get(cb.challan_id);
    if (!c || !curChallanIds.has(c.id)) continue;
    const title = one(cb.books as { title?: string } | undefined)?.title || UNKNOWN;
    let s = bStats.get(title);
    if (!s) bStats.set(title, (s = { copies: 0, leads: new Set() }));
    s.copies += cb.quantity ?? 1;
    s.leads.add(c.lead_id);
  }
  const books = [...bStats.entries()]
    .map(([title, s]) => ({ title, copies: s.copies, unique_leads: s.leads.size, repeat: Math.max(0, s.copies - s.leads.size) }))
    .sort((a, b) => b.copies - a.copies);

  // ---- Reps (plain counts, no weighted score) ----
  const rStats = new Map<string, { challans: number; leads: number; interested: number; followups_done: number }>();
  const r = (id: string | null) => {
    const name = (id && agentName.get(id)) || null;
    if (!name) return null;
    let s = rStats.get(name);
    if (!s) rStats.set(name, (s = { challans: 0, leads: 0, interested: 0, followups_done: 0 }));
    return s;
  };
  curChallans.forEach(c => { const s = r(c.agent_id); if (s) s.challans++; });
  curLeads.forEach(l => { const s = r(l.agent_id); if (s) { s.leads++; if (l.status === 'interested') s.interested++; } });
  scopedFollowUps
    .filter(f => f.status === 'completed' && (!from && !to ? true : inRange(dayOf(f.updated_at), from, to)))
    .forEach(f => { const s = r(f.agent_id); if (s) s.followups_done++; });
  const reps = [...rStats.entries()]
    .map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => b.challans - a.challans || b.leads - a.leads);

  // ---- Lead status (leads created in range) ----
  const statusCounts = new Map<string, number>();
  curLeads.forEach(l => statusCounts.set(l.status, (statusCounts.get(l.status) || 0) + 1));
  const ORDER = ['new', 'contacted', 'interested', 'followup_pending', 'not_interested', 'closed'];
  const lead_status = [...statusCounts.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => (ORDER.indexOf(a.status) + 1 || 99) - (ORDER.indexOf(b.status) + 1 || 99));

  // ---- Most-visited institutions and teachers (challans in range) ----
  const inst = new Map<string, { name: string; district: string; visits: number; last_visit: string }>();
  const teach = new Map<string, { name: string; district: string; visits: number; last_visit: string }>();
  for (const c of curChallans) {
    const li = info.get(c.lead_id)!;
    const bump = (m: typeof inst, key: string | null) => {
      if (!key) return;
      const k = `${key}|${li.district}`;
      const s = m.get(k);
      if (!s) m.set(k, { name: key, district: li.district, visits: 1, last_visit: c.challan_date });
      else { s.visits++; if (c.challan_date > s.last_visit) s.last_visit = c.challan_date; }
    };
    bump(inst, li.institute);
    bump(teach, li.contact);
  }
  const top = (m: typeof inst) => [...m.values()].sort((a, b) => b.visits - a.visits || b.last_visit.localeCompare(a.last_visit)).slice(0, 6);

  return {
    generated_at: new Date().toISOString(),
    range: { from, to, prev_from, prev_to, days },
    district,
    summary: {
      challans: { value: curChallans.length, prev: hasPrev ? prevChallans.length : null },
      leads: { value: curLeads.length, prev: hasPrev ? prevLeads.length : null },
      books: { value: booksIn(curChallanIds), prev: hasPrev ? booksIn(new Set(prevChallans.map(c => c.id))) : null },
      pending_followups: open.length,
      overdue_followups: overdue.length,
      districts_covered: districtsCovered,
    },
    districts,
    books,
    reps,
    lead_status,
    queue: {
      overdue: overdue.slice(0, 10).map(toItem),
      due_today: dueToday.slice(0, 10).map(toItem),
      upcoming: upcoming.slice(0, 10).map(toItem),
      counts: { overdue: overdue.length, due_today: dueToday.length, upcoming: upcoming.length },
    },
    top_institutions: top(inst),
    top_teachers: top(teach),
  };
}

// Parse ?from=&to=&district= (also accepts legacy date_start/date_end).
export function filtersFromParams(sp: URLSearchParams): AnalyticsFilters {
  const valid = (s: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);
  return {
    from: valid(sp.get('from') ?? sp.get('date_start')),
    to: valid(sp.get('to') ?? sp.get('date_end')),
    district: sp.get('district') || null,
  };
}
