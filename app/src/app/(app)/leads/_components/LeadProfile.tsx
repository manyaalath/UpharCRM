'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarPlus, Copy, MessageCircle, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonClass, LeadStatusBadge } from '@/components/ui';
import { LEAD_TYPE_OPTIONS } from '@/lib/types';
import { formatDate, relativeDay } from '@/lib/date';
import type { TimelineResponse } from '@/app/api/leads/[id]/timeline/types';
import { formatMobile, waLink, type LeadView } from './leadFields';
import { LeadStatusSelect, LogCallDialog, ScheduleFollowUpDialog } from './LeadActions';

// Loads the merged timeline + book totals for a lead. `reload` after any write.
export function useLeadTimeline(leadId: string | null) {
  const [data, setData] = useState<TimelineResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  const reload = useCallback(async () => {
    if (!leadId) return;
    ctrl.current?.abort();
    const ac = new AbortController();
    ctrl.current = ac;
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/timeline`, { signal: ac.signal });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not load history');
      setData(json.data);
      setError(null);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'Could not load history');
    } finally {
      if (ctrl.current === ac) setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    setData(null);
    reload();
    return () => ctrl.current?.abort();
  }, [reload]);

  return { data, loading, error, reload };
}

export function PhoneActions({ mobile }: { mobile: string }) {
  if (!mobile) return <span className="text-[13px] text-ink-3">No phone number</span>;
  const wa = waLink(mobile);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(mobile);
      toast.success('Number copied');
    } catch {
      toast.error('Could not copy');
    }
  };
  return (
    <div className="flex items-center gap-1.5">
      <a href={`tel:${mobile}`} className="font-mono text-[15px] font-medium text-ink tabular hover:text-accent mr-1">
        {formatMobile(mobile)}
      </a>
      <a href={`tel:${mobile}`} className={buttonClass('secondary', 'icon')} aria-label="Call" title="Call">
        <Phone className="size-3.5" />
      </a>
      {wa && (
        <a href={wa} target="_blank" rel="noreferrer" className={buttonClass('secondary', 'icon')} aria-label="Open in WhatsApp" title="WhatsApp">
          <MessageCircle className="size-3.5" />
        </a>
      )}
      <Button variant="ghost" size="icon" onClick={copy} aria-label="Copy number" title="Copy">
        <Copy className="size-3.5" />
      </Button>
    </div>
  );
}

// Facts block: place, rep, type, dates. Two columns of label/value.
export function LeadFacts({ view }: { view: LeadView }) {
  const type = LEAD_TYPE_OPTIONS.find(o => o.value === view.leadType)?.label || view.leadType;
  const rows: [string, React.ReactNode][] = [
    ['District', view.district],
    ['Town', view.town || '—'],
    ['Rep', view.rep || 'Unassigned'],
    ['Type', type || '—'],
    ['Last contact', view.lastContact ? relativeDay(view.lastContact) : 'Never'],
    ['Next follow-up', view.nextFollowUp ? relativeDay(view.nextFollowUp) : '—'],
    ['Lead ID', <span key="id" className="font-mono">{view.seq}</span>],
    ['Created', formatDate(view.createdAt)],
  ];
  if (view.altMobile) rows.splice(2, 0, ['Alt. phone', <span key="alt" className="font-mono">{formatMobile(view.altMobile)}</span>]);
  if (view.address || view.pincode) rows.push(['Address', [view.address, view.pincode].filter(Boolean).join(' — ')]);
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
      {rows.map(([k, v]) => (
        <div key={k} className={k === 'Address' ? 'col-span-2' : undefined}>
          <dt className="text-[11.5px] text-ink-3">{k}</dt>
          <dd className="text-[13px] text-ink truncate">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function BooksGiven({ books, loading }: { books: TimelineResponse['books'] | undefined; loading: boolean }) {
  if (loading && !books) return <p className="text-[12.5px] text-ink-3">Loading…</p>;
  if (!books?.length) return <p className="text-[12.5px] text-ink-3">No specimens recorded.</p>;
  return (
    <ul className="divide-y divide-line">
      {books.map(b => (
        <li key={b.id} className="flex items-baseline justify-between gap-3 py-1.5">
          <span className="text-[13px] text-ink min-w-0 truncate">{b.title}</span>
          <span className="shrink-0 font-mono text-[12px] text-ink-2">
            ×{b.total_quantity}
            {b.visits > 1 && <span className="text-ink-3"> · {b.visits} visits</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

// Status + the two everyday actions. Dialogs are owned here.
export function LeadActionBar({
  view, onStatusChange, onLogged,
}: { view: LeadView; onStatusChange: (status: string) => void; onLogged: () => void }) {
  const [callOpen, setCallOpen] = useState(false);
  const [fuOpen, setFuOpen] = useState(false);
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" icon={<Phone className="size-3.5" />} onClick={() => setCallOpen(true)}>Log call</Button>
        <Button icon={<CalendarPlus className="size-3.5" />} onClick={() => setFuOpen(true)}>Follow-up</Button>
        <div className="ml-auto w-[170px]">
          <LeadStatusSelect leadId={view.id} status={view.status} onChanged={onStatusChange} />
        </div>
      </div>
      <LogCallDialog leadId={view.id} open={callOpen} onClose={() => setCallOpen(false)} onSaved={onLogged} />
      <ScheduleFollowUpDialog leadId={view.id} open={fuOpen} onClose={() => setFuOpen(false)} onSaved={onLogged} />
    </>
  );
}

export function LeadTitle({ view }: { view: LeadView }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
      <span>{view.contact}</span>
      <LeadStatusBadge status={view.status} />
    </div>
  );
}
