'use client';

import { useEffect, useState } from 'react';
import { BookOpen, History, MessageSquareText } from 'lucide-react';
import { Badge, Button, Skeleton, Textarea, cn, type Tone } from '@/components/ui';
import { CALL_OUTCOME_OPTIONS, type CallOutcome } from '@/lib/types';
import { addDaysIST, formatDate, formatDateTime, relativeDay, todayIST } from '@/lib/date';

// Row shape returned by GET /api/follow-ups.
export interface FollowUpRow {
  id: string;
  lead_id: string;
  lead_seq_id: string | null;
  lead_status: string | null;
  followup_date: string;
  status: string;
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

export interface QueueCounts {
  overdue: number;
  due_today: number;
  upcoming: number;
  completed_today: number;
}

export interface LeadContext {
  books: { title: string; quantity: number; challan_no: string; date: string }[];
  activities: { id: string; activity_type: string; description: string; created_at: string | null }[];
  calls: { call_outcome: string; remarks: string | null; suggestions: string | null; complaints: string | null; created_at: string | null; created_by: string | null }[];
}

export const OUTCOME_META: Record<CallOutcome, { tone: Tone; nextDays: number | null }> = {
  not_reachable: { tone: 'neutral', nextDays: 2 },
  busy: { tone: 'neutral', nextDays: 2 },
  call_back_later: { tone: 'warn', nextDays: 2 },
  interested: { tone: 'ok', nextDays: 7 },
  not_interested: { tone: 'bad', nextDays: null },
  wants_more_specimens: { tone: 'info', nextDays: 7 },
};

export function outcomeLabel(value?: string | null) {
  return CALL_OUTCOME_OPTIONS.find(o => o.value === value)?.label ?? (value ? value.replace(/_/g, ' ') : '—');
}

export function OutcomeBadge({ value }: { value?: string | null }) {
  if (!value) return <span className="text-ink-3">—</span>;
  const tone = OUTCOME_META[value as CallOutcome]?.tone ?? 'neutral';
  return <Badge tone={tone}>{outcomeLabel(value)}</Badge>;
}

export function phoneDigits(phone?: string | null) {
  return (phone || '').replace(/\D/g, '');
}

export function whatsappHref(phone?: string | null) {
  const d = phoneDigits(phone);
  if (!d) return undefined;
  return `https://wa.me/${d.length === 10 ? `91${d}` : d}`;
}

export function formatPhone(phone?: string | null) {
  const d = phoneDigits(phone);
  if (d.length === 10) return `${d.slice(0, 5)} ${d.slice(5)}`;
  return phone || '—';
}

export function dueText(row: Pick<FollowUpRow, 'followup_date' | 'status'>) {
  return relativeDay(row.followup_date);
}

export function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

// Broadcast so the dashboard (and other tabs) refresh after a change.
export function notifyRefresh() {
  try {
    const bc = new BroadcastChannel('dashboard-refresh');
    bc.postMessage('refresh');
    bc.close();
  } catch { /* unsupported */ }
}

// ── Lead context: books, recent activity, previous calls ──

const contextCache = new Map<string, LeadContext>();

export async function loadLeadContext(leadId: string): Promise<LeadContext | null> {
  if (contextCache.has(leadId)) return contextCache.get(leadId)!;
  try {
    const res = await fetch(`/api/follow-ups?detail=${encodeURIComponent(leadId)}`);
    if (!res.ok) return null;
    const json = await res.json();
    contextCache.set(leadId, json.data);
    return json.data;
  } catch {
    return null;
  }
}

export function forgetLeadContext(leadId: string) {
  contextCache.delete(leadId);
}

export function LeadContextPanel({ leadId, remarks, className }: { leadId: string; remarks?: string | null; className?: string }) {
  const [ctx, setCtx] = useState<LeadContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadLeadContext(leadId).then(data => {
      if (!alive) return;
      setCtx(data);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [leadId]);

  const totalBooks = ctx?.books.reduce((n, b) => n + b.quantity, 0) ?? 0;

  return (
    <div className={cn('flex flex-col divide-y divide-line', className)}>
      <section className="py-4 first:pt-0">
        <h3 className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-2 mb-2">
          <BookOpen className="size-3.5" /> Specimens given
          {ctx && ctx.books.length > 0 && <span className="font-mono font-normal text-ink-3">· {totalBooks}</span>}
        </h3>
        {loading ? (
          <div className="space-y-1.5"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
        ) : !ctx || ctx.books.length === 0 ? (
          <p className="text-[13px] text-ink-3">No books recorded.</p>
        ) : (
          <ul className="space-y-1">
            {ctx.books.slice(0, 8).map((b, i) => (
              <li key={`${b.challan_no}-${i}`} className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="text-ink truncate">{b.title}</span>
                <span className="shrink-0 text-[12px] text-ink-3 font-mono">
                  ×{b.quantity} · {formatDate(b.date)}
                </span>
              </li>
            ))}
            {ctx.books.length > 8 && <li className="text-[12px] text-ink-3">+{ctx.books.length - 8} more</li>}
          </ul>
        )}
      </section>

      <section className="py-4">
        <h3 className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-2 mb-2">
          <MessageSquareText className="size-3.5" /> Previous calls
        </h3>
        {remarks && (
          <p className="mb-2 text-[13px] text-ink-2 bg-sunken rounded-md px-2.5 py-2">
            <span className="text-ink-3">Follow-up note: </span>{remarks}
          </p>
        )}
        {loading ? (
          <Skeleton className="h-4 w-2/3" />
        ) : !ctx || ctx.calls.length === 0 ? (
          <p className="text-[13px] text-ink-3">First call to this lead.</p>
        ) : (
          <ul className="space-y-2.5">
            {ctx.calls.slice(0, 3).map((c, i) => (
              <li key={i} className="text-[13px]">
                <div className="flex items-center gap-2">
                  <OutcomeBadge value={c.call_outcome} />
                  <span className="text-[12px] text-ink-3">{formatDateTime(c.created_at)}{c.created_by ? ` · ${c.created_by}` : ''}</span>
                </div>
                {(c.remarks || c.complaints || c.suggestions) && (
                  <p className="mt-1 text-ink-2">{[c.remarks, c.complaints && `Complaint: ${c.complaints}`, c.suggestions && `Suggestion: ${c.suggestions}`].filter(Boolean).join(' · ')}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="py-4 last:pb-0">
        <h3 className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-2 mb-2">
          <History className="size-3.5" /> Recent activity
        </h3>
        {loading ? (
          <Skeleton className="h-4 w-2/3" />
        ) : !ctx || ctx.activities.length === 0 ? (
          <p className="text-[13px] text-ink-3">No activity yet.</p>
        ) : (
          <ol className="space-y-1.5">
            {ctx.activities.map(a => (
              <li key={a.id} className="grid grid-cols-[88px_1fr] gap-2 text-[13px]">
                <span className="text-[12px] text-ink-3 font-mono pt-px">{a.created_at ? formatDate(a.created_at) : '—'}</span>
                <span className="text-ink-2">{a.description}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

// ── Call logging form (used by call mode and the list's "Log call" drawer) ──

export interface CallFormState {
  outcome: CallOutcome | null;
  nextDate: string; // '' = no next follow-up
  remarks: string;
}

export const emptyCallForm = (): CallFormState => ({ outcome: null, nextDate: '', remarks: '' });

export function nextDateFor(outcome: CallOutcome): string {
  const days = OUTCOME_META[outcome].nextDays;
  return days == null ? '' : addDaysIST(days);
}

export async function submitCall(row: FollowUpRow, form: CallFormState): Promise<{ ok: boolean; error?: string }> {
  if (!form.outcome) return { ok: false, error: 'Pick a call outcome' };
  try {
    const res = await fetch('/api/call-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id: row.lead_id,
        followup_id: row.status === 'completed' ? undefined : row.id,
        call_outcome: form.outcome,
        remarks: form.remarks || undefined,
        next_followup_date: form.nextDate || undefined,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: err.error || 'Could not save the call' };
    }
    forgetLeadContext(row.lead_id);
    notifyRefresh();
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not reach the server' };
  }
}

const QUICK_DATES = [
  { label: '+2 days', days: 2 },
  { label: '+1 week', days: 7 },
  { label: '+2 weeks', days: 14 },
];

export function CallForm({
  value, onChange, showKeys, remarksRef,
}: {
  value: CallFormState;
  onChange: (next: CallFormState) => void;
  showKeys?: boolean;
  remarksRef?: React.Ref<HTMLTextAreaElement>;
}) {
  const today = todayIST();
  const pick = (outcome: CallOutcome) => onChange({ ...value, outcome, nextDate: nextDateFor(outcome) });

  return (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend className="text-[12.5px] font-medium text-ink-2 mb-2">How did the call go?</legend>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CALL_OUTCOME_OPTIONS.map((o, i) => {
            const active = value.outcome === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => pick(o.value)}
                aria-pressed={active}
                className={cn(
                  'flex items-center gap-2 min-h-11 md:min-h-10 px-3 rounded-md border text-left text-[13px] transition-colors',
                  active ? 'border-accent bg-accent-soft text-ink font-medium' : 'border-line-strong bg-surface text-ink-2 hover:bg-sunken'
                )}
              >
                {showKeys && (
                  <span className={cn('hidden md:inline-flex items-center justify-center size-5 rounded-sm border font-mono text-[11px]', active ? 'border-accent text-accent' : 'border-line-strong text-ink-3')}>
                    {i + 1}
                  </span>
                )}
                {o.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-[12.5px] font-medium text-ink-2 mb-2">Next follow-up</legend>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...value, nextDate: '' })}
            className={cn('h-9 px-3 rounded-md border text-[12.5px]', value.nextDate === '' ? 'border-ink bg-ink text-white' : 'border-line-strong text-ink-2 hover:bg-sunken')}
          >
            None
          </button>
          {QUICK_DATES.map(q => {
            const d = addDaysIST(q.days, today);
            return (
              <button
                key={q.days}
                type="button"
                onClick={() => onChange({ ...value, nextDate: d })}
                className={cn('h-9 px-3 rounded-md border text-[12.5px]', value.nextDate === d ? 'border-ink bg-ink text-white' : 'border-line-strong text-ink-2 hover:bg-sunken')}
              >
                {q.label}
              </button>
            );
          })}
          <input
            type="date"
            min={today}
            value={value.nextDate}
            onChange={e => onChange({ ...value, nextDate: e.target.value })}
            aria-label="Next follow-up date"
            className="h-9 px-2.5 rounded-md border border-line-strong bg-surface text-[13px] text-ink font-mono focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
        </div>
        <p className="mt-1.5 text-[12px] text-ink-3">
          {value.nextDate ? `Next call ${relativeDay(value.nextDate).toLowerCase()} · ${formatDate(value.nextDate)}` : 'No further follow-up will be scheduled.'}
        </p>
      </fieldset>

      <div>
        <label htmlFor="call-remarks" className="block text-[12.5px] font-medium text-ink-2 mb-1">Notes <span className="text-ink-3 font-normal">(optional)</span></label>
        <Textarea
          id="call-remarks"
          ref={remarksRef}
          rows={2}
          value={value.remarks}
          onChange={e => onChange({ ...value, remarks: e.target.value })}
          placeholder="What did they say? Books they liked, complaints, best time to call…"
        />
      </div>
    </div>
  );
}

export function SaveCallButton({ disabled, loading, onClick, className, label = 'Save call' }: { disabled?: boolean; loading?: boolean; onClick: () => void; className?: string; label?: string }) {
  return (
    <Button variant="primary" size="lg" disabled={disabled} loading={loading} onClick={onClick} className={cn('min-h-11', className)}>
      {label}
    </Button>
  );
}
