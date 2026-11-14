'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import InstallButton from './InstallButton';
import { usePwaInstall } from './usePwaInstall';

const KEY = 'uphar.install.dismissedAt';
const SNOOZE_DAYS = 30;

function snoozed() {
  try {
    const at = Number(localStorage.getItem(KEY) || 0);
    return at > 0 && Date.now() - at < SNOOZE_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

// One quiet line for signed-in users, outside the work flow. Dismissing hides it for a month.
export default function InstallBanner() {
  const { available } = usePwaInstall();
  const [hidden, setHidden] = useState(true);

  // localStorage is client-only: read it after hydration.
  useEffect(() => { queueMicrotask(() => setHidden(snoozed())); }, []);

  if (!available || hidden) return null;

  const dismiss = () => {
    try { localStorage.setItem(KEY, String(Date.now())); } catch { /* storage blocked */ }
    setHidden(true);
  };

  return (
    <div className="flex items-center gap-3 border-b border-line bg-surface pl-4 pr-2 md:pl-8 md:pr-6 py-1.5">
      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-accent font-deva text-[16px] font-bold leading-none text-white" aria-hidden>उ</span>
      <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-ink-2">
        <span className="font-medium text-ink">Install Uphar CRM</span>
        <span className="hidden sm:inline"> — opens from your home screen in its own window, no browser bars.</span>
      </p>
      <InstallButton size="sm" variant="secondary" label="Install" icon={undefined} onInstalled={dismiss} />
      <button type="button" onClick={dismiss} className="grid size-9 md:size-8 shrink-0 place-items-center rounded-md text-ink-3 hover:bg-sunken hover:text-ink" aria-label="Dismiss">
        <X className="size-4" />
      </button>
    </div>
  );
}
