'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/leads', label: 'Leads', icon: 'person_search' },
  { href: '/records', label: 'Records', icon: 'inventory' },
  { href: '/data-entry', label: 'New Entry', icon: 'edit_note' },
  { href: '/agents', label: 'Agents', icon: 'group' },
];

export default function Sidebar() {
  const pathname = usePathname();

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

      {/* Settings */}
      <div className="px-2 mt-auto">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all text-[13px] font-semibold"
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
          Settings
        </Link>
      </div>
    </aside>
  );
}
