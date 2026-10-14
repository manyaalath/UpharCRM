import {
  BookOpen, FilePlus2, LayoutDashboard, Newspaper, PhoneCall, ReceiptText, ShieldCheck, UserRound, Users,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/lib/auth';
import { canAccessPage } from '@/lib/access';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: 'pending';
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    label: 'Work',
    items: [
      { href: '/follow-ups', label: 'Follow-ups', icon: PhoneCall },
      { href: '/leads', label: 'Leads', icon: Users },
    ],
  },
  {
    label: 'Data',
    items: [
      { href: '/records', label: 'Challans', icon: ReceiptText },
      { href: '/de', label: 'Challan entry', icon: FilePlus2 },
      { href: '/books', label: 'Book catalogue', icon: BookOpen },
    ],
  },
  {
    label: 'Insights',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/daily-brief', label: 'Daily brief', icon: Newspaper },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/agents', label: 'Representatives', icon: UserRound },
      { href: '/users', label: 'Users & access', icon: ShieldCheck, badge: 'pending' },
    ],
  },
];

export function navFor(role: Role): NavGroup[] {
  return GROUPS
    .map(g => ({ ...g, items: g.items.filter(i => canAccessPage(role, i.href)) }))
    .filter(g => g.items.length > 0);
}

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/');
}
