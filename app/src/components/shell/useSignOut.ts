'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export function useSignOut() {
  const router = useRouter();
  return useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    router.replace('/login');
    router.refresh();
  }, [router]);
}
