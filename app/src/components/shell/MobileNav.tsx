'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { LogOut, Menu, MoreHorizontal, PhoneCall, Search, Users, X } from 'lucide-react';
import { cn } from '@/components/ui';
import { canAccessPage, ROLE_LABELS } from '@/lib/access';
import { isActive, navFor } from './nav';
import { useSignOut } from './useSignOut';
import { initials } from './Sidebar';
import type { ShellUser } from './Shell';

// Mobile top bar + bottom tab bar + "More" sheet.
export default function MobileNav({
  user, pendingCount, onSearch,
}: {
  user: ShellUser; pendingCount: number; onSearch: () => void;
}) {
  const pathname = usePathname();
  const signOut = useSignOut();
  const [moreOpen, setMoreOpen] = useState(false);

  const tabs = [
    { href: '/follow-ups', label: 'Follow-ups', icon: PhoneCall },
    { href: '/leads', label: 'Leads', icon: Users },
  ].filter(t => canAccessPage(user.role, t.href));

  const tabHrefs = new Set(tabs.map(t => t.href));
  const moreGroups = navFor(user.role)
    .map(g => ({ ...g, items: g.items.filter(i => !tabHrefs.has(i.href)) }))
    .filter(g => g.items.length > 0);
  const moreActive = moreGroups.some(g => g.items.some(i => isActive(pathname, i.href)));

  const tabCls = (active: boolean) =>
    cn('flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[11px]', active ? 'text-ink font-semibold' : 'text-ink-3');

  return (
    <>
      {/* Top bar */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between h-12 px-4 bg-surface/95 backdrop-blur border-b border-line">
        <Link href="/" className="flex items-baseline gap-1.5">
          <span className="font-deva text-[18px] font-bold text-ink leading-none">उपहार प्रकाशन</span>
          <span className="text-[10px] font-semibold tracking-[0.08em] text-ink-3">CRM</span>
        </Link>
        <div className="flex items-center gap-0.5">
          <button onClick={onSearch} className="p-2 rounded-md text-ink-2 hover:bg-sunken" aria-label="Search">
            <Search className="size-[18px]" />
          </button>
          <button onClick={() => setMoreOpen(true)} className="relative p-2 rounded-md text-ink-2 hover:bg-sunken" aria-label="Menu">
            <Menu className="size-[18px]" />
            {pendingCount > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-accent" />}
          </button>
        </div>
      </header>

      {/* Bottom tabs */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 h-14 flex items-stretch bg-surface border-t border-line pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary"
      >
        {tabs.map(t => {
          const active = isActive(pathname, t.href);
          return (
            <Link key={t.href} href={t.href} className={tabCls(active)} aria-current={active ? 'page' : undefined}>
              <t.icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
              {t.label}
            </Link>
          );
        })}
        <button onClick={onSearch} className={tabCls(false)}>
          <Search className="size-5" strokeWidth={1.75} />
          Search
        </button>
        <button onClick={() => setMoreOpen(true)} className={cn(tabCls(moreActive), 'relative')}>
          <MoreHorizontal className="size-5" strokeWidth={moreActive ? 2.25 : 1.75} />
          More
          {pendingCount > 0 && <span className="absolute top-2 left-1/2 ml-2 size-2 rounded-full bg-accent" />}
        </button>
      </nav>

      {/* More sheet */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setMoreOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 max-h-[85dvh] overflow-y-auto bg-surface border-t border-line rounded-t-lg pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
              <div className="size-9 rounded-full bg-sunken border border-line flex items-center justify-center text-[12px] font-semibold text-ink-2">
                {initials(user.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-ink truncate">{user.name}</div>
                <div className="text-[12px] text-ink-3 truncate">{ROLE_LABELS[user.role]} · {user.email}</div>
              </div>
              <button onClick={() => setMoreOpen(false)} className="p-2 -mr-2 rounded-md text-ink-3 hover:bg-sunken" aria-label="Close menu">
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
                      onClick={() => setMoreOpen(false)}
                      className={cn('flex items-center gap-3 px-4 h-11 text-[14px]', active ? 'text-ink font-medium bg-sunken' : 'text-ink-2')}
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

            <button onClick={signOut} className="flex items-center gap-3 w-full px-4 h-12 text-[14px] text-bad">
              <LogOut className="size-[18px]" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
