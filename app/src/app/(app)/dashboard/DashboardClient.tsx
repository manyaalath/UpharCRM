'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Phone, RefreshCw } from 'lucide-react';
import {
  Button, EmptyState, Page, PageHeader, Panel, PanelHeader, Select, Skeleton, Stat, StatStrip, cn, leadStatusMeta,
  type Tone,
} from '@/components/ui';
import { ALL_DISTRICTS } from '@/lib/constants';
import { addDaysIST, formatDate, relativeDay, todayIST } from '@/lib/date';
import { downloadFromApi } from '@/lib/download';
import type { Analytics, QueueItem } from '@/app/api/dashboard/analytics';
import DashboardAiSummary from './DashboardAiSummary';
import DistrictChart from './DistrictChart';
import { RANGES, type RangeKey } from './ranges';



const POLL_MS = 5 * 60_000;

function rangeDates(key: RangeKey): { from: string; to: string } | null {
  const r = RANGES.find(x => x.key === key)!;
  if (!r.days) return null;
  const to = todayIST();
  return { from: addDaysIST(-(r.days - 1), to), to };
}

const nf = (n: number) => n.toLocaleString('en-IN');

// "+12% vs previous 30 days" — colour carries direction, the sign carries it too.
function Delta({ value, prev, days }: { value: number; prev: number | null; days: number | null }) {
  if (prev === null || !days) return null;
  if (prev === 0) return <span className="text-ink-3">{value ? `none in previous ${days} days` : 'no change'}</span>;
  const pct = Math.round(((value - prev) / prev) * 100);
  if (pct === 0) return <span className="text-ink-3">same as previous {days} days</span>;
  const up = pct > 0;
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn('inline-flex items-center font-medium', up ? 'text-ok' : 'text-bad')}>
        {up ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />}
        {up ? '+' : ''}{pct}%
      </span>
      <span className="text-ink-3">vs previous {days} days</span>
    </span>
  );
}

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function ago(ts: number | null, now: number) {
  if (!ts) return '';
  const m = Math.floor((now - ts) / 60_000);
  if (m < 1) return 'Updated just now';
  if (m < 60) return `Updated ${m} min ago`;
  return `Updated ${Math.floor(m / 60)} h ago`;
}

export default function DashboardClient({ initialRange, initialDistrict }: { initialRange: RangeKey; initialDistrict: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [range, setRange] = useState<RangeKey>(initialRange);
  const [district, setDistrict] = useState(initialDistrict);
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const now = useNow();

  const query = useMemo(() => {
    const p = new URLSearchParams();
    const d = rangeDates(range);
    if (d) { p.set('from', d.from); p.set('to', d.to); }
    if (district) p.set('district', district);
    return p.toString();
  }, [range, district]);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?${query}`, { signal: ctrl.signal });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load dashboard');
      setData(json);
      setError(null);
      setUpdatedAt(Date.now());
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setError((e as Error).message || 'Failed to load dashboard');
    } finally {
      if (abortRef.current === ctrl) setLoading(false);
    }
  }, [query]);

  useEffect(() => { load(); }, [load]);

  // Keep the URL shareable: /dashboard?range=90d&district=Patna
  useEffect(() => {
    const p = new URLSearchParams();
    if (range !== '30d') p.set('range', range);
    if (district) p.set('district', district);
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [range, district, pathname, router]);

  // Light polling: every 5 min, only while the tab is visible.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => { if (!timer) timer = setInterval(load, POLL_MS); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const onVis = () => {
      if (document.hidden) stop();
      else {
        if (updatedAt && Date.now() - updatedAt > POLL_MS) load();
        start();
      }
    };
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, [load, updatedAt]);

  const rangeMeta = RANGES.find(r => r.key === range)!;
  const days = data?.range.days ?? null;

  const exportAnalytics = () => {
    const p = new URLSearchParams(query);
    p.set('type', 'analytics');
    p.set('analytics_type', 'all');
    downloadFromApi(`/api/export?${p}`, 'uphar_analytics.xlsx');
  };

  return (
    <Page wide>
      <PageHeader
        title="Overview"
        description={
          <>
            {rangeMeta.days ? `Last ${rangeMeta.label}` : 'All time'} · {district || 'All districts'}
            {data?.range.from && (
              <span className="text-ink-3"> · {formatDate(data.range.from)} – {formatDate(data.range.to)}</span>
            )}
          </>
        }
        actions={
          <>
            <div role="group" aria-label="Date range" className="inline-flex h-8.5 rounded-md border border-line-strong bg-surface p-0.5">
              {RANGES.map(r => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  aria-pressed={range === r.key}
                  className={cn(
                    'px-2.5 rounded-[5px] text-[12.5px] font-medium transition-colors',
                    range === r.key ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink hover:bg-sunken'
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className="w-[170px]">
              <Select value={district} onChange={e => setDistrict(e.target.value)} aria-label="District">
                <option value="">All districts</option>
                {ALL_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </Select>
            </div>
            <Button onClick={exportAnalytics} icon={<Download className="size-4" />}>Export</Button>
            <Button variant="ghost" onClick={load} disabled={loading} title={ago(updatedAt, now)} aria-label="Refresh">
              <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
              <span className="hidden xl:inline text-[12px] text-ink-3 font-normal">{ago(updatedAt, now)}</span>
            </Button>
          </>
        }
      />

      {error && !data ? (
        <Panel>
          <EmptyState
            title="Couldn't load the overview"
            description={error}
            action={<Button variant="primary" onClick={load}>Try again</Button>}
          />
        </Panel>
      ) : !data ? (
        <DashboardSkeleton />
      ) : (
        <div className={cn('flex flex-col gap-4 md:gap-5 transition-opacity', loading && 'opacity-70')}>
          {error && <p className="text-[12.5px] text-bad">Refresh failed: {error}. Showing the last loaded numbers.</p>}

          <StatStrip cols={5}>
            <Stat
              label="Challans"
              value={nf(data.summary.challans.value)}
              sub={<Delta value={data.summary.challans.value} prev={data.summary.challans.prev} days={days} />}
              href="/records"
            />
            <Stat
              label="New leads"
              value={nf(data.summary.leads.value)}
              sub={<Delta value={data.summary.leads.value} prev={data.summary.leads.prev} days={days} />}
              href="/leads"
            />
            <Stat
              label="Books given"
              value={nf(data.summary.books.value)}
              sub={<Delta value={data.summary.books.value} prev={data.summary.books.prev} days={days} />}
            />
            <Stat
              label="Open follow-ups"
              value={nf(data.summary.pending_followups)}
              sub={
                data.summary.overdue_followups
                  ? <span className="text-bad font-medium">{nf(data.summary.overdue_followups)} overdue</span>
                  : 'None overdue'
              }
              href="/follow-ups"
            />
            <Stat
              label="Districts reached"
              value={nf(data.summary.districts_covered)}
              sub={`of ${ALL_DISTRICTS.length} in Bihar & Jharkhand`}
            />
          </StatStrip>

          <div className="grid gap-4 md:gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
            <NeedsAttention data={data} />
            <Panel>
              <PanelHeader
                title="Challans by district"
                meta={data.districts.length > 12 ? `Top 12 of ${data.districts.length}` : undefined}
                actions={district ? <Button size="sm" variant="ghost" onClick={() => setDistrict('')}>All districts</Button> : undefined}
              />
              <div className="px-2 py-3">
                {data.districts.some(d => d.challans > 0) ? (
                  <DistrictChart data={data.districts} onSelect={district ? undefined : setDistrict} />
                ) : (
                  <EmptyState title="No challans in this period" description="Try a longer date range." />
                )}
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 md:gap-5 lg:grid-cols-2">
            <RepsTable reps={data.reps} />
            <BooksTable books={data.books} />
          </div>

          <div className="grid gap-4 md:gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <LeadStatusBar rows={data.lead_status} />
            <MostVisited institutions={data.top_institutions} teachers={data.top_teachers} />
          </div>

          <DashboardAiSummary query={query} />
        </div>
      )}
    </Page>
  );
}

// ---------------------------------------------------------------------------

function NeedsAttention({ data }: { data: Analytics }) {
  const { overdue, due_today, counts } = data.queue;
  const items: QueueItem[] = [...overdue, ...due_today].slice(0, 8);
  const total = counts.overdue + counts.due_today;

  return (
    <Panel className="flex flex-col">
      <PanelHeader
        title="Needs a call"
        meta={
          total
            ? `${counts.overdue ? `${nf(counts.overdue)} overdue · ` : ''}${nf(counts.due_today)} due today`
            : undefined
        }
        actions={<Link href="/follow-ups" className="text-[12.5px] font-medium text-accent hover:underline underline-offset-2">Open queue</Link>}
      />
      {items.length === 0 ? (
        <EmptyState
          title="Nothing overdue or due today"
          description={counts.upcoming ? `${nf(counts.upcoming)} follow-up${counts.upcoming === 1 ? '' : 's'} coming up this week.` : 'The follow-up queue is clear.'}
          className="flex-1"
        />
      ) : (
        <ul className="divide-y divide-line">
          {items.map(item => {
            const late = item.followup_date < todayIST();
            return (
              <li key={item.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-sunken/50">
                <Link href={`/leads/${item.lead_id}`} className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-ink truncate">{item.contact_person || 'Unnamed contact'}</div>
                  <div className="text-[12px] text-ink-3 truncate">
                    {[item.institute_name, item.district].filter(Boolean).join(' · ') || '—'}
                  </div>
                </Link>
                <span className={cn('text-[12px] whitespace-nowrap', late ? 'text-bad font-medium' : 'text-warn font-medium')}>
                  {relativeDay(item.followup_date)}
                </span>
                {item.mobile_no && (
                  <a
                    href={`tel:${item.mobile_no}`}
                    className="inline-flex items-center justify-center size-8 rounded-md text-ink-2 hover:bg-sunken hover:text-ink"
                    aria-label={`Call ${item.contact_person || ''} ${item.mobile_no}`}
                    title={item.mobile_no}
                  >
                    <Phone className="size-4" />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {total > items.length && (
        <Link href="/follow-ups" className="mt-auto block border-t border-line px-4 py-2.5 text-[12.5px] text-ink-2 hover:text-ink">
          {nf(total - items.length)} more in the queue
        </Link>
      )}
    </Panel>
  );
}

type RepKey = 'name' | 'challans' | 'leads' | 'interested' | 'followups_done';

function RepsTable({ reps }: { reps: Analytics['reps'] }) {
  const [sort, setSort] = useState<{ key: RepKey; dir: 1 | -1 }>({ key: 'challans', dir: -1 });
  const sorted = useMemo(() => {
    const out = [...reps];
    out.sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      const c = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return c * sort.dir;
    });
    return out;
  }, [reps, sort]);

  const th = (k: RepKey, children: React.ReactNode, num?: boolean) => {
    const active = sort.key === k;
    return (
      <th key={k} className={num ? 'text-right' : undefined} aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
        <button
          onClick={() => setSort(s => ({ key: k, dir: s.key === k ? (s.dir === 1 ? -1 : 1) : k === 'name' ? 1 : -1 }))}
          className={cn('inline-flex items-center gap-1 hover:text-ink', active && 'text-ink', num && 'flex-row-reverse')}
        >
          {children}
          {active ? (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : <ArrowUpDown className="size-3 opacity-40" />}
        </button>
      </th>
    );
  };

  return (
    <Panel className="overflow-hidden">
      <PanelHeader title="Representatives" meta="Counts for the selected period" />
      {reps.length === 0 ? (
        <EmptyState title="No rep activity in this period" />
      ) : (
        <div className="overflow-x-auto max-h-[420px]">
          <table className="data-table">
            <thead>
              <tr>
                {th('name', 'Rep')}
                {th('challans', 'Challans', true)}
                {th('leads', 'Leads', true)}
                {th('interested', 'Interested', true)}
                {th('followups_done', 'Follow-ups done', true)}
              </tr>
            </thead>
            <tbody>
              {sorted.map(r => (
                <tr key={r.name}>
                  <td className="font-medium text-ink whitespace-nowrap">{r.name}</td>
                  <td className="num">{nf(r.challans)}</td>
                  <td className="num">{nf(r.leads)}</td>
                  <td className="num">
                    {nf(r.interested)}
                    {r.leads > 0 && <span className="ml-1.5 text-ink-3">{Math.round((r.interested / r.leads) * 100)}%</span>}
                  </td>
                  <td className="num">{nf(r.followups_done)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function BooksTable({ books }: { books: Analytics['books'] }) {
  const max = Math.max(1, ...books.map(b => b.copies));
  return (
    <Panel className="overflow-hidden">
      <PanelHeader title="Books given" meta={books.length ? `${books.length} title${books.length === 1 ? '' : 's'}` : undefined} />
      {books.length === 0 ? (
        <EmptyState title="No specimens given in this period" />
      ) : (
        <div className="overflow-x-auto max-h-[420px]">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th className="text-right">Copies</th>
                <th className="text-right" title="Different leads who received this title">Leads</th>
                <th className="text-right" title="Copies beyond one per lead">Repeat</th>
              </tr>
            </thead>
            <tbody>
              {books.map(b => (
                <tr key={b.title}>
                  <td className="max-w-[260px]">
                    <div className="truncate text-ink" title={b.title}>{b.title}</div>
                    <div className="mt-1 h-1 rounded-full bg-sunken overflow-hidden" aria-hidden>
                      <div className="h-full rounded-full bg-chart-1" style={{ width: `${(b.copies / max) * 100}%` }} />
                    </div>
                  </td>
                  <td className="num">{nf(b.copies)}</td>
                  <td className="num">{nf(b.unique_leads)}</td>
                  <td className="num text-ink-3">{b.repeat ? nf(b.repeat) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

const TONE_BG: Record<Tone, string> = {
  info: 'bg-info',
  neutral: 'bg-ink-3',
  ok: 'bg-ok',
  warn: 'bg-warn',
  bad: 'bg-bad',
  accent: 'bg-accent',
};

// Closed shares the neutral tone with Contacted, so give it a lighter fill.
const statusBg = (status: string, tone: Tone) => (status === 'closed' ? 'bg-line-strong' : TONE_BG[tone]);

// One stacked bar instead of a donut: proportions read left to right.
function LeadStatusBar({ rows }: { rows: Analytics['lead_status'] }) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  return (
    <Panel>
      <PanelHeader title="Lead status" meta={total ? `${nf(total)} leads added in this period` : undefined} />
      <div className="px-4 py-4">
        {total === 0 ? (
          <p className="text-[13px] text-ink-3">No leads added in this period.</p>
        ) : (
          <>
            <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-sm" role="img" aria-label="Lead status distribution">
              {rows.map(r => {
                const m = leadStatusMeta(r.status);
                return (
                  <div
                    key={r.status}
                    className={cn(statusBg(r.status, m.tone), 'h-full first:rounded-l-sm last:rounded-r-sm')}
                    style={{ width: `${(r.count / total) * 100}%`, minWidth: 3 }}
                    title={`${m.label}: ${nf(r.count)} (${Math.round((r.count / total) * 100)}%)`}
                  />
                );
              })}
            </div>
            <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
              {rows.map(r => {
                const m = leadStatusMeta(r.status);
                return (
                  <li key={r.status} className="flex items-baseline gap-2 min-w-0">
                    <span className={cn('size-2 rounded-[2px] shrink-0 translate-y-[-1px]', statusBg(r.status, m.tone))} aria-hidden />
                    <span className="text-[12.5px] text-ink-2 truncate">{m.label}</span>
                    <span className="ml-auto font-mono text-[12.5px] text-ink">{nf(r.count)}</span>
                    <span className="font-mono text-[11.5px] text-ink-3 w-9 text-right">{Math.round((r.count / total) * 100)}%</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </Panel>
  );
}

function MostVisited({ institutions, teachers }: { institutions: Analytics['top_institutions']; teachers: Analytics['top_teachers'] }) {
  const [tab, setTab] = useState<'inst' | 'teach'>('inst');
  const list = tab === 'inst' ? institutions : teachers;
  return (
    <Panel>
      <PanelHeader
        title="Most visited"
        actions={
          <div role="tablist" className="inline-flex gap-0.5">
            {([['inst', 'Institutions'], ['teach', 'Teachers']] as const).map(([k, label]) => (
              <button
                key={k}
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={cn('h-7 px-2 rounded-md text-[12.5px] font-medium', tab === k ? 'bg-sunken text-ink' : 'text-ink-3 hover:text-ink')}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />
      {list.length === 0 ? (
        <p className="px-4 py-4 text-[13px] text-ink-3">No visits in this period.</p>
      ) : (
        <ol className="divide-y divide-line">
          {list.map((x, i) => (
            <li key={`${x.name}-${x.district}`} className="flex items-center gap-3 px-4 py-2">
              <span className="w-4 font-mono text-[12px] text-ink-3 text-right">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] text-ink truncate">{x.name}</div>
                <div className="text-[12px] text-ink-3 truncate">{x.district} · last {formatDate(x.last_visit)}</div>
              </div>
              <span className="font-mono text-[12.5px] text-ink whitespace-nowrap">
                {x.visits} <span className="text-ink-3">{x.visits === 1 ? 'visit' : 'visits'}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading overview">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-line border border-line rounded-lg overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-surface px-4 py-3.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-16 mt-2.5" />
            <Skeleton className="h-3 w-28 mt-2.5" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_1.25fr]">
        <Panel className="p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </Panel>
        <Panel className="p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-4" />)}
        </Panel>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel className="h-64">{null}</Panel>
        <Panel className="h-64">{null}</Panel>
      </div>
    </div>
  );
}
