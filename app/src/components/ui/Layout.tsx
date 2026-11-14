import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from './cn';
import type { Tone } from './Badge';

// Page wrapper: consistent gutters and max width. Bottom padding clears the mobile tab bar.
export function Page({ children, className, wide }: { children: ReactNode; className?: string; wide?: boolean }) {
  return (
    <div
      className={cn(
        'w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-7 pb-[calc(var(--nav-h)+var(--safe-b)+2rem)] md:pb-10',
        wide ? 'max-w-[1600px]' : 'max-w-[1280px]',
        className
      )}
    >
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
    <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-5 md:mb-6">
      <div className="min-w-0">
        {eyebrow && <div className="text-[12px] font-medium text-ink-3 mb-1">{eyebrow}</div>}
        <h1 className="font-serif text-[26px] md:text-[30px] leading-tight font-semibold text-ink tracking-[-0.01em] text-balance">{title}</h1>
        {description && <div className="mt-1 text-[13.5px] text-ink-2">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div>}
    </header>
  );
}

// Bordered white surface. No shadow — hairlines carry the structure.
// Never put a Panel (or any bordered rounded box) inside another Panel.
export function Panel({ children, className, as: Tag = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' | 'aside' }) {
  return <Tag className={cn('bg-surface border border-line rounded-lg', className)}>{children}</Tag>;
}

export function PanelHeader({ title, meta, actions, className }: { title: ReactNode; meta?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 px-4 min-h-11 py-1.5 border-b border-line', className)}>
      <div className="flex flex-wrap items-baseline gap-x-2 min-w-0">
        <h2 className="text-[13.5px] font-semibold text-ink">{title}</h2>
        {meta && <span className="text-[12px] text-ink-3 min-w-0">{meta}</span>}
      </div>
      {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
    </div>
  );
}

// A titled block inside a Panel. Stack several; hairlines separate them.
export function PanelSection({ title, meta, actions, children, className }: { title?: ReactNode; meta?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('px-4 py-4 border-t border-line first:border-t-0', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <h3 className="flex items-baseline gap-2 text-[12.5px] font-semibold text-ink-2">
            {title}
            {meta && <span className="font-mono font-normal text-ink-3">{meta}</span>}
          </h3>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

// KPI: label, big tabular number, optional sub-line.
export function Stat({ label, value, sub, href }: { label: ReactNode; value: ReactNode; sub?: ReactNode; href?: string }) {
  const body = (
    <>
      <div className="text-[12px] font-medium text-ink-2">{label}</div>
      <div className="mt-1 font-mono text-[24px] md:text-[26px] leading-none font-medium text-ink tabular">{value}</div>
      {sub && <div className="mt-1.5 text-[12px] text-ink-3">{sub}</div>}
    </>
  );
  const cls = 'block px-4 py-3.5 min-w-0';
  return href
    ? <Link href={href} className={cn(cls, 'hover:bg-sunken/60 active:bg-sunken transition-colors')}>{body}</Link>
    : <div className={cls}>{body}</div>;
}

// A row of Stats separated by hairlines (gap-px over a line-colored background).
// An odd last tile spans the full row on phones so there is no empty cell.
const STRIP_COLS: Record<number, string> = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4', 5: 'md:grid-cols-5', 6: 'md:grid-cols-6' };
export function StatStrip({ children, cols = 4, className }: { children: ReactNode; cols?: 2 | 3 | 4 | 5 | 6; className?: string }) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-px bg-line border border-line rounded-lg overflow-hidden [&>*]:bg-surface',
        '[&>*:last-child:nth-child(odd)]:col-span-2 md:[&>*:last-child:nth-child(odd)]:col-span-1',
        STRIP_COLS[cols], className
      )}
    >
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

// ---- Segmented control: pick one view. A sunken track with a raised thumb. ----

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
}

export function Segmented<T extends string>({
  value, onChange, options, label, size = 'md', full, className,
}: {
  value: T; onChange: (v: T) => void; options: SegmentOption<T>[]; label: string; size?: 'sm' | 'md'; full?: boolean; className?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={cn('inline-flex rounded-md bg-sunken p-0.5', full && 'flex w-full sm:inline-flex sm:w-auto', className)}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-[5px] font-medium whitespace-nowrap transition-colors',
              size === 'sm' ? 'h-8 md:h-7 px-2.5 text-[12.5px]' : 'h-9 md:h-8 px-3 text-[13px]',
              full && 'flex-1 sm:flex-none',
              on ? 'bg-surface text-ink shadow-[var(--shadow-raise)]' : 'text-ink-2 hover:text-ink'
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ---- Underline tabs: switch what a list shows. Scrolls sideways on phones. ----

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  count?: number | null;
  countTone?: 'bad' | 'warn' | 'accent';
}

const COUNT_TONE = { bad: 'text-bad', warn: 'text-warn', accent: 'text-accent' };

export function Tabs<T extends string>({
  value, onChange, items, label, className,
}: {
  value: T; onChange: (v: T) => void; items: TabItem<T>[]; label: string; className?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={cn('flex gap-5 border-b border-line overflow-x-auto no-scrollbar', className)}>
      {items.map(t => {
        const on = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.value)}
            className={cn(
              '-mb-px h-10 shrink-0 border-b-2 text-[13.5px] font-medium whitespace-nowrap transition-colors',
              on ? 'border-accent text-ink' : 'border-transparent text-ink-2 hover:text-ink'
            )}
          >
            {t.label}
            {t.count != null && (
              <span className={cn('ml-1.5 font-mono text-[12px]', t.count > 0 && t.countTone ? COUNT_TONE[t.countTone] : 'text-ink-3')}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---- Callout: a note inside a surface. A left rule, not another box. ----

const CALLOUT_RULE: Record<Tone, string> = {
  neutral: 'border-line-strong',
  ok: 'border-ok',
  warn: 'border-warn',
  bad: 'border-bad',
  info: 'border-info',
  accent: 'border-accent',
};
const CALLOUT_ICON: Record<Tone, string> = {
  neutral: 'text-ink-3',
  ok: 'text-ok',
  warn: 'text-warn',
  bad: 'text-bad',
  info: 'text-info',
  accent: 'text-accent',
};

export function Callout({
  tone = 'neutral', icon, title, children, className,
}: {
  tone?: Tone; icon?: ReactNode; title?: ReactNode; children?: ReactNode; className?: string;
}) {
  return (
    <div className={cn('border-l-2 pl-3 py-0.5', CALLOUT_RULE[tone], className)}>
      {title && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium text-ink">
          {icon && <span className={cn('[&>svg]:size-4', CALLOUT_ICON[tone])}>{icon}</span>}
          {title}
        </div>
      )}
      {children && <div className={cn('text-[13px] text-ink-2', !!title && 'mt-1')}>{children}</div>}
    </div>
  );
}
