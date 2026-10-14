'use client';

import { toast } from 'sonner';

// Fetch a file from an API route and save it. Errors surface as toasts.
export async function downloadFromApi(url: string, fallbackName: string): Promise<boolean> {
  const id = toast.loading('Preparing file…');
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || 'Export failed', { id });
      return false;
    }
    const disposition = res.headers.get('Content-Disposition') || '';
    const name = /filename="?([^"]+)"?/.exec(disposition)?.[1] || fallbackName;
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
    toast.success(`Downloaded ${name}`, { id });
    return true;
  } catch {
    toast.error('Export failed — check your connection', { id });
    return false;
  }
}
