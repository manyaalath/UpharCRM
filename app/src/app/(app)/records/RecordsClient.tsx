'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Download, FileText, Plus, Search, X } from 'lucide-react';
import {
  Button, EmptyState, Input, LeadStatusBadge, LinkButton, Page, PageHeader, Panel, Select, cn,
} from '@/components/ui';
import { ALL_DISTRICTS } from '@/lib/constants';
import { formatDate } from '@/lib/date';
import { downloadFromApi } from '@/lib/download';

export interface RecordFilters {
  q: string;
  challan: string;
  district: string;
  rep: string;
  book: string;
  from: string;
  to: string;
}

export interface RecordRow {
  id: string;
  challan_no: string;
  challan_date: string;
  lead_id: string;
  lead_seq_id: string | null;
  status: string | null;
  contact: string | null;
  mobile: string | null;
  institute: string | null;
  town: string | null;
  district: string | null;
  rep: string | null;
  books: { title: string; quantity: number }[];
}

interface Props {
  rows: RecordRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: RecordFilters;
  agents: { id: string; name: string }[];
  books: { id: string; title: string }[];
  canCreate: boolean;
  canExport: boolean;
  error: string | null;
}

export default function RecordsClient({ rows, total, page, pageSize, filters, agents, books, canCreate, canExport, error }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(filters.q);

  // Push a new set of filters into the URL; the server re-renders the table.
  const apply = ({ page: p = 1, ...next }: Partial<RecordFilters> & { page?: number }) => {
    const merged: RecordFilters = { ...filters, ...next };
    const params = new URLSearchParams();
    (Object.keys(merged) as (keyof RecordFilters)[]).forEach(k => {
      if (merged[k]) params.set(k, merged[k]);
    });
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  // Debounced challan-number search.
  useEffect(() => {
    if (q === filters.q) return;
    const t = setTimeout(() => apply({ q, challan: '' }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const agentName = agents.find(a => a.id === filters.rep)?.name;
  const bookTitle = books.find(b => b.id === filters.book)?.title;

  const chips: { key: keyof RecordFilters | 'dates'; label: string }[] = [];
  if (filters.challan) chips.push({ key: 'challan', label: `Challan ${filters.challan}` });
  if (filters.district) chips.push({ key: 'district', label: filters.district });
  if (filters.rep) chips.push({ key: 'rep', label: `Rep: ${agentName || 'Unknown'}` });
  if (filters.book) chips.push({ key: 'book', label: `Book: ${bookTitle || 'Unknown'}` });
  if (filters.from || filters.to) {
    chips.push({ key: 'dates', label: `${filters.from ? formatDate(filters.from) : 'Start'} – ${filters.to ? formatDate(filters.to) : 'Today'}` });
  }

  const removeChip = (key: keyof RecordFilters | 'dates') =>
    key === 'dates' ? apply({ from: '', to: '' }) : apply({ [key]: '' } as Partial<RecordFilters>);

  const handleExport = () => {
    const params = new URLSearchParams({ type: 'leads' });
    if (filters.district) params.set('district', filters.district);
    if (filters.rep) { params.set('agent_id', filters.rep); if (agentName) params.set('rep_label', agentName); }
    if (filters.book) { params.set('book', filters.book); if (bookTitle) params.set('book_label', bookTitle); }
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    downloadFromApi(`/api/export?${params}`, 'uphar_challans.xlsx');
  };

  const first = total ? (page - 1) * pageSize + 1 : 0;
  const last = Math.min(page * pageSize, total);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Page wide>
      <PageHeader
        title="Challans"
        description={`${total.toLocaleString('en-IN')} specimen challan${total === 1 ? '' : 's'}${chips.length ? ' match these filters' : ' on record'}`}
        actions={
          <>
            {canExport && (
              <Button onClick={handleExport} icon={<Download className="size-4" />} disabled={!total}>Export</Button>
            )}
            {canCreate && (
              <LinkButton href="/de" variant="primary" icon={<Plus className="size-4" />}>New challan</LinkButton>
            )}
          </>
        }
      />

      {/* Filters — one row on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-[minmax(180px,1.2fr)_repeat(3,minmax(140px,1fr))_auto] gap-2 mb-3">
        <div className="col-span-2 md:col-span-1">
          <Input
            leading={<Search />}
            placeholder="Challan no."
            value={q}
            onChange={e => setQ(e.target.value)}
            aria-label="Search by challan number"
          />
        </div>
        <Select value={filters.district} onChange={e => apply({ district: e.target.value })} aria-label="District">
          <option value="">All districts</option>
          {ALL_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
        </Select>
        <Select value={filters.rep} onChange={e => apply({ rep: e.target.value })} aria-label="Representative">
          <option value="">All reps</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
        <Select value={filters.book} onChange={e => apply({ book: e.target.value })} aria-label="Book" className="col-span-2 md:col-span-1">
          <option value="">All books</option>
          {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
        </Select>
        <div className="col-span-2 md:col-span-1 flex items-center gap-1.5">
          <Input type="date" value={filters.from} max={filters.to || undefined} onChange={e => apply({ from: e.target.value })} aria-label="From date" className="md:w-[140px]" />
          <span className="text-ink-3 text-[12px]">to</span>
          <Input type="date" value={filters.to} min={filters.from || undefined} onChange={e => apply({ to: e.target.value })} aria-label="To date" className="md:w-[140px]" />
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {chips.map(c => (
            <button
              key={c.key}
              onClick={() => removeChip(c.key)}
              className="inline-flex items-center gap-1 h-6 pl-2 pr-1.5 rounded-sm bg-surface border border-line-strong text-[12px] text-ink-2 hover:text-ink hover:border-ink-3"
            >
              {c.label}
              <X className="size-3" aria-label="Remove filter" />
            </button>
          ))}
          <button
            onClick={() => { setQ(''); apply({ q: '', challan: '', district: '', rep: '', book: '', from: '', to: '' }); }}
            className="text-[12px] text-accent hover:underline underline-offset-2 ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      <Panel className={cn('overflow-hidden transition-opacity', pending && 'opacity-60')}>
        {error ? (
          <EmptyState title="Couldn't load challans" description={error} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<FileText />}
            title={chips.length || filters.q ? 'No challans match these filters' : 'No challans yet'}
            description={chips.length || filters.q ? 'Try removing a filter.' : 'Challans keyed in from the entry desk appear here.'}
            action={canCreate && !chips.length ? <LinkButton href="/de" variant="primary">Enter a challan</LinkButton> : undefined}
          />
        ) : (
          <div className="overflow-x-auto max-h-[calc(100dvh-280px)]">
            <table className="data-table min-w-[900px]">
              <thead>
                <tr>
                  <th>Challan</th>
                  <th>Date</th>
                  <th>Contact</th>
                  <th>District</th>
                  <th>Rep</th>
                  <th>Books</th>
                  <th>Lead status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const copies = r.books.reduce((s, b) => s + b.quantity, 0);
                  const highlighted = !!filters.challan && r.challan_no === filters.challan;
                  return (
                    <tr
                      key={r.id}
                      className={cn('is-clickable', highlighted && '[&>td]:bg-accent-soft')}
                      onClick={() => router.push(`/leads/${r.lead_id}`)}
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter') router.push(`/leads/${r.lead_id}`); }}
                    >
                      <td className="font-mono text-[12.5px] text-ink whitespace-nowrap">{r.challan_no}</td>
                      <td className="whitespace-nowrap text-ink-2">{formatDate(r.challan_date)}</td>
                      <td className="max-w-[280px]">
                        <div className="font-medium text-ink truncate">{r.contact || '—'}</div>
                        <div className="text-[12px] text-ink-3 truncate">
                          {[r.institute, r.town].filter(Boolean).join(' · ') || '—'}
                        </div>
                      </td>
                      <td className="whitespace-nowrap">{r.district || '—'}</td>
                      <td className="whitespace-nowrap text-ink-2">{r.rep || '—'}</td>
                      <td className="max-w-[240px]" title={r.books.map(b => `${b.quantity} × ${b.title}`).join('\n')}>
                        {r.books.length ? (
                          <div className="flex items-baseline gap-1.5 min-w-0">
                            <span className="font-mono text-[12px] text-ink-2 shrink-0">{copies}</span>
                            <span className="truncate text-ink">{r.books[0].title}</span>
                            {r.books.length > 1 && <span className="shrink-0 text-[12px] text-ink-3">+{r.books.length - 1}</span>}
                          </div>
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                      </td>
                      <td><LeadStatusBadge status={r.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {total > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 h-11 border-t border-line text-[12.5px] text-ink-2">
            <span className="tabular">
              {first.toLocaleString('en-IN')}–{last.toLocaleString('en-IN')} of {total.toLocaleString('en-IN')}
            </span>
            <div className="flex items-center gap-1">
              <span className="mr-2 text-ink-3 tabular">Page {page} of {pages}</span>
              <Button size="icon" variant="ghost" aria-label="Previous page" disabled={page <= 1 || pending} onClick={() => apply({ page: page - 1 })}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button size="icon" variant="ghost" aria-label="Next page" disabled={page >= pages || pending} onClick={() => apply({ page: page + 1 })}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Panel>
    </Page>
  );
}
