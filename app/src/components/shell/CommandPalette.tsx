'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  ArrowRight, Download, FilePlus2, LayoutDashboard, Loader2, PhoneCall, ReceiptText, Search, User,
  type LucideIcon,
} from 'lucide-react';
import { Kbd } from '@/components/ui';
import type { Role } from '@/lib/auth';
import { canAccessApi, canAccessPage } from '@/lib/access';
import { downloadFromApi } from '@/lib/download';

interface SearchResult {
  type: 'lead' | 'challan';
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

interface Action {
  id: string;
  label: string;
  icon: LucideIcon;
  run: () => void;
  visible: boolean;
}

// Mounted only while open, so its state resets every time it closes.
export default function CommandPalette({ open, onClose, role }: { open: boolean; onClose: () => void; role: Role }) {
  if (!open || typeof document === 'undefined') return null;
  return <PaletteBody onClose={onClose} role={role} />;
}

function PaletteBody({ onClose, role }: { onClose: () => void; role: Role }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const onQueryChange = (value: string) => {
    setQuery(value);
    setLoading(value.trim().length >= 2);
  };

  // Debounced server search.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      abortRef.current?.abort();
      return;
    }
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const json = await res.json();
        if (!ctrl.signal.aborted) setResults(res.ok ? json.data || [] : []);
      } catch {
        // aborted or offline — keep previous results
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Abort any in-flight search when the palette closes.
  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  const actions: Action[] = useMemo(() => [
    { id: 'followups', label: 'Go to Follow-ups', icon: PhoneCall, run: () => go('/follow-ups'), visible: canAccessPage(role, '/follow-ups') },
    { id: 'dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, run: () => go('/dashboard'), visible: canAccessPage(role, '/dashboard') },
    { id: 'challans', label: 'Go to Challans', icon: ReceiptText, run: () => go('/records'), visible: canAccessPage(role, '/records') },
    { id: 'new-challan', label: 'New challan', icon: FilePlus2, run: () => go('/de'), visible: canAccessPage(role, '/de') },
    {
      id: 'export-leads', label: 'Export leads to Excel', icon: Download,
      run: () => { onClose(); downloadFromApi('/api/export?type=leads', 'uphar_leads.xlsx'); },
      visible: canAccessApi(role, '/api/export'),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ].filter(a => a.visible), [role]);

  const q = query.trim().toLowerCase();
  const visibleActions = q ? actions.filter(a => a.label.toLowerCase().includes(q)) : actions;
  const shown = q.length >= 2 ? results : [];
  const leads = shown.filter(r => r.type === 'lead');
  const challans = shown.filter(r => r.type === 'challan');

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-3 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search">
      <div className="absolute inset-0 bg-ink/25" onClick={onClose} />
      <Command
        shouldFilter={false}
        loop
        className="relative w-full max-w-[600px] bg-surface border border-line rounded-lg shadow-[var(--shadow-pop)] overflow-hidden"
      >
        <div className="flex items-center gap-2.5 px-4 border-b border-line">
          {loading ? <Loader2 className="size-4 text-ink-3 animate-spin" /> : <Search className="size-4 text-ink-3" />}
          <Command.Input
            autoFocus
            value={query}
            onValueChange={onQueryChange}
            placeholder="Search by name, phone, institute, lead ID or challan no."
            className="flex-1 h-12 bg-transparent text-[14px] text-ink placeholder:text-ink-3 outline-none"
          />
          <Kbd>Esc</Kbd>
        </div>

        <Command.List className="max-h-[min(60vh,440px)] overflow-y-auto p-1.5">
          {q.length >= 2 && !loading && shown.length === 0 && visibleActions.length === 0 && (
            <div className="py-10 text-center text-[13px] text-ink-2">No matches for “{query.trim()}”</div>
          )}
          {q.length >= 2 && !loading && shown.length === 0 && visibleActions.length > 0 && (
            <div className="px-3 py-2 text-[12px] text-ink-3">No leads or challans match “{query.trim()}”</div>
          )}

          {leads.length > 0 && (
            <Command.Group heading="Leads" className={groupCls}>
              {leads.map(r => (
                <Command.Item key={`l-${r.id}`} value={`lead-${r.id}`} onSelect={() => go(r.href)} className={itemCls}>
                  <User className="size-4 text-ink-3 shrink-0" />
                  <ResultText title={r.title} subtitle={r.subtitle} />
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {challans.length > 0 && (
            <Command.Group heading="Challans" className={groupCls}>
              {challans.map(r => (
                <Command.Item key={`c-${r.id}`} value={`challan-${r.id}`} onSelect={() => go(r.href)} className={itemCls}>
                  <ReceiptText className="size-4 text-ink-3 shrink-0" />
                  <ResultText title={r.title} subtitle={r.subtitle} />
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {visibleActions.length > 0 && (
            <Command.Group heading="Actions" className={groupCls}>
              {visibleActions.map(a => (
                <Command.Item key={a.id} value={`action-${a.id}`} onSelect={a.run} className={itemCls}>
                  <a.icon className="size-4 text-ink-3 shrink-0" />
                  <span className="flex-1 truncate">{a.label}</span>
                  <ArrowRight className="size-3.5 text-ink-3 opacity-0 group-data-[selected=true]:opacity-100" />
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>

        <div className="hidden sm:flex items-center gap-4 px-4 h-9 border-t border-line bg-sunken/50 text-[11.5px] text-ink-3">
          <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> move</span>
          <span className="flex items-center gap-1"><Kbd>Enter</Kbd> open</span>
        </div>
      </Command>
    </div>,
    document.body
  );
}

const groupCls =
  '[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 ' +
  '[&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase ' +
  '[&_[cmdk-group-heading]]:tracking-[0.06em] [&_[cmdk-group-heading]]:text-ink-3';

const itemCls =
  'group flex items-center gap-2.5 px-2.5 h-10 rounded-md text-[13.5px] text-ink cursor-pointer ' +
  'data-[selected=true]:bg-sunken';

function ResultText({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex-1 min-w-0 flex items-baseline gap-2">
      <span className="truncate">{title}</span>
      {subtitle && <span className="truncate text-[12px] text-ink-3">{subtitle}</span>}
    </div>
  );
}
