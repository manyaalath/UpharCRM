import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { CALL_OUTCOME_OPTIONS } from '@/lib/types';
import type { TimelineItem } from './types';

// Activity types already represented by a primary record below — skip them
// so the timeline doesn't show the same event twice.
const COVERED_ACTIVITIES = new Set([
  'call_completed', 'suggestion_received', 'complaint_received', 'followup_created',
  'specimen_distributed', 'additional_specimen', 'challan_attached', 'whatsapp_sent', 'whatsapp_reply',
]);

const OUTCOME_TONE: Record<string, TimelineItem['tone']> = {
  interested: 'ok', wants_more_specimens: 'ok', not_interested: 'bad', not_reachable: 'warn', busy: 'warn', call_back_later: 'info',
};

const one = <T,>(v: T | T[] | null | undefined): T | undefined => (Array.isArray(v) ? v[0] : v ?? undefined);

// GET /api/leads/[id]/timeline — challans, calls, follow-ups, WhatsApp and
// activity log merged into one list, newest first. Also returns book totals.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: leadId } = await params;
  const supabase = await createClient();

  const [challansRes, callsRes, followUpsRes, activitiesRes, waMsgRes, waReplyRes] = await Promise.all([
    supabase
      .from('challans')
      .select('id, challan_no, challan_date, created_at, agents(name), challan_books(quantity, books(id, title))')
      .eq('lead_id', leadId)
      .order('challan_date', { ascending: false }),
    supabase
      .from('call_feedback')
      .select('id, call_outcome, suggestions, complaints, remarks, created_at')
      .eq('lead_id', leadId),
    supabase
      .from('follow_ups')
      .select('id, followup_date, status, remarks, created_at, updated_at, agents(name)')
      .eq('lead_id', leadId),
    supabase
      .from('lead_activities')
      .select('id, activity_type, description, created_at')
      .eq('lead_id', leadId),
    supabase
      .from('whatsapp_messages')
      .select('id, template_name, status, error, created_at')
      .eq('lead_id', leadId),
    supabase
      .from('lead_replies')
      .select('id, reply_text, button_payload, classification, created_at')
      .eq('lead_id', leadId),
  ]);

  const coreError = challansRes.error || callsRes.error || followUpsRes.error || activitiesRes.error;
  if (coreError) return NextResponse.json({ error: coreError.message }, { status: 500 });

  const items: TimelineItem[] = [];
  const books = new Map<string, { id: string; title: string; total_quantity: number; visits: number }>();

  for (const c of challansRes.data || []) {
    const lines = ((c.challan_books || []) as unknown as { quantity: number; books: { id: string; title: string } | { id: string; title: string }[] | null }[])
      .map(cb => ({ book: one(cb.books), qty: cb.quantity || 1 }))
      .filter(x => x.book);
    for (const { book, qty } of lines) {
      const b = books.get(book!.id) || { id: book!.id, title: book!.title, total_quantity: 0, visits: 0 };
      b.total_quantity += qty;
      b.visits += 1;
      books.set(book!.id, b);
    }
    const rep = one(c.agents as unknown as { name: string } | { name: string }[] | null)?.name;
    items.push({
      id: `challan-${c.id}`,
      kind: 'challan',
      at: c.challan_date || c.created_at,
      dateOnly: !!c.challan_date,
      title: `Specimens given — ${lines.reduce((n, l) => n + l.qty, 0)} ${lines.length === 1 && lines[0].qty === 1 ? 'book' : 'books'}`,
      detail: lines.map(l => (l.qty > 1 ? `${l.book!.title} ×${l.qty}` : l.book!.title)).join(', ') || null,
      meta: [c.challan_no, rep].filter(Boolean).join(' · '),
    });
  }

  for (const f of callsRes.data || []) {
    const label = CALL_OUTCOME_OPTIONS.find(o => o.value === f.call_outcome)?.label || f.call_outcome;
    const lines: { label: string; value: string }[] = [];
    if (f.suggestions) lines.push({ label: 'Suggestion', value: f.suggestions });
    if (f.complaints) lines.push({ label: 'Complaint', value: f.complaints });
    items.push({
      id: `call-${f.id}`,
      kind: 'call',
      at: f.created_at || '',
      title: `Call — ${label}`,
      detail: f.remarks,
      tone: OUTCOME_TONE[f.call_outcome] || 'neutral',
      lines,
    });
  }

  for (const f of followUpsRes.data || []) {
    const rep = one(f.agents as unknown as { name: string } | { name: string }[] | null)?.name;
    const done = f.status === 'completed';
    items.push({
      id: `followup-${f.id}`,
      kind: 'followup',
      at: done ? f.updated_at || f.followup_date : f.followup_date,
      dateOnly: !done,
      title: done ? 'Follow-up completed' : `Follow-up ${f.status === 'overdue' ? 'overdue' : 'scheduled'}`,
      detail: f.remarks,
      meta: [done ? `due ${f.followup_date}` : null, rep].filter(Boolean).join(' · ') || null,
      tone: done ? 'ok' : f.status === 'overdue' ? 'bad' : 'warn',
    });
  }

  for (const a of activitiesRes.data || []) {
    if (COVERED_ACTIVITIES.has(a.activity_type)) continue;
    items.push({
      id: `activity-${a.id}`,
      kind: a.activity_type === 'status_changed' ? 'status' : a.activity_type === 'lead_created' ? 'created' : 'note',
      at: a.created_at || '',
      title: a.activity_type === 'lead_created'
        ? 'Lead created'
        : a.activity_type === 'status_changed'
          ? 'Status changed'
          : String(a.activity_type).replace(/_/g, ' ').replace(/^\w/, (ch: string) => ch.toUpperCase()),
      detail: a.description,
    });
  }

  // WhatsApp tables come from an optional migration; ignore if missing.
  if (!waMsgRes.error) {
    for (const m of waMsgRes.data || []) {
      items.push({
        id: `wa-out-${m.id}`,
        kind: 'whatsapp_out',
        at: m.created_at,
        title: 'WhatsApp confirmation sent',
        detail: m.error || null,
        meta: m.status,
        tone: m.status === 'failed' ? 'bad' : m.status === 'read' ? 'ok' : 'neutral',
      });
    }
  }
  if (!waReplyRes.error) {
    for (const r of waReplyRes.data || []) {
      items.push({
        id: `wa-in-${r.id}`,
        kind: 'whatsapp_in',
        at: r.created_at,
        title: 'WhatsApp reply',
        detail: r.reply_text || r.button_payload,
        meta: r.classification,
        tone: r.classification === 'positive' ? 'ok' : r.classification === 'negative' ? 'bad' : 'neutral',
      });
    }
  }

  // Newest first. Date-only items (challan date, due date) sort as noon IST.
  const key = (i: TimelineItem) => new Date(i.dateOnly ? `${i.at.slice(0, 10)}T12:00:00+05:30` : i.at).getTime() || 0;
  items.sort((a, b) => key(b) - key(a));

  return NextResponse.json({
    data: {
      items,
      books: Array.from(books.values()).sort((a, b) => b.total_quantity - a.total_quantity),
      totals: {
        challans: (challansRes.data || []).length,
        calls: (callsRes.data || []).length,
        books: Array.from(books.values()).reduce((n, b) => n + b.total_quantity, 0),
      },
    },
  });
}
