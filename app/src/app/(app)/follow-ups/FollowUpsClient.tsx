'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { List, PhoneCall } from 'lucide-react';
import { Page, PageHeader, Segmented, Tabs } from '@/components/ui';
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
          <Segmented<Mode>
            label="View"
            full
            value={mode}
            onChange={v => setParam('mode', v === 'list' ? null : v)}
            options={[
              { value: 'list', label: 'List', icon: <List className="size-3.5" /> },
              { value: 'call', label: `Call mode${callQueue ? ` · ${callQueue}` : ''}`, icon: <PhoneCall className="size-3.5" /> },
            ]}
          />
        }
      />

      {mode === 'call' ? (
        <CallMode onChanged={loadCounts} />
      ) : (
        <>
          <Tabs<Tab>
            label="Follow-up status"
            className="mb-4"
            value={tab}
            onChange={v => setParam('tab', v === 'open' ? null : v)}
            items={[
              { value: 'open', label: 'To do', count: counts ? counts.overdue + counts.due_today + counts.upcoming : null },
              { value: 'completed', label: 'Completed' },
            ]}
          />
          <FollowUpList key={tab} tab={tab} counts={counts} onChanged={loadCounts} />
        </>
      )}
    </Page>
  );
}
