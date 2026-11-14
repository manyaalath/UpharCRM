import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from './cn';

export type Scale = 'sm' | 'md' | 'lg';

// Shared look for every text control and the Select trigger.
export const controlBase =
  'w-full bg-surface border border-line-strong rounded-md text-ink placeholder:text-ink-3 ' +
  'transition-[border-color,box-shadow] hover:border-ink-3 ' +
  'focus:outline-none focus-visible:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 ' +
  'disabled:bg-sunken disabled:text-ink-3 disabled:hover:border-line-strong ' +
  'aria-[invalid=true]:border-bad aria-[invalid=true]:focus:ring-bad/15';

// 16px text on phones stops iOS from zooming the page on focus.
export const controlScale: Record<Scale, string> = {
  sm: 'h-9 md:h-7.5 text-[16px] md:text-[12.5px]',
  md: 'h-10 md:h-9 text-[16px] md:text-[13.5px]',
  lg: 'h-11 text-[16px] md:text-[14px]',
};

type InputProps = InputHTMLAttributes<HTMLInputElement> & { leading?: ReactNode; trailing?: ReactNode; scale?: Scale };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, leading, trailing, scale = 'md', ...rest },
  ref
) {
  if (!leading && !trailing) {
    return <input ref={ref} className={cn(controlBase, controlScale[scale], 'px-3 md:px-2.5', className)} {...rest} />;
  }
  return (
    <div className="relative">
      {leading && (
        <span className="pointer-events-none absolute left-3 md:left-2.5 top-1/2 -translate-y-1/2 text-ink-3 [&>svg]:size-4">{leading}</span>
      )}
      <input
        ref={ref}
        className={cn(controlBase, controlScale[scale], leading ? 'pl-9 md:pl-8' : 'pl-3 md:pl-2.5', trailing ? 'pr-10' : 'pr-3 md:pr-2.5', className)}
        {...rest}
      />
      {trailing && <span className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">{trailing}</span>}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...rest },
  ref
) {
  return <textarea ref={ref} className={cn(controlBase, 'px-3 md:px-2.5 py-2 min-h-[72px] text-[16px] md:text-[13.5px] leading-snug', className)} {...rest} />;
});

export function Label({ children, htmlFor, required, className }: { children: ReactNode; htmlFor?: string; required?: boolean; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn('block text-[12.5px] font-medium text-ink-2 mb-1', className)}>
      {children}
      {required && <span className="text-accent ml-0.5" aria-hidden>*</span>}
    </label>
  );
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p role="alert" className="mt-1 text-[12px] text-bad">{children}</p>;
}

export function Field({
  label, htmlFor, required, error, hint, children, className,
}: {
  label: ReactNode; htmlFor?: string; required?: boolean; error?: string; hint?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} required={required}>{label}</Label>
      {children}
      {error ? <FieldError>{error}</FieldError> : hint ? <p className="mt-1 text-[12px] text-ink-3">{hint}</p> : null}
    </div>
  );
}

// Two date inputs that read as one control: "from – to".
export function DateRange({
  from, to, onFrom, onTo, label, scale = 'md', className,
}: {
  from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void; label: string; scale?: Scale; className?: string;
}) {
  const input = 'min-w-0 flex-1 bg-transparent px-2 md:px-1.5 text-[16px] md:text-[12.5px] md:font-mono text-ink focus:outline-none focus-visible:outline-none';
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'flex items-center bg-surface border border-line-strong rounded-md transition-[border-color,box-shadow] hover:border-ink-3',
        'focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15',
        controlScale[scale], className
      )}
    >
      <input type="date" value={from} max={to || undefined} onChange={e => onFrom(e.target.value)} aria-label={`${label}: from`} className={cn(input, 'h-full pl-3 md:pl-2.5', !from && 'text-ink-3')} />
      <span className="text-ink-3 text-[12px] select-none" aria-hidden>–</span>
      <input type="date" value={to} min={from || undefined} onChange={e => onTo(e.target.value)} aria-label={`${label}: to`} className={cn(input, 'h-full', !to && 'text-ink-3')} />
    </div>
  );
}
