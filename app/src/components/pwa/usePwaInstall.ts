'use client';

import { useCallback, useSyncExternalStore } from 'react';

// Chrome/Edge/Android fire `beforeinstallprompt`; we keep the event and show our
// own button. iOS Safari never fires it — there the user installs from the
// Share menu, so we can only show instructions.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface State {
  canPrompt: boolean;  // a native install prompt is ready
  ios: boolean;        // iPhone/iPad browser, not yet installed
  installed: boolean;  // running as an installed app
}

const SERVER: State = { canPrompt: false, ios: false, installed: false };

let deferred: BeforeInstallPromptEvent | null = null;
let state: State = SERVER;
let started = false;
const listeners = new Set<() => void>();

function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach(l => l());
}

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const ua = navigator.userAgent;
  const iosDevice = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  state = { canPrompt: false, ios: iosDevice && !standalone, installed: standalone };

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    set({ canPrompt: true });
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    set({ canPrompt: false, installed: true, ios: false });
  });
}

function subscribe(cb: () => void) {
  start();
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

const getSnapshot = () => state;
const getServerSnapshot = () => SERVER;

export function usePwaInstall() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Returns true when the app was installed.
  const install = useCallback(async () => {
    if (!deferred) return false;
    const event = deferred;
    await event.prompt();
    const { outcome } = await event.userChoice;
    deferred = null; // a prompt event can only be used once
    set({ canPrompt: false });
    return outcome === 'accepted';
  }, []);

  return { ...s, available: !s.installed && (s.canPrompt || s.ios), install };
}
