'use client';

import { useEffect } from 'react';
import { RotateCw } from 'lucide-react';
import { Button } from '@/components/ui';

// Reloads when asked, and on its own the moment the connection returns.
export default function RetryButton() {
  useEffect(() => {
    const back = () => window.location.reload();
    window.addEventListener('online', back);
    return () => window.removeEventListener('online', back);
  }, []);

  return (
    <Button variant="primary" size="lg" className="mt-6" icon={<RotateCw className="size-4" />} onClick={() => window.location.reload()}>
      Try again
    </Button>
  );
}
