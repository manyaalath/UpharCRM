'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Download, Search, Upload, X } from 'lucide-react';
import {
  Button, EmptyState, Input, LeadStatusBadge, LinkButton, Page, PageHeader, Panel, Select, Skeleton, cn,
} from '@/components/ui';
import { LEAD_STATUS_OPTIONS } from '@/lib/types';
import { ALL_DISTRICTS } from '@/lib/constants';
import { formatDate, relativeDay } from '@/lib/date';
import { downloadFromApi } from '@/lib/download';
import LeadDrawer from './LeadDrawer';
import { formatMobile, leadView, type LeadRow } from './_components/leadFields';

const PAGE_SIZE = 25;

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'last_contact', label: 'Recently contacted' },
  { value: 'stale', label: 'Longest without contact' },
];

// Filters that live in the URL. `q` is the search box.
const FILTER_KEYS = ['q', 'status', 'district', 'rep', 'from', 'to'] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

export default function LeadsClient({ agents }: { agents: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const filters = useMemo(() => {
    const f = {} as Record<FilterKey, string>;
    FILTER_KEYS.forEach(k => { f[k] = params.get(k) || ''; });
    return f;
  }, [params]);
  const sort = params.get('sort') || 'newest';
  const page = Math.max(1, parseInt(params.get('page') || '1') || 1);

  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LeadRow | null>(null);
  const [searchText, setSearchText] = useState(filters.q);
  const [reloadKey, setReloadKey] = useState(0);

  // Write params to the URL (replace — filter tweaks shouldn't flood history).
  const setParams = useCallback((patch: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (resetPage) next.delete('page');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  // Debounce the search box into the URL.
  useEffect(() => {
    if (searchText.trim() === filters.q) return;
    const t = setTimeout(() => setParams({ q: searchText.trim() || null }), 300);
    return () => clearTimeout(t);
  }, [searchText, filters.q, setParams]);

  // Keep the box in sync when the URL changes from elsewhere (back button, chips).
  const lastQ = useRef(filters.q);
  useEffect(() => {
    if (filters.q !== lastQ.current) {
      lastQ.current = filters.q;
      setSearchText(t => (t.trim() === filters.q ? t : filters.q));
    }
  }, [filters.q]);

  const apiQuery = useMemo(() => {
    const q = new URLSearchParams();
    if (filters.q) q.set('search', filters.q);
    if (filters.status) q.set('status', filters.status);
    if (filters.district) q.set('district', filters.district);
    if (filters.rep) q.set('agent_name', filters.rep);
    if (filters.from) q.set('date_start', filters.from);
    if (filters.to) q.set('date_end', filters.to);
    return q;
  }, [filters]);

  // Fetch; abort the previous request so a slow old response can't overwrite a newer one.
  useEffect(() => {
    const ac = new AbortController();
    const q = new URLSearchParams(apiQuery);
    q.set('page', String(page));
    q.set('limit', String(PAGE_SIZE));
    q.set('sort', sort);
    setLoading(true);
    fetch(`/api/leads?${q}`, { signal: ac.signal })
      .then(async res => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Could not load leads');
        setLeads(json.data || []);
        setTotal(json.pagination?.total || 0);
        setError(null);
        setLoading(false);
      })
      .catch(e => {
        if (e.name === 'AbortError') return;
        setError(e.message || 'Could not load leads');
        setLoading(false);
      });
    return () => ac.abort();
  }, [apiQuery, page, sort, reloadKey]);

  const exportLeads = () => {
    const q = new URLSearchParams({ type: 'leads' });
    if (filters.district) q.set('district', filters.district);
    if (filters.rep) q.set('agent_name', filters.rep);
    if (filters.from) q.set('date_start', filters.from);
    if (filters.to) q.set('date_end', filters.to);
    downloadFromApi(`/api/export?${q}`, 'uphar_leads.xlsx');
  };

  const chips: { key: FilterKey | 'range'; label: string; clear: Record<string, null> }[] = [];
  if (filters.q) chips.push({ key: 'q', label: `“${filters.q}”`, clear: { q: null } });
  if (filters.status) chips.push({ key: 'status', label: LEAD_STATUS_OPTIONS.find(o => o.value === filters.status)?.label || filters.status, clear: { status: null } });
  if (filters.district) chips.push({ key: 'district', label: filters.district, clear: { district: null } });
  if (filters.rep) chips.push({ key: 'rep', label: `Rep: ${filters.rep}`, clear: { rep: null } });
  if (filters.from || filters.to) {
    chips.push({
      key: 'range',
      label: `Added ${filters.from ? formatDate(filters.from) : '…'} – ${filters.to ? formatDate(filters.to) : 'today'}`,
      clear: { from: null, to: null },
    });
  }
  const clearAll = () => {
    setSearchText('');
    setParams(Object.fromEntries(FILTER_KEYS.map(k => [k, null])));
  };

  const from = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, total);
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const updateRow = useCallback((patch: Partial<LeadRow> & { id: string }) => {
    setLeads(rows => rows.map(r => (r.id === patch.id ? { ...r, ...patch } : r)));
  }, []);
  const closeDrawer = useCallback(() => setSelected(null), []);

  return (
    <Page wide>
      <PageHeader
        title="Leads"
        description={loading && !leads.length ? 'Loading…' : `${total.toLocaleString('en-IN')} ${chips.length ? 'matching' : 'in total'}`}
        actions={
          <Button icon={<Download className="size-3.5" />} onClick={exportLeads}>Export</Button>
        }
      />

      {/* Filter bar */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center mb-3">
        <div className="lg:w-[320px] lg:shrink-0">
          <Input
            leading={<Search />}
            type="search"
            placeholder="Name, phone, institute or lead ID"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            aria-label="Search leads"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-1 lg:[&>*]:w-auto lg:[&>*]:min-w-[140px]">
          <Select value={filters.status} onChange={e => setParams({ status: e.target.value || null })} aria-label="Status">
            <option value="">All statuses</option>
            {LEAD_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <Select value={filters.district} onChange={e => setParams({ district: e.target.value || null })} aria-label="District">
            <option value="">All districts</option>
            {ALL_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </Select>
          <Select value={filters.rep} onChange={e => setParams({ rep: e.target.value || null })} aria-label="Representative">
            <option value="">All reps</option>
            {agents.map(a => <option key={a} value={a}>{a}</option>)}
          </Select>
          <div className="col-span-2 sm:col-span-2 flex items-center gap-1.5 lg:min-w-[280px]">
            <Input type="date" value={filters.from} max={filters.to || undefined} onChange={e => setParams({ from: e.target.value || null })} aria-label="Added from" className="text-[12.5px]" />
            <span className="text-ink-3 text-[12px]">to</span>
            <Input type="date" value={filters.to} min={filters.from || undefined} onChange={e => setParams({ to: e.target.value || null })} aria-label="Added to" className="text-[12.5px]" />
          </div>
          <Select value={sort} onChange={e => setParams({ sort: e.target.value === 'newest' ? null : e.target.value })} aria-label="Sort" className="lg:ml-auto">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {chips.map(c => (
            <button
              key={c.key}
              type="button"
              onClick={() => { if (c.key === 'q') setSearchText(''); setParams(c.clear); }}
              className="inline-flex items-center gap-1 h-6.5 pl-2.5 pr-1.5 rounded-md bg-surface border border-line-strong text-[12.5px] text-ink hover:bg-sunken"
            >
              {c.label}
              <X className="size-3 text-ink-3" aria-label="Remove filter" />
            </button>
          ))}
          <button type="button" onClick={clearAll} className="ml-1 text-[12.5px] font-medium text-accent hover:underline underline-offset-2">
            Clear all
          </button>
        </div>
      )}

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100dvh-260px)] min-h-[240px]">
          <table className="data-table">
            <thead>
              <tr>
                <th>Contact</th>
                <th>Institute</th>
                <th className="hidden md:table-cell">Rep</th>
                <th>Status</th>
                <th className="hidden lg:table-cell text-right">Visits</th>
                <th className="hidden md:table-cell">Last contact</th>
                <th className="hidden xl:table-cell">Added</th>
              </tr>
            </thead>
            <tbody className={cn(loading && leads.length > 0 && 'opacity-60 transition-opacity')}>
              {loading && !leads.length && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td><Skeleton className="h-3.5 w-32 mb-1.5" /><Skeleton className="h-3 w-24" /></td>
                  <td><Skeleton className="h-3.5 w-44 mb-1.5" /><Skeleton className="h-3 w-20" /></td>
                  <td className="hidden md:table-cell"><Skeleton className="h-3.5 w-20" /></td>
                  <td><Skeleton className="h-5 w-20" /></td>
                  <td className="hidden lg:table-cell"><Skeleton className="h-3.5 w-6 ml-auto" /></td>
                  <td className="hidden md:table-cell"><Skeleton className="h-3.5 w-16" /></td>
                  <td className="hidden xl:table-cell"><Skeleton className="h-3.5 w-20" /></td>
                </tr>
              ))}

              {leads.map(row => {
                const v = leadView(row);
                return (
                  <tr
                    key={row.id}
                    className={cn('is-clickable', selected?.id === row.id && '[&>td]:bg-sunken')}
                    onClick={() => setSelected(row)}
                    onKeyDown={e => { if (e.key === 'Enter') setSelected(row); }}
                    tabIndex={0}
                  >
                    <td>
                      <div className="font-medium text-ink">{v.contact}</div>
                      <div className="font-mono text-[12px] text-ink-3">{v.mobile ? formatMobile(v.mobile) : '—'}</div>
                    </td>
                    <td className="max-w-[280px]">
                      <div className="text-ink truncate">{v.institute}</div>
                      <div className="text-[12px] text-ink-3 truncate">{[v.town, v.district].filter(Boolean).join(', ')}</div>
                    </td>
                    <td className="hidden md:table-cell text-ink-2">{v.rep || <span className="text-ink-3">Unassigned</span>}</td>
                    <td><LeadStatusBadge status={v.status} /></td>
                    <td className="hidden lg:table-cell num">{v.visits ?? '—'}</td>
                    <td className="hidden md:table-cell text-ink-2 whitespace-nowrap">
                      {v.lastContact ? relativeDay(v.lastContact) : <span className="text-ink-3">Never</span>}
                    </td>
                    <td className="hidden xl:table-cell text-ink-3 whitespace-nowrap">{formatDate(v.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!loading && error && (
            <EmptyState
              title="Leads didn't load"
              description={error}
              action={<Button onClick={() => setReloadKey(k => k + 1)}>Try again</Button>}
            />
          )}

          {!loading && !error && leads.length === 0 && (
            chips.length ? (
              <EmptyState
                title="No leads match these filters"
                description="Try a shorter search or remove a filter."
                action={<Button onClick={clearAll}>Clear filters</Button>}
              />
            ) : (
              <EmptyState
                title="No leads yet"
                description="Leads are created when a challan is entered or imported."
                action={<LinkButton href="/de" variant="primary" icon={<Upload className="size-3.5" />}>Enter or import challans</LinkButton>}
              />
            )
          )}
        </div>

        {total > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 h-11 border-t border-line bg-surface">
            <span className="font-mono text-[12px] text-ink-2">
              {from.toLocaleString('en-IN')}–{to.toLocaleString('en-IN')} of {total.toLocaleString('en-IN')}
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => setParams({ page: page - 1 > 1 ? String(page - 1) : null }, false)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-[12px] text-ink-3 px-1">Page {page} of {lastPage}</span>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Next page"
                disabled={page >= lastPage}
                onClick={() => setParams({ page: String(page + 1) }, false)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Panel>

      <LeadDrawer lead={selected} onClose={closeDrawer} onLeadUpdated={updateRow} />
    </Page>
  );
}
