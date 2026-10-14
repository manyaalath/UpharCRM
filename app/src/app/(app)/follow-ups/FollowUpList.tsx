'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CalendarClock, Check, PhoneCall, Search } from 'lucide-react';
import {
  Button, Dialog, Drawer, EmptyState, Input, Panel, Select, Skeleton, cn,
} from '@/components/ui';
import { addDaysIST, formatDate, formatDateTime, relativeDay, todayIST } from '@/lib/date';
import {
  CallForm, LeadContextPanel, OutcomeBadge, SaveCallButton, emptyCallForm, formatPhone, notifyRefresh,
  submitCall, type CallFormState, type FollowUpRow, type QueueCounts,
} from './shared';

type Tab = 'open' | 'completed';
type Group = 'overdue' | 'today' | 'upcoming';

const PAGE_SIZE = 100;

const GROUPS: { id: Group; label: string; countKey: keyof QueueCounts }[] = [
  { id: 'overdue', label: 'Overdue', countKey: 'overdue' },
  { id: 'today', label: 'Due today', countKey: 'due_today' },
  { id: 'upcoming', label: 'Upcoming', countKey: 'upcoming' },
];

function groupOf(row: FollowUpRow, today: string): Group {
  if (row.followup_date < today) return 'overdue';
  if (row.followup_date === today) return 'today';
  return 'upcoming';
}

export default function FollowUpList({ tab, counts, onChanged }: { tab: Tab; counts: QueueCounts | null; onChanged: () => void }) {
  const router = useRouter();
  const [rows, setRows] = useState<FollowUpRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('');
  const [rep, setRep] = useState('');

  const [callTarget, setCallTarget] = useState<FollowUpRow | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<FollowUpRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const queue = tab === 'completed' ? 'completed' : 'open';

  const fetchPage = useCallback(async (p: number) => {
    const res = await fetch(`/api/follow-ups?queue=${queue}&page=${p}&limit=${PAGE_SIZE}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load follow-ups');
    return json as { data: FollowUpRow[]; pagination: { total: number } };
  }, [queue]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const json = await fetchPage(1);
      setRows(json.data || []);
      setTotal(json.pagination?.total || 0);
      setPage(1);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => { load(); }, [load]);

  // Refresh when another tab logs a call or saves a challan.
  useEffect(() => {
    try {
      const bc = new BroadcastChannel('dashboard-refresh');
      bc.onmessage = () => load();
      return () => bc.close();
    } catch { /* unsupported */ }
  }, [load]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const json = await fetchPage(page + 1);
      setRows(prev => [...prev, ...(json.data || [])]);
      setPage(p => p + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  };

  const districts = useMemo(() => [...new Set(rows.map(r => r.district).filter(Boolean) as string[])].sort(), [rows]);
  const reps = useMemo(() => [...new Set(rows.map(r => r.rep_name).filter(Boolean) as string[])].sort(), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    return rows.filter(r => {
      if (district && r.district !== district) return false;
      if (rep && r.rep_name !== rep) return false;
      if (!q) return true;
      return (
        (r.contact_name || '').toLowerCase().includes(q) ||
        (r.institute_name || '').toLowerCase().includes(q) ||
        (r.lead_seq_id || '').toLowerCase().includes(q) ||
        (qDigits.length >= 3 && (r.mobile_no || '').includes(qDigits))
      );
    });
  }, [rows, search, district, rep]);

  const today = todayIST();
  const grouped = useMemo(() => {
    const g: Record<Group, FollowUpRow[]> = { overdue: [], today: [], upcoming: [] };
    for (const r of filtered) g[groupOf(r, today)].push(r);
    return g;
  }, [filtered, today]);

  const filtersActive = !!(search || district || rep);

  const markDone = async (row: FollowUpRow) => {
    setBusyId(row.id);
    try {
      const res = await fetch('/api/follow-ups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, lead_id: row.lead_id, status: 'completed' }),
      });
      if (!res.ok) throw new Error();
      setRows(prev => prev.filter(r => r.id !== row.id));
      setTotal(t => Math.max(0, t - 1));
      toast.success(`Marked done: ${row.contact_name || 'follow-up'}`);
      notifyRefresh();
      onChanged();
    } catch {
      toast.error('Could not update the follow-up');
    } finally {
      setBusyId(null);
    }
  };

  const reschedule = async (row: FollowUpRow, date: string, remarks: string) => {
    setBusyId(row.id);
    try {
      const res = await fetch('/api/follow-ups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, lead_id: row.lead_id, status: 'rescheduled', followup_date: date, remarks: remarks || row.remarks }),
      });
      if (!res.ok) throw new Error();
      setRows(prev =>
        prev
          .map(r => (r.id === row.id ? { ...r, followup_date: date, status: 'pending', remarks: remarks || r.remarks } : r))
          .sort((a, b) => a.followup_date.localeCompare(b.followup_date))
      );
      toast.success(`Moved to ${formatDate(date)}`);
      setRescheduleTarget(null);
      notifyRefresh();
      onChanged();
    } catch {
      toast.error('Could not reschedule');
    } finally {
      setBusyId(null);
    }
  };

  const onCallLogged = () => {
    if (callTarget) {
      setRows(prev => prev.filter(r => r.id !== callTarget.id));
      setTotal(t => Math.max(0, t - 1));
    }
    setCallTarget(null);
    onChanged();
    // Pick up the newly scheduled follow-up.
    load();
  };

  // ── Filters bar ──
  const filterBar = (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-center px-3 py-2.5 border-b border-line">
      <div className="sm:w-72">
        <Input leading={<Search />} placeholder="Search name, institute, phone, lead ID" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search follow-ups" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Select value={district} onChange={e => setDistrict(e.target.value)} aria-label="District" className="sm:w-44">
          <option value="">All districts</option>
          {districts.map(d => <option key={d} value={d}>{d}</option>)}
        </Select>
        <Select value={rep} onChange={e => setRep(e.target.value)} aria-label="Representative" className="sm:w-44">
          <option value="">All reps</option>
          {reps.map(r => <option key={r} value={r}>{r}</option>)}
        </Select>
      </div>
      <div className="flex items-center gap-2 sm:ml-auto text-[12px] text-ink-3">
        {filtersActive && (
          <Button size="sm" variant="ghost" onClick={() => { setSearch(''); setDistrict(''); setRep(''); }}>Clear filters</Button>
        )}
        <span className="font-mono">{filtered.length}</span> of <span className="font-mono">{total}</span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Panel>
        {filterBar}
        <div className="p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
        </div>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel>
        <EmptyState title="Couldn't load follow-ups" description={error} action={<Button onClick={load}>Try again</Button>} />
      </Panel>
    );
  }

  const rowActions = (r: FollowUpRow) => (
    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
      <Button size="sm" variant="secondary" onClick={() => setCallTarget(r)} icon={<PhoneCall className="size-3.5" />}>Log call</Button>
      <Button size="sm" variant="ghost" onClick={() => setRescheduleTarget(r)} aria-label="Reschedule" title="Reschedule"><CalendarClock className="size-3.5" /></Button>
      <Button size="sm" variant="ghost" onClick={() => markDone(r)} loading={busyId === r.id} aria-label="Mark done" title="Mark done"><Check className="size-3.5" /></Button>
    </div>
  );

  return (
    <>
      <Panel className="overflow-hidden">
        {filterBar}

        {filtered.length === 0 ? (
          <EmptyState
            title={filtersActive ? 'No follow-ups match these filters' : tab === 'completed' ? 'No completed follow-ups yet' : 'Nothing scheduled'}
            description={filtersActive ? undefined : tab === 'completed' ? 'Logged calls and completed follow-ups show up here.' : 'New challans schedule follow-ups automatically.'}
            action={filtersActive ? <Button onClick={() => { setSearch(''); setDistrict(''); setRep(''); }}>Clear filters</Button> : undefined}
          />
        ) : tab === 'completed' ? (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Contact</th><th>District</th><th>Rep</th><th>Was due</th><th>Completed</th><th>Outcome / note</th><th className="text-right">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} className="is-clickable" onClick={() => router.push(`/leads/${r.lead_id}`)}>
                      <td><ContactCell row={r} /></td>
                      <td className="text-ink-2">{r.district || '—'}</td>
                      <td className="text-ink-2">{r.rep_name || '—'}</td>
                      <td className="font-mono text-[12.5px] text-ink-2">{formatDate(r.followup_date)}</td>
                      <td className="text-[12.5px] text-ink-2">{formatDateTime(r.updated_at)}</td>
                      <td className="max-w-[280px]">
                        <div className="flex flex-col gap-1">
                          {r.last_outcome && <OutcomeBadge value={r.last_outcome} />}
                          {r.remarks && <span className="text-[12.5px] text-ink-2 truncate">{r.remarks}</span>}
                        </div>
                      </td>
                      <td className="num"><PhoneLink phone={r.mobile_no} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile */}
            <ul className="md:hidden divide-y divide-line">
              {filtered.map(r => (
                <li key={r.id} className="px-4 py-3" onClick={() => router.push(`/leads/${r.lead_id}`)}>
                  <div className="flex items-start justify-between gap-3">
                    <ContactCell row={r} />
                    {r.last_outcome && <OutcomeBadge value={r.last_outcome} />}
                  </div>
                  <p className="mt-1 text-[12px] text-ink-3">Done {formatDateTime(r.updated_at)}{r.district ? ` · ${r.district}` : ''}</p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            {/* Desktop: one table, grouped */}
            <div className="hidden md:block overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Contact</th><th>District</th><th>Rep</th><th>Due</th><th>Last outcome</th><th className="text-right">Phone</th><th className="text-right w-[1%]"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {GROUPS.map(g => grouped[g.id].length === 0 ? null : (
                    <Fragment key={g.id}>
                      <tr>
                        <td colSpan={7} className="!py-2 !bg-paper">
                          <span className={cn('text-[12px] font-semibold', g.id === 'overdue' ? 'text-bad' : g.id === 'today' ? 'text-warn' : 'text-ink-2')}>{g.label}</span>
                          <span className="ml-2 font-mono text-[12px] text-ink-3">
                            {grouped[g.id].length}
                            {!filtersActive && counts && counts[g.countKey] > grouped[g.id].length ? ` of ${counts[g.countKey]}` : ''}
                          </span>
                        </td>
                      </tr>
                      {grouped[g.id].map(r => (
                        <tr key={r.id} className="is-clickable" onClick={() => router.push(`/leads/${r.lead_id}`)}>
                          <td><ContactCell row={r} /></td>
                          <td className="text-ink-2">{r.district || '—'}</td>
                          <td className="text-ink-2">{r.rep_name || '—'}</td>
                          <td>
                            <span className={cn('text-[12.5px]', g.id === 'overdue' ? 'text-bad font-medium' : g.id === 'today' ? 'text-warn font-medium' : 'text-ink-2')} title={formatDate(r.followup_date)}>
                              {relativeDay(r.followup_date)}
                            </span>
                          </td>
                          <td><OutcomeBadge value={r.last_outcome} /></td>
                          <td className="num"><PhoneLink phone={r.mobile_no} /></td>
                          <td>{rowActions(r)}</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: grouped cards */}
            <div className="md:hidden">
              {GROUPS.map(g => grouped[g.id].length === 0 ? null : (
                <section key={g.id}>
                  <h3 className={cn('px-4 py-2 bg-paper border-b border-line text-[12px] font-semibold', g.id === 'overdue' ? 'text-bad' : g.id === 'today' ? 'text-warn' : 'text-ink-2')}>
                    {g.label} <span className="font-mono font-normal text-ink-3">{grouped[g.id].length}</span>
                  </h3>
                  <ul className="divide-y divide-line">
                    {grouped[g.id].map(r => (
                      <li key={r.id} className="px-4 py-3" onClick={() => router.push(`/leads/${r.lead_id}`)}>
                        <div className="flex items-start justify-between gap-3">
                          <ContactCell row={r} />
                          <span className={cn('shrink-0 text-[12px]', g.id === 'overdue' ? 'text-bad font-medium' : 'text-ink-2')}>{relativeDay(r.followup_date)}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <PhoneLink phone={r.mobile_no} />
                          <Button size="sm" variant="secondary" className="ml-auto min-h-9" onClick={() => setCallTarget(r)} icon={<PhoneCall className="size-3.5" />}>Log call</Button>
                          <Button size="sm" variant="ghost" className="min-h-9" onClick={() => setRescheduleTarget(r)} aria-label="Reschedule"><CalendarClock className="size-4" /></Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}

        {rows.length < total && (
          <div className="flex justify-center px-4 py-3 border-t border-line">
            <Button onClick={loadMore} loading={loadingMore}>Load {Math.min(PAGE_SIZE, total - rows.length)} more</Button>
          </div>
        )}
      </Panel>

      <LogCallDrawer row={callTarget} onClose={() => setCallTarget(null)} onLogged={onCallLogged} />
      <RescheduleDialog
        row={rescheduleTarget}
        loading={!!rescheduleTarget && busyId === rescheduleTarget.id}
        onClose={() => setRescheduleTarget(null)}
        onSave={(date, remarks) => rescheduleTarget && reschedule(rescheduleTarget, date, remarks)}
      />
    </>
  );
}

function ContactCell({ row }: { row: FollowUpRow }) {
  return (
    <div className="min-w-0">
      <div className="font-medium text-ink truncate">{row.contact_name || 'Unnamed contact'}</div>
      <div className="text-[12px] text-ink-2 truncate">{row.institute_name || '—'}</div>
    </div>
  );
}

function PhoneLink({ phone }: { phone?: string | null }) {
  if (!phone) return <span className="text-ink-3">—</span>;
  return (
    <a href={`tel:${phone}`} onClick={e => e.stopPropagation()} className="font-mono text-[12.5px] text-ink hover:text-accent underline-offset-2 hover:underline">
      {formatPhone(phone)}
    </a>
  );
}

function LogCallDrawer({ row, onClose, onLogged }: { row: FollowUpRow | null; onClose: () => void; onLogged: () => void }) {
  const [form, setForm] = useState<CallFormState>(emptyCallForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(emptyCallForm()); }, [row?.id]);

  const save = async () => {
    if (!row) return;
    setSaving(true);
    const result = await submitCall(row, form);
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Call logged for ${row.contact_name || 'lead'}`, {
      description: form.nextDate ? `Next call ${formatDate(form.nextDate)}` : 'No further follow-up',
    });
    onLogged();
  };

  return (
    <Drawer
      open={!!row}
      onClose={onClose}
      title={row?.contact_name || 'Log call'}
      subtitle={row ? [row.institute_name, row.district].filter(Boolean).join(' · ') : undefined}
    >
      {row && (
        <div className="flex flex-col">
          <div className="px-5 py-4 border-b border-line flex items-center gap-2">
            {row.mobile_no && (
              <a href={`tel:${row.mobile_no}`} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-accent text-white text-[13px] font-medium hover:bg-accent-hover">
                <PhoneCall className="size-3.5" /> <span className="font-mono">{formatPhone(row.mobile_no)}</span>
              </a>
            )}
            <span className="text-[12.5px] text-ink-3">Due {relativeDay(row.followup_date).toLowerCase()}</span>
          </div>
          <div className="px-5 py-5 border-b border-line">
            <CallForm value={form} onChange={setForm} />
            <SaveCallButton className="mt-4 w-full" disabled={!form.outcome} loading={saving} onClick={save} />
          </div>
          <div className="px-5 py-5">
            <LeadContextPanel leadId={row.lead_id} remarks={row.remarks} />
          </div>
        </div>
      )}
    </Drawer>
  );
}

function RescheduleDialog({
  row, loading, onClose, onSave,
}: {
  row: FollowUpRow | null; loading: boolean; onClose: () => void; onSave: (date: string, remarks: string) => void;
}) {
  const [date, setDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const today = todayIST();

  useEffect(() => {
    setDate(row ? addDaysIST(2) : '');
    setRemarks('');
  }, [row?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog
      open={!!row}
      onClose={onClose}
      title="Reschedule follow-up"
      description={row ? `${row.contact_name || 'Lead'} · currently ${formatDate(row.followup_date)}` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!date || date < today} loading={loading} onClick={() => onSave(date, remarks)}>Reschedule</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {[['Tomorrow', 1], ['+2 days', 2], ['+1 week', 7], ['+2 weeks', 14]].map(([label, days]) => {
            const d = addDaysIST(days as number, today);
            return (
              <button
                key={label}
                type="button"
                onClick={() => setDate(d)}
                className={cn('h-8 px-3 rounded-md border text-[12.5px]', date === d ? 'border-ink bg-ink text-white' : 'border-line-strong text-ink-2 hover:bg-sunken')}
              >
                {label}
              </button>
            );
          })}
        </div>
        <Input type="date" min={today} value={date} onChange={e => setDate(e.target.value)} aria-label="New date" className="font-mono" />
        <Input placeholder="Reason (optional)" value={remarks} onChange={e => setRemarks(e.target.value)} aria-label="Reason" />
      </div>
    </Dialog>
  );
}
