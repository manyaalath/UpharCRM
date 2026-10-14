'use client';

import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { cn, Kbd } from '@/components/ui';
import type { Role } from '@/lib/auth';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import CommandPalette from './CommandPalette';

export interface ShellUser {
  name: string;
  role: Role;
  email: string;
}

const COLLAPSE_KEY = 'uphar.sidebar.collapsed';
const COLLAPSE_EVENT = 'uphar:sidebar';

// Sidebar preference lives in localStorage (per-viewer convenience only).
function subscribeCollapsed(cb: () => void) {
  window.addEventListener('storage', cb);
  window.addEventListener(COLLAPSE_EVENT, cb);
  return () => {
    window.removeEventListener('storage', cb);
    window.removeEventListener(COLLAPSE_EVENT, cb);
  };
}
function readCollapsed() {
  try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
}
const noopSubscribe = () => () => {};
const readIsMac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export default function Shell({ user, pendingCount, children }: { user: ShellUser; pendingCount: number; children: ReactNode }) {
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  const isMac = useSyncExternalStore(noopSubscribe, readIsMac, () => false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const toggle = useCallback(() => {
    try { localStorage.setItem(COLLAPSE_KEY, readCollapsed() ? '0' : '1'); } catch { /* storage blocked */ }
    window.dispatchEvent(new Event(COLLAPSE_EVENT));
  }, []);

  // Ctrl/Cmd+K opens the palette from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(o => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const closePalette = useCallback(() => setPaletteOpen(false), []);

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <Sidebar user={user} collapsed={collapsed} onToggle={toggle} pendingCount={pendingCount} />
      <MobileNav user={user} pendingCount={pendingCount} onSearch={() => setPaletteOpen(true)} />

      <div className={cn('flex flex-col min-h-dvh transition-[padding] duration-150', collapsed ? 'md:pl-[60px]' : 'md:pl-[240px]')}>
        {/* Desktop top bar */}
        <header className="hidden md:flex sticky top-0 z-30 h-14 items-center gap-4 px-8 bg-paper/90 backdrop-blur border-b border-line">
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-2.5 w-full max-w-[420px] h-8.5 px-3 rounded-md border border-line-strong bg-surface text-[13px] text-ink-3 hover:border-ink-3 transition-colors"
          >
            <Search className="size-4" />
            <span className="flex-1 text-left truncate">Search leads, phone, challan…</span>
            <span className="flex items-center gap-0.5">
              <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>
        </header>

        <main className="flex-1 flex flex-col min-w-0">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} onClose={closePalette} role={user.role} />
    </div>
  );
}
