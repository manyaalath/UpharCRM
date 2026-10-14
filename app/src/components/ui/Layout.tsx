import type { ReactNode } from 'react';
import { cn } from './cn';

// Page wrapper: consistent gutters and max width.
export function Page({ children, className, wide }: { children: ReactNode; className?: string; wide?: boolean }) {
  return (
    <div className={cn('w-full mx-auto px-4 md:px-8 py-5 md:py-7 pb-24 md:pb-10', wide ? 'max-w-[1600px]' : 'max-w-[1280px]', className)}>
      {children}
    </div>
  );
}

// Serif page title + optional meta line + right-aligned actions.
export function PageHeader({
  title, description, actions, eyebrow,
}: {
  title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-5 md:mb-6">
      <div className="min-w-0">
        {eyebrow && <div className="text-[12px] font-medium text-ink-3 mb-1">{eyebrow}</div>}
        <h1 className="font-serif text-[26px] md:text-[30px] leading-tight font-semibold text-ink tracking-[-0.01em]">{title}</h1>
        {description && <p className="mt-1 text-[13.5px] text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

// Bordered white surface. No shadow — hairlines carry the structure.
export function Panel({ children, className, as: Tag = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' }) {
  return <Tag className={cn('bg-surface border border-line rounded-lg', className)}>{children}</Tag>;
}

export function PanelHeader({ title, meta, actions, className }: { title: ReactNode; meta?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 px-4 h-11 border-b border-line', className)}>
      <div className="flex items-baseline gap-2 min-w-0">
        <h2 className="text-[13.5px] font-semibold text-ink truncate">{title}</h2>
        {meta && <span className="text-[12px] text-ink-3 truncate">{meta}</span>}
      </div>
      {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
    </div>
  );
}

// KPI: label, big tabular number, optional sub-line.
export function Stat({ label, value, sub, href }: { label: ReactNode; value: ReactNode; sub?: ReactNode; href?: string }) {
  const body = (
    <>
      <div className="text-[12px] font-medium text-ink-2">{label}</div>
      <div className="mt-1 font-mono text-[26px] leading-none font-medium text-ink tabular">{value}</div>
      {sub && <div className="mt-1.5 text-[12px] text-ink-3">{sub}</div>}
    </>
  );
  const cls = 'block px-4 py-3.5 min-w-0';
  return href ? <a href={href} className={cn(cls, 'hover:bg-sunken/60 transition-colors')}>{body}</a> : <div className={cls}>{body}</div>;
}

// A row of Stats separated by hairlines (gap-px over a line-colored background).
const STRIP_COLS: Record<number, string> = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4', 5: 'md:grid-cols-5', 6: 'md:grid-cols-6' };
export function StatStrip({ children, cols = 4, className }: { children: ReactNode; cols?: 2 | 3 | 4 | 5 | 6; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-px bg-line border border-line rounded-lg overflow-hidden [&>*]:bg-surface', STRIP_COLS[cols], className)}>
      {children}
    </div>
  );
}

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center px-6 py-12', className)}>
      {icon && <div className="mb-3 text-ink-3 [&>svg]:size-6">{icon}</div>}
      <p className="text-[14px] font-medium text-ink">{title}</p>
      {description && <p className="mt-1 text-[13px] text-ink-2 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-sunken', className)} />;
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-sm border border-line-strong bg-surface font-mono text-[11px] text-ink-2">
      {children}
    </kbd>
  );
}
