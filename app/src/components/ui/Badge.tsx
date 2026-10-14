import type { ReactNode } from 'react';
import { cn } from './cn';

export type Tone = 'neutral' | 'ok' | 'warn' | 'bad' | 'info' | 'accent';

const tones: Record<Tone, string> = {
  neutral: 'bg-sunken text-ink-2',
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
  info: 'bg-info-soft text-info',
  accent: 'bg-accent-soft text-accent',
};

const dots: Record<Tone, string> = {
  neutral: 'bg-ink-3',
  ok: 'bg-ok',
  warn: 'bg-warn',
  bad: 'bg-bad',
  info: 'bg-info',
  accent: 'bg-accent',
};

export function Badge({ tone = 'neutral', dot, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 h-5.5 px-2 rounded-sm text-[11.5px] font-medium whitespace-nowrap', tones[tone], className)}>
      {dot && <span className={cn('size-1.5 rounded-full', dots[tone])} aria-hidden />}
      {children}
    </span>
  );
}

// ---- Domain status → tone. One mapping, used on every screen. ----

const LEAD_STATUS: Record<string, { label: string; tone: Tone }> = {
  new: { label: 'New', tone: 'info' },
  contacted: { label: 'Contacted', tone: 'neutral' },
  interested: { label: 'Interested', tone: 'ok' },
  followup_pending: { label: 'Follow-up due', tone: 'warn' },
  not_interested: { label: 'Not interested', tone: 'bad' },
  closed: { label: 'Closed', tone: 'neutral' },
};

const FOLLOWUP_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: 'Pending', tone: 'warn' },
  overdue: { label: 'Overdue', tone: 'bad' },
  completed: { label: 'Done', tone: 'ok' },
  rescheduled: { label: 'Rescheduled', tone: 'info' },
};

export function leadStatusMeta(status?: string | null) {
  return LEAD_STATUS[status || ''] || { label: status ? status.replace(/_/g, ' ') : '—', tone: 'neutral' as Tone };
}

export function LeadStatusBadge({ status }: { status?: string | null }) {
  const m = leadStatusMeta(status);
  return <Badge tone={m.tone} dot>{m.label}</Badge>;
}

export function FollowUpStatusBadge({ status }: { status?: string | null }) {
  const m = FOLLOWUP_STATUS[status || ''] || { label: status || '—', tone: 'neutral' as Tone };
  return <Badge tone={m.tone} dot>{m.label}</Badge>;
}
