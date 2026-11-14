import type { Metadata } from 'next';
import { LinkButton } from '@/components/ui';

export const metadata: Metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <div className="min-h-dvh flex items-center justify-center px-6 bg-paper">
      <div className="max-w-sm">
        <div className="font-mono text-[13px] font-medium text-accent">404</div>
        <h1 className="mt-2 font-serif text-[28px] font-semibold text-ink leading-tight">This page isn’t in the ledger</h1>
        <p className="mt-2 text-[14px] text-ink-2 leading-relaxed">
          The link may be old, or the lead or challan may have been removed. Search from your desk to find it.
        </p>
        {/* "/" routes signed-in users to their own desk. */}
        <LinkButton href="/" variant="primary" size="lg" className="mt-6">Go to my desk</LinkButton>
      </div>
    </div>
  );
}
