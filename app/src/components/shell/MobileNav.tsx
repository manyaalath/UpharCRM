'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useState } from 'react';
import { LayoutDashboard, LogOut, Menu, MoreHorizontal, PhoneCall, ReceiptText, Search, Users, X } from 'lucide-react';
import { cn, useOverlay } from '@/components/ui';
import InstallButton from '@/components/pwa/InstallButton';
import { canAccessPage, ROLE_LABELS } from '@/lib/access';
import { isActive, navFor } from './nav';
import { useSignOut } from './useSignOut';
import { initials } from './Sidebar';
import type { ShellUser } from './Shell';

// The screens people open most, in order. The first three a role can open become tabs.
const TAB_CANDIDATES = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/follow-ups', label: 'Follow-ups', icon: PhoneCall },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/records', label: 'Challans', icon: ReceiptText },
];

// Mobile top bar + bottom tab bar + "More" sheet.
export default function MobileNav({
  user, pendingCount, onSearch,
}: {
  user: ShellUser; pendingCount: number; onSearch: () => void;
}) {
  const pathname = usePathname();
  const signOut = useSignOut();
  const [moreOpen, setMoreOpen] = useState(false);
  const closeMore = useCallback(() => setMoreOpen(false), []);
  useOverlay(moreOpen, closeMore);

  const tabs = TAB_CANDIDATES.filter(t => canAccessPage(user.role, t.href)).slice(0, 3);

  const tabHrefs = new Set(tabs.map(t => t.href));
  const moreGroups = navFor(user.role)
    .map(g => ({ ...g, items: g.items.filter(i => !tabHrefs.has(i.href)) }))
    .filter(g => g.items.length > 0);
  const moreActive = moreGroups.some(g => g.items.some(i => isActive(pathname, i.href)));

  const tabCls = (active: boolean) =>
    cn(
      'relative flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 h-[var(--nav-h)] text-[11px] transition-colors',
      active ? 'text-ink font-semibold' : 'text-ink-3 active:text-ink'
    );
  const indicator = <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-b bg-accent" aria-hidden />;

  return (
    <>
      {/* Top bar */}
      <header className="md:hidden sticky top-0 z-40 bg-surface/95 backdrop-blur border-b border-line pt-[var(--safe-t)]">
        <div className="flex items-center justify-between h-12 pl-4 pr-1.5">
          <Link href="/" className="flex items-baseline gap-1.5">
            <span className="font-deva text-[18px] font-bold text-ink leading-none">उपहार प्रकाशन</span>
            <span className="text-[10px] font-semibold tracking-[0.08em] text-ink-3">CRM</span>
          </Link>
          <div className="flex items-center">
            <button type="button" onClick={onSearch} className="grid size-11 place-items-center rounded-md text-ink-2 active:bg-sunken" aria-label="Search">
              <Search className="size-5" />
            </button>
            <button type="button" onClick={() => setMoreOpen(true)} className="relative grid size-11 place-items-center rounded-md text-ink-2 active:bg-sunken" aria-label="Menu">
              <Menu className="size-5" />
              {pendingCount > 0 && <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-accent" />}
            </button>
          </div>
        </div>
      </header>

      {/* Bottom tabs */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch bg-surface/95 backdrop-blur border-t border-line pb-[var(--safe-b)]"
        aria-label="Primary"
      >
        {tabs.map(t => {
          const active = isActive(pathname, t.href);
          return (
            <Link key={t.href} href={t.href} className={tabCls(active)} aria-current={active ? 'page' : undefined}>
              {active && indicator}
              <t.icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
              <span className="truncate max-w-full px-1">{t.label}</span>
            </Link>
          );
        })}
        <button type="button" onClick={onSearch} className={tabCls(false)}>
          <Search className="size-5" strokeWidth={1.75} />
          Search
        </button>
        <button type="button" onClick={() => setMoreOpen(true)} className={tabCls(moreActive)} aria-haspopup="dialog">
          {moreActive && indicator}
          <MoreHorizontal className="size-5" strokeWidth={moreActive ? 2.25 : 1.75} />
          More
          {pendingCount > 0 && <span className="absolute top-2 left-1/2 ml-2 size-2 rounded-full bg-accent" />}
        </button>
      </nav>

      {/* More sheet */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/30 animate-fade-in" onClick={closeMore} />
          <div className="absolute bottom-0 inset-x-0 max-h-[85dvh] overflow-y-auto overscroll-contain bg-surface border-t border-line rounded-t-xl pb-[var(--safe-b)] animate-sheet-up">
            <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-line-strong" aria-hidden />
            <div className="flex items-center gap-3 pl-4 pr-2 py-2.5 border-b border-line">
              <div className="size-9 shrink-0 rounded-full bg-sunken border border-line flex items-center justify-center text-[12px] font-semibold text-ink-2">
                {initials(user.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-ink truncate">{user.name}</div>
                <div className="text-[12px] text-ink-3 truncate">{ROLE_LABELS[user.role]} · {user.email}</div>
              </div>
              <button type="button" onClick={closeMore} className="grid size-11 place-items-center rounded-md text-ink-3 active:bg-sunken" aria-label="Close menu">
                <X className="size-5" />
              </button>
            </div>

            {moreGroups.map(g => (
              <div key={g.label} className="py-2 border-b border-line">
                <div className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">{g.label}</div>
                {g.items.map(i => {
                  const active = isActive(pathname, i.href);
                  return (
                    <Link
                      key={i.href}
                      href={i.href}
                      onClick={closeMore}
                      className={cn('flex items-center gap-3 px-4 h-12 text-[14.5px] active:bg-sunken', active ? 'text-ink font-medium bg-sunken' : 'text-ink-2')}
                    >
                      <i.icon className="size-[18px] text-ink-3" />
                      <span className="flex-1">{i.label}</span>
                      {i.badge === 'pending' && pendingCount > 0 && (
                        <span className="min-w-5 h-5 px-1.5 rounded-sm bg-accent-soft text-accent text-[11px] font-semibold font-mono flex items-center justify-center">
                          {pendingCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}

            <div className="flex items-center justify-between gap-3 px-2 py-1.5">
              <button type="button" onClick={signOut} className="flex items-center gap-3 px-2 h-12 text-[14.5px] text-bad">
                <LogOut className="size-[18px]" />
                Sign out
              </button>
              <InstallButton size="sm" variant="ghost" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
