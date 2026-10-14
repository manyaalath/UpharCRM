'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/access';
import { isActive, navFor } from './nav';
import { useSignOut } from './useSignOut';
import type { ShellUser } from './Shell';

export default function Sidebar({
  user, collapsed, onToggle, pendingCount,
}: {
  user: ShellUser; collapsed: boolean; onToggle: () => void; pendingCount: number;
}) {
  const pathname = usePathname();
  const signOut = useSignOut();
  const groups = navFor(user.role);

  return (
    <aside
      className={cn(
        'hidden md:flex fixed inset-y-0 left-0 z-40 flex-col bg-surface border-r border-line transition-[width] duration-150',
        collapsed ? 'w-[60px]' : 'w-[240px]'
      )}
    >
      {/* Brand */}
      <div className={cn('flex items-center h-14 border-b border-line', collapsed ? 'justify-center px-0' : 'justify-between px-4')}>
        {collapsed ? (
          <Link href="/" className="font-deva text-[20px] font-bold text-ink leading-none" title="उपहार प्रकाशन">उ</Link>
        ) : (
          <Link href="/" className="flex items-baseline gap-2 min-w-0">
            <span className="font-deva text-[19px] font-bold text-ink leading-none truncate">उपहार प्रकाशन</span>
            <span className="text-[10.5px] font-semibold tracking-[0.08em] text-ink-3">CRM</span>
          </Link>
        )}
        {!collapsed && (
          <button
            onClick={onToggle}
            className="p-1.5 -mr-1.5 rounded-md text-ink-3 hover:text-ink hover:bg-sunken"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="size-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3" aria-label="Main">
        {groups.map(group => (
          <div key={group.label} className="mb-3">
            {!collapsed && (
              <div className="px-5 pb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">{group.label}</div>
            )}
            <ul className={cn('flex flex-col gap-px', collapsed ? 'px-2' : 'px-2.5')}>
              {group.items.map(item => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                const badge = item.badge === 'pending' && pendingCount > 0 ? pendingCount : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'relative flex items-center gap-2.5 h-8 rounded-md text-[13.5px] transition-colors',
                        collapsed ? 'justify-center' : 'px-2.5',
                        active ? 'bg-sunken text-ink font-medium' : 'text-ink-2 hover:bg-sunken/70 hover:text-ink'
                      )}
                    >
                      {active && <span className="absolute -left-2.5 top-1.5 bottom-1.5 w-[2px] rounded-r bg-accent" aria-hidden />}
                      <Icon className={cn('size-4 shrink-0', active ? 'text-ink' : 'text-ink-3')} />
                      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                      {badge > 0 && (
                        collapsed ? (
                          <span className="absolute top-1 right-1 size-2 rounded-full bg-accent" aria-label={`${badge} pending`} />
                        ) : (
                          <span className="min-w-5 h-5 px-1.5 rounded-sm bg-accent-soft text-accent text-[11px] font-semibold font-mono flex items-center justify-center">
                            {badge}
                          </span>
                        )
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-line p-2.5">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <button onClick={onToggle} className="p-2 rounded-md text-ink-3 hover:text-ink hover:bg-sunken" aria-label="Expand sidebar" title="Expand sidebar">
              <PanelLeftOpen className="size-4" />
            </button>
            <button onClick={signOut} className="p-2 rounded-md text-ink-3 hover:text-bad hover:bg-bad-soft" aria-label="Sign out" title="Sign out">
              <LogOut className="size-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-1.5">
            <div className="size-8 shrink-0 rounded-full bg-sunken border border-line flex items-center justify-center text-[12px] font-semibold text-ink-2">
              {initials(user.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-ink truncate">{user.name}</div>
              <div className="text-[11.5px] text-ink-3 truncate">{ROLE_LABELS[user.role]}</div>
            </div>
            <button onClick={signOut} className="p-1.5 rounded-md text-ink-3 hover:text-bad hover:bg-bad-soft" aria-label="Sign out" title="Sign out">
              <LogOut className="size-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}
