'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from './cn';

// Escape closes; page scroll is locked while an overlay is open.
export function useOverlay(open: boolean, onClose: () => void) {
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

// Overlays only open after user interaction, so document always exists by then.
function Portal({ children }: { children: ReactNode }) {
  return typeof document === 'undefined' ? null : createPortal(children, document.body);
}

// Right-side sheet. Full-screen on mobile.
export function Drawer({
  open, onClose, title, subtitle, actions, children, width = 'md:w-[520px]',
}: {
  open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; width?: string;
}) {
  useOverlay(open, onClose);
  if (!open) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-ink/25 animate-fade-in" onClick={onClose} />
        <aside className={cn('absolute right-0 top-0 h-full w-full bg-surface md:border-l border-line flex flex-col shadow-[var(--shadow-pop)] animate-slide-in', width)}>
          <header className="flex items-start justify-between gap-3 pl-5 pr-3 pb-3.5 pt-[calc(var(--safe-t)+0.875rem)] border-b border-line">
            <div className="min-w-0 pt-0.5">
              <h2 className="font-serif text-[20px] font-semibold text-ink leading-tight">{title}</h2>
              {subtitle && <div className="mt-0.5 text-[12.5px] text-ink-2">{subtitle}</div>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {actions}
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close"><X className="size-4.5" /></Button>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto overscroll-contain pb-[var(--safe-b)]">{children}</div>
        </aside>
      </div>
    </Portal>
  );
}

// Centered dialog on desktop, bottom sheet on phones. The body scrolls; the footer stays put.
export function Dialog({
  open, onClose, title, description, children, footer, className,
}: {
  open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; children?: ReactNode; footer?: ReactNode; className?: string;
}) {
  useOverlay(open, onClose);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) ref.current?.focus(); }, [open]);
  if (!open) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-ink/30 animate-fade-in" onClick={onClose} />
        <div
          ref={ref}
          tabIndex={-1}
          className={cn(
            'relative flex w-full max-h-[92dvh] sm:max-h-[min(88dvh,720px)] flex-col sm:max-w-md bg-surface border border-line',
            'rounded-t-xl sm:rounded-lg shadow-[var(--shadow-pop)] outline-none animate-sheet-up sm:animate-pop-in',
            className
          )}
        >
          <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line-strong sm:hidden" aria-hidden />
          <div className="flex items-start justify-between gap-3 pl-5 pr-3 pt-3 sm:pt-4 pb-3">
            <div className="min-w-0 pt-1">
              <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
              {description && <p className="mt-1 text-[13px] text-ink-2">{description}</p>}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close" className="-mt-0.5"><X className="size-4.5" /></Button>
          </div>
          {children && <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>}
          {footer && (
            <div className="flex shrink-0 justify-end gap-2 px-5 pt-3 pb-[calc(var(--safe-b)+0.75rem)] sm:pb-3 border-t border-line [&>*]:flex-1 sm:[&>*]:flex-none">
              {footer}
            </div>
          )}
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
