'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, LogOut } from 'lucide-react';
import { Button } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/access';
import type { Role } from '@/lib/auth';

// Slim header shared by the challan entry and book catalogue portals.
export default function PortalHeader({ product, name, role }: { product: string; name: string; role: Role }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const showCrmLink = role === 'admin' || role === 'manager';

  const signOut = async () => {
    setSigningOut(true);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    router.replace('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 bg-surface border-b border-line">
      <div className="mx-auto max-w-[1280px] h-13 px-4 md:px-8 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-deva text-[19px] font-bold text-ink leading-none whitespace-nowrap">उपहार प्रकाशन</span>
          <span className="h-4 w-px bg-line-strong" aria-hidden />
          <span className="text-[13.5px] font-semibold text-ink truncate">{product}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {showCrmLink && (
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[13px] text-ink-2 hover:bg-sunken hover:text-ink"
            >
              <ArrowLeft className="size-3.5" />
              Back to CRM
            </Link>
          )}
          <div className="hidden md:block text-right leading-tight px-2">
            <div className="text-[12.5px] font-medium text-ink">{name}</div>
            <div className="text-[11.5px] text-ink-3">{ROLE_LABELS[role]}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} loading={signingOut} icon={<LogOut className="size-3.5" />}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
