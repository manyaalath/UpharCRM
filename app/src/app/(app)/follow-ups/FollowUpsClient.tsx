'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { List, PhoneCall } from 'lucide-react';
import { Page, PageHeader, cn } from '@/components/ui';
import CallMode from './CallMode';
import FollowUpList from './FollowUpList';
import type { QueueCounts } from './shared';

type Mode = 'list' | 'call';
type Tab = 'open' | 'completed';

export default function FollowUpsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const mode: Mode = params.get('mode') === 'call' ? 'call' : 'list';
  const tab: Tab = params.get('tab') === 'completed' ? 'completed' : 'open';

  const [counts, setCounts] = useState<QueueCounts | null>(null);

  const loadCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/follow-ups?counts=1');
      if (res.ok) setCounts((await res.json()).counts);
    } catch { /* counts are a nicety */ }
  }, []);

  useEffect(() => { loadCounts(); }, [loadCounts]);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const callQueue = counts ? counts.overdue + counts.due_today : null;

  const description = counts ? (
    <span className="flex flex-wrap gap-x-3 gap-y-0.5">
      <span><span className="font-mono text-bad">{counts.overdue}</span> overdue</span>
      <span><span className="font-mono text-warn">{counts.due_today}</span> due today</span>
      <span><span className="font-mono text-ink">{counts.upcoming}</span> upcoming</span>
      <span><span className="font-mono text-ok">{counts.completed_today}</span> done today</span>
    </span>
  ) : 'Calls to make, and who to call next.';

  return (
    <Page>
      <PageHeader
        title="Follow-ups"
        description={description}
        actions={
          <div className="inline-flex rounded-md border border-line-strong bg-surface p-0.5" role="tablist" aria-label="View">
            {([
              ['list', 'List', <List key="i" className="size-3.5" />],
              ['call', `Call mode${callQueue ? ` · ${callQueue}` : ''}`, <PhoneCall key="i" className="size-3.5" />],
            ] as const).map(([value, label, icon]) => (
              <button
                key={value}
                role="tab"
                aria-selected={mode === value}
                onClick={() => setParam('mode', value === 'list' ? null : value)}
                className={cn(
                  'inline-flex items-center gap-1.5 h-8 px-3 rounded-[5px] text-[13px] font-medium transition-colors',
                  mode === value ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink'
                )}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        }
      />

      {mode === 'call' ? (
        <CallMode onChanged={loadCounts} />
      ) : (
        <>
          <div className="flex gap-5 border-b border-line mb-4" role="tablist" aria-label="Follow-up status">
            {([
              ['open', 'To do', counts ? counts.overdue + counts.due_today + counts.upcoming : null],
              ['completed', 'Completed', null],
            ] as const).map(([value, label, count]) => (
              <button
                key={value}
                role="tab"
                aria-selected={tab === value}
                onClick={() => setParam('tab', value === 'open' ? null : value)}
                className={cn(
                  '-mb-px h-9 border-b-2 text-[13.5px] font-medium transition-colors',
                  tab === value ? 'border-accent text-ink' : 'border-transparent text-ink-2 hover:text-ink'
                )}
              >
                {label}
                {count != null && <span className="ml-1.5 font-mono text-[12px] text-ink-3">{count}</span>}
              </button>
            ))}
          </div>
          <FollowUpList key={tab} tab={tab} counts={counts} onChanged={loadCounts} />
        </>
      )}
    </Page>
  );
}
