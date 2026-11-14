'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { WifiOff } from 'lucide-react';

function subscribeOnline(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}
const readOnline = () => navigator.onLine;
const serverOnline = () => true;

// Registers the service worker (production only — it would fight the dev
// server's hot reload) and shows a small pill while the device is offline.
export default function PwaRegister() {
  const online = useSyncExternalStore(subscribeOnline, readOnline, serverOnline);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => { /* the app works without it */ });
    };
    if (document.readyState === 'complete') {
      register();
      return;
    }
    window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);

  if (online) return null;
  return (
    <div
      role="status"
      className="fixed left-1/2 top-[calc(var(--safe-t)+0.5rem)] z-[95] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-ink px-3.5 py-1.5 text-[12.5px] font-medium text-white shadow-[var(--shadow-pop)] animate-fade-in"
    >
      <WifiOff className="size-3.5" aria-hidden />
      You’re offline — changes won’t save
    </div>
  );
}
