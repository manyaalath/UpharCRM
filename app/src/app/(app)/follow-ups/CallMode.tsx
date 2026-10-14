'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, MapPin, MessageCircle, Phone } from 'lucide-react';
import { Badge, Button, EmptyState, Kbd, LeadStatusBadge, Panel, Skeleton, buttonClass, cn } from '@/components/ui';
import { CALL_OUTCOME_OPTIONS } from '@/lib/types';
import { formatDate, relativeDay } from '@/lib/date';
import {
  CallForm, LeadContextPanel, OutcomeBadge, SaveCallButton, emptyCallForm, formatPhone, isTypingTarget,
  loadLeadContext, nextDateFor, outcomeLabel, submitCall, whatsappHref,
  type CallFormState, type FollowUpRow,
} from './shared';

const QUEUE_LIMIT = 200;

export default function CallMode({ onChanged }: { onChanged: () => void }) {
  const [queue, setQueue] = useState<FollowUpRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState<Record<string, string>>({}); // follow-up id → outcome logged
  const [form, setForm] = useState<CallFormState>(emptyCallForm);
  const [saving, setSaving] = useState(false);
  const [nextUpcoming, setNextUpcoming] = useState<FollowUpRow | null>(null);
  const remarksRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [queueRes, upcomingRes] = await Promise.all([
        fetch(`/api/follow-ups?queue=call&limit=${QUEUE_LIMIT}`),
        fetch('/api/follow-ups?queue=upcoming&limit=1'),
      ]);
      const queueJson = await queueRes.json();
      if (!queueRes.ok) throw new Error(queueJson.error || 'Could not load the call queue');
      const upcomingJson = await upcomingRes.json().catch(() => ({}));
      setQueue(queueJson.data || []);
      setTotal(queueJson.pagination?.total || 0);
      setNextUpcoming(upcomingJson.data?.[0] ?? null);
      setIndex(0);
      setDone({});
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the call queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const current = queue[index];
  const currentDone = current ? done[current.id] : undefined;
  const doneCount = Object.keys(done).length;
  const remaining = queue.filter(q => !done[q.id]).length;

  // Prefetch the next lead's context so the card is instant.
  useEffect(() => {
    const next = queue[index + 1];
    if (next) loadLeadContext(next.lead_id);
  }, [queue, index]);

  // Reset the form when moving between leads.
  useEffect(() => { setForm(emptyCallForm()); }, [current?.id]);

  const goNext = useCallback(() => {
    setIndex(i => {
      // Next not-yet-done item after i; fall back to end of queue.
      for (let j = i + 1; j < queue.length; j++) if (!done[queue[j].id]) return j;
      return queue.length;
    });
  }, [queue, done]);

  const goPrev = useCallback(() => setIndex(i => Math.max(0, i - 1)), []);

  const save = useCallback(async () => {
    if (!current || !form.outcome || saving || currentDone) return;
    setSaving(true);
    const result = await submitCall(current, form);
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const label = outcomeLabel(form.outcome);
    toast.success(
      `${current.contact_name || 'Lead'}: ${label}`,
      { description: form.nextDate ? `Next call ${formatDate(form.nextDate)}` : 'No further follow-up' }
    );
    setDone(d => ({ ...d, [current.id]: form.outcome! }));
    onChanged();
    // Advance past this one.
    setIndex(i => {
      for (let j = i + 1; j < queue.length; j++) if (!done[queue[j].id] && queue[j].id !== current.id) return j;
      return queue.length;
    });
  }, [current, form, saving, currentDone, onChanged, queue, done]);

  // Keyboard: 1–6 outcome, S skip, ← previous, Ctrl/⌘+Enter save. Ignored while typing (except Ctrl+Enter).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        save();
        return;
      }
      if (isTypingTarget(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
      if (!current) return;
      const n = Number(e.key);
      if (n >= 1 && n <= CALL_OUTCOME_OPTIONS.length && !currentDone) {
        const outcome = CALL_OUTCOME_OPTIONS[n - 1].value;
        setForm(f => ({ ...f, outcome, nextDate: nextDateFor(outcome) }));
      } else if (e.key === 's' || e.key === 'S') {
        goNext();
      } else if (e.key === 'ArrowLeft') {
        goPrev();
      } else if (e.key === 'ArrowRight') {
        goNext();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        remarksRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [current, currentDone, save, goNext, goPrev]);

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Panel className="p-5 space-y-4"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-12 w-full" /><Skeleton className="h-40 w-full" /></Panel>
        <Panel className="p-5 space-y-3"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-2/3" /></Panel>
      </div>
    );
  }

  if (error) {
    return (
      <Panel>
        <EmptyState title="Couldn't load the call queue" description={error} action={<Button onClick={load}>Try again</Button>} />
      </Panel>
    );
  }

  if (!current) {
    return (
      <Panel>
        <EmptyState
          icon={<CheckCircle2 />}
          title={queue.length === 0 ? 'Queue clear for today' : `Queue finished — ${doneCount} call${doneCount === 1 ? '' : 's'} logged`}
          description={
            remaining > 0
              ? `${remaining} skipped call${remaining === 1 ? '' : 's'} still open.`
              : nextUpcoming
                ? `Next follow-up is ${relativeDay(nextUpcoming.followup_date).toLowerCase()} (${formatDate(nextUpcoming.followup_date)}) with ${nextUpcoming.contact_name || 'a lead'}.`
                : 'No upcoming follow-ups scheduled.'
          }
          action={
            remaining > 0
              ? <Button variant="primary" onClick={() => setIndex(queue.findIndex(q => !done[q.id]))}>Go to skipped calls</Button>
              : <Button onClick={load}>Reload queue</Button>
          }
        />
      </Panel>
    );
  }

  const overdue = current.status === 'overdue';
  const wa = whatsappHref(current.mobile_no);
  const progress = queue.length ? Math.round((doneCount / queue.length) * 100) : 0;

  return (
    <div className="pb-24 md:pb-0">
      {/* Progress */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] text-ink-2">Call</span>
          <span className="font-mono text-[15px] font-medium text-ink tabular">{index + 1} <span className="text-ink-3">of {queue.length}</span></span>
          <span className="text-[12px] text-ink-3">· {doneCount} logged</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="ghost" onClick={goPrev} disabled={index === 0} icon={<ArrowLeft className="size-3.5" />}>Previous</Button>
          <Button size="sm" variant="secondary" onClick={goNext} icon={<ArrowRight className="size-3.5" />}>Skip</Button>
        </div>
      </div>
      <div className="h-1 rounded-full bg-sunken overflow-hidden mb-4" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${progress}%` }} />
      </div>
      {total > queue.length && (
        <p className="mb-3 text-[12px] text-ink-3">Showing the oldest {queue.length} of {total} open calls. Reload after this batch.</p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
        {/* Main card */}
        <Panel className="overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-line">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge tone={overdue ? 'bad' : 'warn'} dot>{overdue ? `Overdue · ${relativeDay(current.followup_date)}` : 'Due today'}</Badge>
              <LeadStatusBadge status={current.lead_status} />
              {current.lead_seq_id && <span className="font-mono text-[12px] text-ink-3">{current.lead_seq_id}</span>}
            </div>
            <h2 className="font-serif text-[26px] md:text-[30px] leading-tight font-semibold text-ink">
              {current.contact_name || 'Unnamed contact'}
            </h2>
            <p className="mt-1 text-[14px] text-ink-2">{current.institute_name || 'No institute'}</p>
            <p className="mt-1 flex items-center gap-1 text-[13px] text-ink-3">
              <MapPin className="size-3.5" />
              {[current.village_town, current.district].filter(Boolean).join(', ') || 'No location'}
              {current.rep_name && <span>· Rep: {current.rep_name}</span>}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {current.mobile_no ? (
                <a href={`tel:${current.mobile_no}`} className={buttonClass('primary', 'lg', 'min-h-11 px-5 text-[15px]')}>
                  <Phone className="size-4" /> Call <span className="font-mono">{formatPhone(current.mobile_no)}</span>
                </a>
              ) : (
                <span className="text-[13px] text-ink-3">No phone number on record</span>
              )}
              {wa && (
                <a href={wa} target="_blank" rel="noreferrer" className={buttonClass('secondary', 'lg', 'min-h-11')}>
                  <MessageCircle className="size-4" /> WhatsApp
                </a>
              )}
              <Link href={`/leads/${current.lead_id}`} className={buttonClass('ghost', 'lg', 'min-h-11 ml-auto')}>
                Open lead <ExternalLink className="size-3.5" />
              </Link>
            </div>
          </div>

          <div className="px-5 py-5">
            {currentDone ? (
              <div className="flex flex-wrap items-center gap-2 text-[13.5px] text-ink-2">
                <CheckCircle2 className="size-4 text-ok" /> Logged as <OutcomeBadge value={currentDone} />
                <Button size="sm" variant="secondary" className="ml-auto" onClick={goNext}>Next call</Button>
              </div>
            ) : (
              <CallForm value={form} onChange={setForm} showKeys remarksRef={remarksRef} />
            )}
          </div>

          {/* Desktop save row */}
          {!currentDone && (
            <div className="hidden md:flex items-center justify-between gap-3 px-5 py-3 border-t border-line bg-sunken/50">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-3">
                <span><Kbd>1</Kbd>–<Kbd>6</Kbd> outcome</span>
                <span><Kbd>N</Kbd> notes</span>
                <span><Kbd>S</Kbd> skip</span>
                <span><Kbd>←</Kbd> previous</span>
                <span><Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> save</span>
              </div>
              <SaveCallButton disabled={!form.outcome} loading={saving} onClick={save} label="Save & next" />
            </div>
          )}
        </Panel>

        {/* Context */}
        <Panel className="p-5">
          <LeadContextPanel leadId={current.lead_id} remarks={current.remarks} />
        </Panel>
      </div>

      {/* Mobile sticky action bar (sits above the bottom nav) */}
      {!currentDone && (
        <div className="md:hidden fixed inset-x-0 bottom-16 z-40 border-t border-line bg-surface/95 backdrop-blur px-4 py-3 flex gap-2">
          <Button variant="secondary" size="lg" className="min-h-11" onClick={goNext}>Skip</Button>
          <SaveCallButton disabled={!form.outcome} loading={saving} onClick={save} label={form.outcome ? `Save · ${outcomeLabel(form.outcome)}` : 'Pick an outcome'} className={cn('flex-1')} />
        </div>
      )}
    </div>
  );
}
