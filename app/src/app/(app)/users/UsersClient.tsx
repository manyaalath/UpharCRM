'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { RefreshCw, Search, ShieldCheck } from 'lucide-react';
import {
  Badge, Button, ConfirmDialog, EmptyState, Input, Page, PageHeader, Panel, Select, Skeleton, cn, type Tone,
} from '@/components/ui';
import { ROLE_LABELS } from '@/lib/access';
import type { Role } from '@/lib/auth';
import { formatDate } from '@/lib/date';

type Source = 'staff' | 'books';
type AccountStatus = 'pending' | 'active' | 'deactivated' | 'rejected';
type Action = 'approve' | 'reject' | 'set_role' | 'deactivate' | 'reactivate';

interface Account {
  source: Source;
  id: string;
  name: string;
  email: string;
  role: Role;
  status: AccountStatus;
  created_at: string | null;
}

const TABS: { id: AccountStatus; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'active', label: 'Active' },
  { id: 'deactivated', label: 'Deactivated' },
  { id: 'rejected', label: 'Rejected' },
];

const STATUS_TONE: Record<AccountStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Pending', tone: 'warn' },
  active: { label: 'Active', tone: 'ok' },
  deactivated: { label: 'Deactivated', tone: 'neutral' },
  rejected: { label: 'Rejected', tone: 'bad' },
};

const STAFF_ROLES: Role[] = ['admin', 'manager', 'telecaller', 'data_entry', 'rep'];

const key = (a: Account) => `${a.source}:${a.id}`;

async function fetchAccounts(): Promise<Account[]> {
  const res = await fetch('/api/users');
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data || [];
}

export default function UsersClient({ selfId, initialTab }: { selfId: string | null; initialTab?: string }) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AccountStatus>(
    TABS.some(t => t.id === initialTab) ? (initialTab as AccountStatus) : 'pending'
  );
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  // Role chosen for pending/rejected staff before approving.
  const [approveRole, setApproveRole] = useState<Record<string, Role>>({});
  const [confirm, setConfirm] = useState<{ account: Account; action: Action } | null>(null);

  const load = useCallback(
    () =>
      fetchAccounts()
        .then(setAccounts)
        .catch(e => toast.error(e instanceof Error && e.message ? e.message : 'Could not load accounts'))
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => { load(); }, [load]);

  const selectTab = (t: AccountStatus) => {
    setTab(t);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', t);
    window.history.replaceState(null, '', url);
  };

  const counts = useMemo(() => {
    const c: Record<AccountStatus, number> = { pending: 0, active: 0, deactivated: 0, rejected: 0 };
    accounts.forEach(a => { c[a.status]++; });
    return c;
  }, [accounts]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts
      .filter(a => a.status === tab)
      .filter(a => !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));
  }, [accounts, tab, query]);

  const act = async (account: Account, action: Action, role?: Role) => {
    setBusy(key(account));
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: account.source, id: account.id, action, role }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Update failed');
      toast.success(successMessage(account, action, role));
      await load();
      router.refresh(); // updates the pending badge in the sidebar
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Users & access"
        description="Approve sign-up requests and decide which desk each person opens."
        actions={
          <Button icon={<RefreshCw className="size-3.5" />} onClick={() => { setLoading(true); load(); }}>
            Refresh
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1" role="tablist">
          {TABS.map(t => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => selectTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 h-8 px-3 rounded-md text-[13px] whitespace-nowrap transition-colors',
                tab === t.id ? 'bg-surface border border-line-strong text-ink font-medium' : 'text-ink-2 hover:bg-sunken'
              )}
            >
              {t.label}
              <span className={cn('font-mono text-[11.5px]', t.id === 'pending' && counts.pending > 0 ? 'text-accent' : 'text-ink-3')}>
                {counts[t.id]}
              </span>
            </button>
          ))}
        </div>
        <div className="sm:w-64">
          <Input
            leading={<Search />}
            placeholder="Filter by name or email"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>

      <Panel className="overflow-hidden">
        {loading ? (
          <div className="p-4 flex flex-col gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck />}
            title={tab === 'pending' ? 'No pending requests' : `No ${tab} accounts`}
            description={tab === 'pending' ? 'New sign-ups from the login page will show up here.' : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Desk / role</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th className="text-right!">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(a => {
                  const k = key(a);
                  const isSelf = a.source === 'staff' && a.id === selfId;
                  const isBusy = busy === k;
                  const chosenRole = approveRole[k] || (a.role === 'books' ? 'data_entry' : a.role);
                  return (
                    <tr key={k}>
                      <td>
                        <div className="font-medium text-ink">
                          {a.name}
                          {isSelf && <span className="ml-2 text-[11.5px] font-normal text-ink-3">(you)</span>}
                        </div>
                        <div className="text-[12px] text-ink-3">{a.email}</div>
                      </td>
                      <td>
                        {a.source === 'books' ? (
                          <span className="text-ink-2">Book catalogue</span>
                        ) : a.status === 'active' ? (
                          <div className="w-40">
                            <Select
                              aria-label={`Role for ${a.name}`}
                              value={a.role}
                              disabled={isBusy || isSelf}
                              onChange={e => act(a, 'set_role', e.target.value as Role)}
                              className="h-7.5 text-[12.5px]"
                            >
                              {STAFF_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                            </Select>
                          </div>
                        ) : a.status === 'pending' || a.status === 'rejected' ? (
                          <div className="w-40">
                            <Select
                              aria-label={`Role to grant ${a.name}`}
                              value={chosenRole}
                              disabled={isBusy}
                              onChange={e => setApproveRole(r => ({ ...r, [k]: e.target.value as Role }))}
                              className="h-7.5 text-[12.5px]"
                            >
                              {STAFF_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                            </Select>
                          </div>
                        ) : (
                          <span className="text-ink-2">{ROLE_LABELS[a.role]}</span>
                        )}
                      </td>
                      <td><Badge tone={STATUS_TONE[a.status].tone} dot>{STATUS_TONE[a.status].label}</Badge></td>
                      <td className="text-ink-2 whitespace-nowrap">{formatDate(a.created_at)}</td>
                      <td>
                        <div className="flex justify-end gap-1.5">
                          {(a.status === 'pending' || a.status === 'rejected') && (
                            <Button
                              size="sm"
                              variant="primary"
                              loading={isBusy}
                              onClick={() => act(a, 'approve', a.source === 'staff' ? chosenRole : undefined)}
                            >
                              Approve
                            </Button>
                          )}
                          {a.status === 'pending' && (
                            <Button size="sm" variant="quiet-danger" disabled={isBusy} onClick={() => act(a, 'reject')}>
                              Reject
                            </Button>
                          )}
                          {a.status === 'active' && !isSelf && (
                            <Button size="sm" variant="quiet-danger" disabled={isBusy} onClick={() => setConfirm({ account: a, action: 'deactivate' })}>
                              {a.source === 'books' ? 'Revoke' : 'Deactivate'}
                            </Button>
                          )}
                          {a.status === 'deactivated' && (
                            <Button size="sm" loading={isBusy} onClick={() => act(a, 'reactivate')}>
                              Reactivate
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && act(confirm.account, confirm.action)}
        loading={!!confirm && busy === key(confirm.account)}
        danger
        title={confirm?.account.source === 'books' ? 'Revoke catalogue access?' : 'Deactivate this account?'}
        description={
          confirm
            ? `${confirm.account.name} will be signed out on their next page load and can't sign in until reactivated.`
            : undefined
        }
        confirmLabel={confirm?.account.source === 'books' ? 'Revoke access' : 'Deactivate'}
      />
    </Page>
  );
}

function successMessage(a: Account, action: Action, role?: Role) {
  switch (action) {
    case 'approve': return `${a.name} approved${role ? ` as ${ROLE_LABELS[role]}` : ''}`;
    case 'reject': return `${a.name}'s request rejected`;
    case 'set_role': return `${a.name} is now ${role ? ROLE_LABELS[role] : 'updated'}`;
    case 'deactivate': return `${a.name} deactivated`;
    case 'reactivate': return `${a.name} reactivated`;
  }
}
