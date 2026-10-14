'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, UserRound } from 'lucide-react';
import { Badge, Button, EmptyState, Input, Page, PageHeader, Panel, PanelHeader, Skeleton } from '@/components/ui';
import { formatDate } from '@/lib/date';

interface Representative {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

async function loadAgents(): Promise<Representative[]> {
  const res = await fetch('/api/agents');
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data || [];
}

export default function RepresentativesPage() {
  const [agents, setAgents] = useState<Representative[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');

  const fetchAgents = () =>
    loadAgents()
      .then(setAgents)
      .catch(e => toast.error(e instanceof Error && e.message ? e.message : 'Could not load representatives'))
      .finally(() => setLoading(false));

  useEffect(() => { fetchAgents(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not add representative');
      toast.success(`${name} added`);
      setNewName('');
      fetchAgents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add representative');
    } finally {
      setAdding(false);
    }
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? agents.filter(a => a.name.toLowerCase().includes(q)) : agents;
  }, [agents, query]);

  return (
    <Page className="max-w-[900px]">
      <PageHeader
        title="Representatives"
        description="Field reps whose names appear on paper challans. Challan entry and imports match against this list."
      />

      <Panel className="overflow-hidden">
        <PanelHeader
          title="All representatives"
          meta={loading ? undefined : `${agents.length} active`}
          actions={
            <div className="w-48 hidden sm:block">
              <Input leading={<Search />} placeholder="Filter" value={query} onChange={e => setQuery(e.target.value)} className="h-7.5" />
            </div>
          }
        />

        <form onSubmit={handleAdd} className="flex items-center gap-2 px-4 py-3 border-b border-line bg-sunken/40">
          <div className="flex-1">
            <Input
              placeholder="New representative's full name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              aria-label="New representative name"
              maxLength={100}
            />
          </div>
          <Button type="submit" variant="primary" loading={adding} disabled={!newName.trim()} icon={<Plus className="size-3.5" />}>
            Add
          </Button>
        </form>

        {loading ? (
          <div className="p-4 flex flex-col gap-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<UserRound />}
            title={query ? `No representative matches “${query}”` : 'No representatives yet'}
            description={query ? undefined : 'Add the first one above.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-12 num">#</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a, i) => (
                  <tr key={a.id}>
                    <td className="num text-ink-3">{i + 1}</td>
                    <td className="font-medium text-ink">{a.name}</td>
                    <td>
                      <Badge tone={a.is_active ? 'ok' : 'neutral'} dot>{a.is_active ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="text-ink-2 whitespace-nowrap">{formatDate(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </Page>
  );
}
