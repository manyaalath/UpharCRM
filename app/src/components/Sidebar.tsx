'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/daily-brief', label: 'AI Daily Brief', icon: 'lightbulb' },
  { href: '/leads', label: 'Leads', icon: 'person_search' },
  { href: '/follow-ups', label: 'Follow-Ups', icon: 'task_alt' },
  { href: '/records', label: 'Records', icon: 'inventory' },
  { href: '/agents', label: 'Representatives', icon: 'group' },
  { href: '/notifications', label: 'Notifications', icon: 'notifications' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'crm' }),
    });
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="hidden md:flex flex-col h-screen w-[260px] py-6 bg-white border-r border-slate-200 fixed top-0 left-0 z-40 overflow-y-auto shadow-sm">
      {/* Brand */}
      <div className="px-6 mb-10">
        <h1 className="text-xl font-bold text-[#1E40AF] tracking-tight">
          Uphar CRM
        </h1>
        <p className="text-[13px] font-semibold text-slate-500 mt-1">
          Distribution Hub
        </p>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 flex flex-col gap-1 px-2">
        {navItems.map((item) => {
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
