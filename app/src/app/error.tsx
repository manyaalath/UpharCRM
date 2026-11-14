'use client';

import { useEffect } from 'react';
import { RotateCw } from 'lucide-react';
import { Button, LinkButton } from '@/components/ui';

// Catches errors thrown while rendering any screen, so a failed load never shows a blank page.
export default function ErrorScreen({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="flex min-h-[70dvh] flex-1 items-center justify-center px-6 py-12">
      <div className="max-w-sm">
        <h1 className="font-serif text-[26px] font-semibold text-ink leading-tight">This screen didn’t load</h1>
        <p className="mt-2 text-[14px] text-ink-2 leading-relaxed">
          Nothing was lost. It is usually a dropped connection — try again in a moment.
        </p>
        {error.digest && <p className="mt-2 font-mono text-[11.5px] text-ink-3">Reference {error.digest}</p>}
        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="primary" size="lg" icon={<RotateCw className="size-4" />} onClick={reset}>Try again</Button>
          <LinkButton href="/" size="lg">Go to my desk</LinkButton>
        </div>
      </div>
    </div>
  );
}
