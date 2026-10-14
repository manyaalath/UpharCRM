import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from './cn';

const control =
  'w-full bg-surface border border-line-strong rounded-md text-[13.5px] text-ink placeholder:text-ink-3 ' +
  'transition-colors hover:border-ink-3 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 ' +
  'disabled:bg-sunken disabled:text-ink-3 aria-[invalid=true]:border-bad';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { leading?: ReactNode }>(
  function Input({ className, leading, ...rest }, ref) {
    if (!leading) return <input ref={ref} className={cn(control, 'h-8.5 px-2.5', className)} {...rest} />;
    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3 [&>svg]:size-4">{leading}</span>
        <input ref={ref} className={cn(control, 'h-8.5 pl-8 pr-2.5', className)} {...rest} />
      </div>
    );
  }
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest },
  ref
) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(control, 'h-8.5 pl-2.5 pr-8 appearance-none cursor-pointer', className)} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-ink-3" aria-hidden />
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...rest },
  ref
) {
  return <textarea ref={ref} className={cn(control, 'px-2.5 py-2 min-h-[72px]', className)} {...rest} />;
});

export function Label({ children, htmlFor, required, className }: { children: ReactNode; htmlFor?: string; required?: boolean; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn('block text-[12.5px] font-medium text-ink-2 mb-1', className)}>
      {children}
      {required && <span className="text-accent ml-0.5">*</span>}
    </label>
  );
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="mt-1 text-[12px] text-bad">{children}</p>;
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
