'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CircleAlert, RefreshCw } from 'lucide-react';
import {
  Badge, Button, EmptyState, LinkButton, Page, PageHeader, Panel, PanelHeader, Skeleton, Stat, StatStrip, type Tone,
} from '@/components/ui';
import { formatDate, formatDateTime, todayIST } from '@/lib/date';

interface RepWorkload {
  name: string;
  status: 'Overloaded' | 'Optimal' | 'Underutilized' | string;
  note: string;
}

interface BriefData {
  manager_briefing: string;
  today_priorities: string[];
  reps_workload: RepWorkload[];
  stale_leads_warning: string;
}

interface BriefFacts {
  due_today: number;
  overdue: number;
  next_7_days: number;
  stale_leads: number;
  reps: { name: string; open_follow_ups: number; overdue_follow_ups: number }[];
}

interface StoredBrief {
  date: string;
  data: BriefData;
  facts: BriefFacts;
  generated_at: string;
}

interface Counts {
  overdue: number;
  due_today: number;
  upcoming: number;
  completed_today: number;
}

const STORAGE_KEY = 'uphar.dailyBrief';

const WORKLOAD_TONE: Record<string, Tone> = {
  Overloaded: 'bad',
  Optimal: 'ok',
  Underutilized: 'warn',
};

function readStored(): StoredBrief | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredBrief;
    return parsed.date === todayIST() ? parsed : null;
  } catch {
    return null;
  }
}

function writeStored(brief: StoredBrief) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(brief)); } catch { /* storage unavailable */ }
}

export default function DailyBriefClient() {
  const [brief, setBrief] = useState<StoredBrief | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; notConfigured?: boolean } | null>(null);

  useEffect(() => {
    setBrief(readStored());
    fetch('/api/follow-ups?counts=1')
      .then(r => (r.ok ? r.json() : null))
      .then(j => j && setCounts(j.counts))
      .catch(() => {});
  }, []);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/daily-brief', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError({ message: json.error || 'Could not generate the brief', notConfigured: json.code === 'ai_not_configured' });
        return;
      }
      const stored: StoredBrief = { date: todayIST(), data: json.data, facts: json.facts, generated_at: json.generated_at };
      setBrief(stored);
      writeStored(stored);
    } catch {
      setError({ message: 'Could not reach the server. Check your connection.' });
    } finally {
      setLoading(false);
    }
  }, []);

  const data = brief?.data;
  const facts = brief?.facts;
  const repFacts = new Map((facts?.reps || []).map(r => [r.name, r]));

  return (
    <Page className="max-w-[1080px]">
      <PageHeader
        title="Daily brief"
        description={
          <>
            {formatDate(todayIST())}
            {brief && <span className="text-ink-3"> · generated {formatDateTime(brief.generated_at)}</span>}
          </>
        }
        actions={
          <Button
            variant={brief ? 'secondary' : 'primary'}
            onClick={generate}
            loading={loading}
            icon={brief ? <RefreshCw className="size-3.5" /> : undefined}
          >
            {loading ? 'Reading today’s data…' : brief ? 'Regenerate' : 'Generate brief'}
          </Button>
        }
      />

      {/* Real numbers — always shown, independent of the AI text. */}
      <StatStrip cols={4} className="mb-5">
        <Stat label="Overdue calls" value={counts ? counts.overdue : '—'} href="/follow-ups" />
        <Stat label="Due today" value={counts ? counts.due_today : '—'} href="/follow-ups?mode=call" />
        <Stat label="Upcoming" value={counts ? counts.upcoming : '—'} sub={facts ? `${facts.next_7_days} in the next 7 days` : undefined} />
        <Stat label="Stale leads (30+ days)" value={facts ? facts.stale_leads : '—'} sub={facts ? undefined : 'After generating'} href="/leads" />
      </StatStrip>

      {error && (
        <Panel className="mb-5">
          <div className="flex items-start gap-3 px-4 py-3.5">
            <CircleAlert className="size-4 mt-0.5 text-bad shrink-0" />
            <div className="text-[13.5px]">
              <p className="font-medium text-ink">{error.notConfigured ? 'AI is not configured' : 'The brief could not be generated'}</p>
              <p className="mt-0.5 text-ink-2">
                {error.notConfigured
                  ? 'Add GROQ_API_KEY to the environment (local .env and Vercel project settings), then try again. The numbers above are still live.'
                  : error.message}
              </p>
            </div>
          </div>
        </Panel>
      )}

      {loading && !data && (
        <Panel className="p-5 space-y-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </Panel>
      )}

      {!data && !loading && !error && (
        <Panel>
          <EmptyState
            title="No brief yet today"
            description="The brief reads today’s follow-ups, overdue calls, rep workloads and leads that have gone quiet, then suggests where to start."
            action={<Button variant="primary" onClick={generate}>Generate brief</Button>}
          />
        </Panel>
      )}

      {data && (
        <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <Panel className="mb-5">
            <PanelHeader title="Morning briefing" meta="AI summary of today’s data" />
            <p className="px-5 py-4 text-[15px] leading-relaxed text-ink max-w-[72ch]">{data.manager_briefing}</p>
          </Panel>

          <div className="grid gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] mb-5">
            <Panel>
              <PanelHeader title="Priorities for today" />
              {data.today_priorities?.length ? (
                <ol className="divide-y divide-line">
                  {data.today_priorities.map((p, i) => (
                    <li key={i} className="grid grid-cols-[28px_1fr] gap-2 px-4 py-3 text-[13.5px] text-ink">
                      <span className="font-mono text-ink-3">{String(i + 1).padStart(2, '0')}</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="px-4 py-3 text-[13px] text-ink-3">No priorities returned.</p>
              )}
            </Panel>

            <Panel>
              <PanelHeader
                title="Leads going quiet"
                meta={facts ? `${facts.stale_leads} not updated in 30+ days` : undefined}
                actions={<LinkButton href="/leads" size="sm" variant="ghost">Open leads</LinkButton>}
              />
              <p className="px-4 py-3 text-[13.5px] text-ink-2 leading-relaxed">{data.stale_leads_warning || '—'}</p>
            </Panel>
          </div>

          <Panel>
            <PanelHeader title="Rep workload" meta="Counts are live; status and notes are AI suggestions" />
            {data.reps_workload?.length ? (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Representative</th>
                      <th className="text-right">Open</th>
                      <th className="text-right">Overdue</th>
                      <th>Load</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.reps_workload.map(rep => {
                      const f = repFacts.get(rep.name);
                      return (
                        <tr key={rep.name}>
                          <td className="font-medium text-ink whitespace-nowrap">{rep.name}</td>
                          <td className="num">{f ? f.open_follow_ups : '—'}</td>
                          <td className={`num ${f && f.overdue_follow_ups > 0 ? 'text-bad' : ''}`}>{f ? f.overdue_follow_ups : '—'}</td>
                          <td><Badge tone={WORKLOAD_TONE[rep.status] || 'neutral'}>{rep.status}</Badge></td>
                          <td className="text-ink-2 min-w-[240px]">{rep.note}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-4 py-3 text-[13px] text-ink-3">No active representatives.</p>
            )}
          </Panel>

          <p className="mt-4 text-[12px] text-ink-3">
            AI text can be wrong. Check the numbers on <Link href="/follow-ups" className="underline underline-offset-2 hover:text-ink">Follow-ups</Link> before acting.
          </p>
        </div>
      )}
    </Page>
  );
}
