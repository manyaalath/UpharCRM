'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from './cn';

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
}

function Portal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}

// Right-side sheet. Full-screen on mobile.
export function Drawer({
  open, onClose, title, subtitle, actions, children, width = 'md:w-[520px]',
}: {
  open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; width?: string;
}) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-ink/25 animate-[fade_150ms_ease-out]" onClick={onClose} />
        <aside className={cn('absolute right-0 top-0 h-full w-full bg-surface border-l border-line flex flex-col shadow-[var(--shadow-pop)] animate-[slide_180ms_ease-out]', width)}>
          <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-line">
            <div className="min-w-0">
              <h2 className="font-serif text-[20px] font-semibold text-ink leading-tight truncate">{title}</h2>
              {subtitle && <div className="mt-0.5 text-[12.5px] text-ink-2">{subtitle}</div>}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {actions}
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close"><X className="size-4" /></Button>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </aside>
      </div>
      <style>{`@keyframes fade{from{opacity:0}}@keyframes slide{from{transform:translateX(24px);opacity:.6}}`}</style>
    </Portal>
  );
}

export function Dialog({
  open, onClose, title, description, children, footer, className,
}: {
  open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; children?: ReactNode; footer?: ReactNode; className?: string;
}) {
  useEscape(open, onClose);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) ref.current?.focus(); }, [open]);
  if (!open) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-ink/30" onClick={onClose} />
        <div ref={ref} tabIndex={-1} className={cn('relative w-full sm:max-w-md bg-surface border border-line rounded-t-lg sm:rounded-lg shadow-[var(--shadow-pop)] outline-none', className)}>
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
            {description && <p className="mt-1 text-[13px] text-ink-2">{description}</p>}
          </div>
          {children && <div className="px-5 pb-4">{children}</div>}
          {footer && <div className="flex justify-end gap-2 px-5 py-3 border-t border-line bg-sunken/50 rounded-b-lg">{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}

// Replacement for window.confirm().
export function ConfirmDialog({
  open, onClose, onConfirm, title, description, confirmLabel = 'Confirm', danger, loading,
}: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: ReactNode; description?: ReactNode; confirmLabel?: string; danger?: boolean; loading?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    />
  );
}
