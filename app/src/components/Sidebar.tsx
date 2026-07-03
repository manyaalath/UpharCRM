'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import type { UserRole } from '@/lib/types';
import { USER_ROLE_COLORS } from '@/lib/types';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles?: UserRole[]; // if set, only these roles can see it
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard', roles: ['admin', 'manager'] },
  { href: '/daily-brief', label: 'AI Daily Brief', icon: 'lightbulb', roles: ['admin', 'manager'] },
  { href: '/leads', label: 'Leads', icon: 'person_search', roles: ['admin', 'manager', 'data_entry', 'telecaller'] },
  { href: '/follow-ups', label: 'Follow-Ups', icon: 'task_alt', roles: ['admin', 'manager', 'telecaller'] },
  { href: '/records', label: 'Records', icon: 'inventory', roles: ['admin', 'manager', 'data_entry'] },
  { href: '/agents', label: 'Representatives', icon: 'group', roles: ['admin', 'manager', 'data_entry'] },
  { href: '/import', label: 'Import Data', icon: 'upload_file', roles: ['admin', 'manager', 'data_entry'] },
  { href: '/notifications', label: 'Notifications', icon: 'notifications', roles: ['admin', 'manager', 'telecaller'] },
  { href: '/users', label: 'User Management', icon: 'admin_panel_settings', roles: ['admin'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    // Fetch current user info
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setUserRole(data.role as UserRole);
          setUserName(data.name || '');
        } else {
          // Fallback: assume admin for legacy CRM login
          setUserRole('admin');
          setUserName('Admin');
        }
      })
      .catch(() => {
        setUserRole('admin');
        setUserName('Admin');
      });
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'crm' }),
    });
    router.push('/login');
    router.refresh();
  };

  const visibleItems = navItems.filter(item =>
    !item.roles || !userRole || item.roles.includes(userRole)
  );

  const roleColors = userRole ? USER_ROLE_COLORS[userRole] : null;

  return (
    <aside className="hidden md:flex flex-col h-screen w-[260px] py-6 bg-white border-r border-slate-200 fixed top-0 left-0 z-40 overflow-y-auto shadow-sm">
      {/* Brand */}
      <div className="px-6 mb-6">
        <h1 className="text-xl font-bold text-[#1E40AF] tracking-tight">
          Uphar CRM
        </h1>
        <p className="text-[13px] font-semibold text-slate-500 mt-1">
          Distribution Hub
        </p>
      </div>

      {/* User Info */}
      {userRole && (
        <div className="px-4 mb-6">
          <div className="px-3 py-2.5 bg-slate-50 rounded-xl">
            <p className="text-[13px] font-semibold text-slate-800 truncate">{userName}</p>
            <div className="mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${roleColors?.bg || ''} ${roleColors?.text || ''} border ${roleColors?.border || ''}`}>
                {userRole.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Nav Links */}
      <nav className="flex-1 flex flex-col gap-1 px-2">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-[13px] font-semibold ${
                isActive
                  ? 'text-[#1E40AF] border-r-2 border-[#1E40AF] bg-blue-50/60 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-2 mt-auto flex flex-col gap-1">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all text-[13px] font-semibold"
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
          Settings
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all text-[13px] font-semibold w-full text-left"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
