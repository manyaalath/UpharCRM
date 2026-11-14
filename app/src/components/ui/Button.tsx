import Link from 'next/link';
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet-danger';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const base =
  'inline-flex items-center justify-center gap-1.5 font-medium whitespace-nowrap rounded-md select-none ' +
  'transition-[background-color,border-color,color,transform] duration-100 active:translate-y-px ' +
  'disabled:opacity-50 disabled:pointer-events-none';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover active:bg-accent-hover',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-sunken hover:border-ink-3 active:bg-sunken',
  ghost: 'text-ink-2 hover:bg-sunken hover:text-ink active:bg-line',
  danger: 'bg-bad text-white hover:brightness-95 active:brightness-90',
  'quiet-danger': 'text-bad hover:bg-bad-soft active:bg-bad-soft',
};

// Touch screens get taller targets; desktop stays dense.
const sizes: Record<Size, string> = {
  sm: 'h-9 md:h-7.5 px-3 md:px-2.5 text-[13px] md:text-[12.5px]',
  md: 'h-10 md:h-9 px-3.5 text-[14px] md:text-[13px]',
  lg: 'h-11 px-5 text-[15px] md:text-[14px]',
  icon: 'size-10 md:size-9 text-[13px] shrink-0',
};

export function buttonClass(variant: Variant = 'secondary', size: Size = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, icon, className, children, disabled, type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

interface LinkButtonProps extends ComponentProps<typeof Link> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export function LinkButton({ variant = 'secondary', size = 'md', icon, className, children, ...rest }: LinkButtonProps) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

// Small toggle pill: quick dates, call outcomes, any pick-one-of-a-few choice.
export function Chip({
  selected, className, children, type = 'button', ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        'inline-flex items-center gap-1.5 h-9 md:h-8 px-3 rounded-md border text-[13px] md:text-[12.5px] whitespace-nowrap',
        'transition-colors disabled:opacity-50 disabled:pointer-events-none',
        selected
          ? 'border-accent bg-accent-soft text-ink font-medium'
          : 'border-line-strong bg-surface text-ink-2 hover:bg-sunken hover:text-ink',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
