import type { Metadata } from 'next';
import { WifiOff } from 'lucide-react';
import RetryButton from './RetryButton';

export const metadata: Metadata = { title: 'Offline' };

// Shown by the service worker when a page can't be loaded. Fully static.
export default function OfflinePage() {
  return (
    <div className="min-h-dvh flex items-center justify-center px-6 bg-paper">
      <div className="max-w-sm">
        <div className="font-deva text-[22px] font-bold text-ink leading-none">उपहार प्रकाशन</div>
        <WifiOff className="mt-8 size-6 text-ink-3" aria-hidden />
        <h1 className="mt-3 font-serif text-[26px] font-semibold text-ink leading-tight">You’re offline</h1>
        <p className="mt-2 text-[14px] text-ink-2 leading-relaxed">
          Uphar CRM needs a connection to load leads, challans and the call queue. Nothing you saved earlier is lost.
        </p>
        <p className="mt-2 text-[13px] text-ink-3">Check mobile data or Wi-Fi, then try again.</p>
        <RetryButton />
      </div>
    </div>
  );
}
