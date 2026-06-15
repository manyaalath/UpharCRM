'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/dashboard', label: 'Home', icon: 'home' },
  { href: '/leads', label: 'Leads', icon: 'list_alt' },
  { href: '/records', label: 'Records', icon: 'folder' },
  { href: '/notifications', label: 'Alerts', icon: 'notifications' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center justify-center p-2 rounded-xl min-w-[64px] transition-all duration-200 ${
              isActive
                ? 'bg-[#DBEAFE] text-[#1E40AF] scale-95'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <span
              className="material-symbols-outlined text-[22px]"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {tab.icon}
            </span>
            <span className={`text-[10px] mt-0.5 ${isActive ? 'font-bold' : 'font-medium'}`}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
