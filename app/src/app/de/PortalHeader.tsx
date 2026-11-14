'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, LogOut } from 'lucide-react';
import { Button } from '@/components/ui';
import InstallButton from '@/components/pwa/InstallButton';
import { useSignOut } from '@/components/shell/useSignOut';
import { ROLE_LABELS } from '@/lib/access';
import type { Role } from '@/lib/auth';

// Slim header shared by the challan entry and book catalogue portals.
export default function PortalHeader({ product, name, role }: { product: string; name: string; role: Role }) {
  const doSignOut = useSignOut();
  const [signingOut, setSigningOut] = useState(false);
  const showCrmLink = role === 'admin' || role === 'manager';

  const signOut = async () => {
    setSigningOut(true);
    await doSignOut();
  };

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur border-b border-line pt-[var(--safe-t)]">
      <div className="mx-auto max-w-[1280px] h-13 pl-2 pr-2 sm:px-6 lg:px-8 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {showCrmLink ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 h-10 md:h-8 px-2 md:px-2.5 rounded-md text-[13px] text-ink-2 hover:bg-sunken hover:text-ink shrink-0"
              aria-label="Back to CRM"
            >
              <ArrowLeft className="size-4 md:size-3.5" />
              <span className="hidden sm:inline">CRM</span>
            </Link>
          ) : (
            <span className="w-2" aria-hidden />
          )}
          <span className="hidden sm:block font-deva text-[19px] font-bold text-ink leading-none whitespace-nowrap">उपहार प्रकाशन</span>
          <span className="sm:hidden font-deva text-[19px] font-bold text-ink leading-none" aria-hidden>उ</span>
          <span className="h-4 w-px bg-line-strong shrink-0" aria-hidden />
          <span className="text-[13.5px] font-semibold text-ink truncate">{product}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="hidden lg:block"><InstallButton size="sm" variant="ghost" /></span>
          <div className="hidden md:block text-right leading-tight px-2">
            <div className="text-[12.5px] font-medium text-ink">{name}</div>
            <div className="text-[11.5px] text-ink-3">{ROLE_LABELS[role]}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} loading={signingOut} icon={<LogOut className="size-3.5" />} aria-label="Sign out">
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
