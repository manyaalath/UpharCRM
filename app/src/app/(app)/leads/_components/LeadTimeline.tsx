'use client';

import {
  BookOpen, CalendarClock, CircleDot, MessageCircle, MessageCircleReply, Phone, RefreshCw, UserPlus,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { EmptyState, Skeleton, cn } from '@/components/ui';
import { formatDate, formatDateTime } from '@/lib/date';
import type { TimelineItem, TimelineKind } from '@/app/api/leads/[id]/timeline/types';

const ICONS: Record<TimelineKind, ComponentType<{ className?: string }>> = {
  challan: BookOpen,
  call: Phone,
  followup: CalendarClock,
  whatsapp_out: MessageCircle,
  whatsapp_in: MessageCircleReply,
  status: RefreshCw,
  created: UserPlus,
  note: CircleDot,
};

const TONE_TEXT: Record<string, string> = {
  ok: 'text-ok',
  warn: 'text-warn',
  bad: 'text-bad',
  info: 'text-info',
  neutral: 'text-ink-2',
};

export function LeadTimeline({ items, loading }: { items: TimelineItem[] | null; loading: boolean }) {
  if (loading && !items) {
    return (
      <div className="space-y-4 py-1">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-6 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-2/5" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!items?.length) {
    return <EmptyState title="No history yet" description="Calls, specimen visits and follow-ups will show up here." className="py-8" />;
  }

  return (
    <ol className="relative">
      {items.map((item, idx) => {
        const Icon = ICONS[item.kind] || CircleDot;
        const last = idx === items.length - 1;
        return (
          <li key={item.id} className="relative flex gap-3 pb-4">
            {!last && <span className="absolute left-3 top-7 bottom-0 w-px bg-line" aria-hidden />}
            <span
              className={cn(
                'relative z-[1] mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-line bg-surface',
                TONE_TEXT[item.tone || 'neutral']
              )}
            >
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className={cn('text-[13px] font-medium', item.tone && item.tone !== 'neutral' ? TONE_TEXT[item.tone] : 'text-ink')}>
                  {item.title}
                </p>
                <time className="shrink-0 font-mono text-[11.5px] text-ink-3">
                  {item.dateOnly ? formatDate(item.at) : formatDateTime(item.at)}
                </time>
              </div>
              {item.detail && <p className="mt-0.5 text-[12.5px] text-ink-2 break-words">{item.detail}</p>}
              {item.lines?.map(l => (
                <p key={l.label} className="mt-0.5 text-[12.5px] text-ink-2">
                  <span className="text-ink-3">{l.label}: </span>{l.value}
                </p>
              ))}
              {item.meta && <p className="mt-0.5 font-mono text-[11.5px] text-ink-3">{item.meta}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
