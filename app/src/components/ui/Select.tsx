'use client';

import {
  Children, isValidElement, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState,
  type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from './cn';
import { controlBase, controlScale, type Scale } from './Field';

// ============================================================
// Select — a styled, searchable replacement for the native <select>.
//
// Same call shape as before, so screens don't change:
//   <Select value={v} onChange={e => setV(e.target.value)}>
//     <option value="">All districts</option>
//     {list.map(d => <option key={d} value={d}>{d}</option>)}
//   </Select>
//
// Desktop: a popover anchored to the trigger. Phones: a bottom sheet with
// large rows. Lists longer than SEARCH_FROM get a search box. Typing on the
// closed trigger opens it with that text already in the search box.
// ============================================================

const SEARCH_FROM = 9;

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface ChangeLike {
  target: { value: string; name?: string };
}

export interface SelectProps {
  value?: string;
  onChange?: (e: ChangeLike) => void;
  children?: ReactNode;
  id?: string;
  name?: string;
  disabled?: boolean;
  className?: string;
  scale?: Scale;
  /** Shown when the value matches no option. */
  placeholder?: string;
  /** Force the search box on or off. Default: on for long lists. */
  searchable?: boolean;
  /** Called after the user picks an option (not when the list is just closed). */
  onCommit?: () => void;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
}

function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return '';
}

// Read <option> children (through fragments and arrays) into plain data.
function readOptions(children: ReactNode, out: Option[] = []): Option[] {
  Children.forEach(children, child => {
    if (!isValidElement<{ value?: string | number; disabled?: boolean; children?: ReactNode }>(child)) return;
    if (child.type === 'option') {
      const label = textOf(child.props.children);
      out.push({ value: String(child.props.value ?? label), label, disabled: child.props.disabled });
    } else {
      readOptions(child.props.children, out);
    }
  });
  return out;
}

const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;

export function Select({
  value = '', onChange, children, id, name, disabled, className, scale = 'md', placeholder, searchable, onCommit,
  'aria-label': ariaLabel, 'aria-invalid': ariaInvalid,
}: SelectProps) {
  const options = useMemo(() => readOptions(children), [children]);
  const selected = options.find(o => o.value === value);
  const withSearch = searchable ?? options.length >= SEARCH_FROM;

  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<CSSProperties | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const typeahead = useRef({ text: '', at: 0 });
  const listId = useId();

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    const starts = options.filter(o => o.label.toLowerCase().startsWith(q));
    const contains = options.filter(o => !o.label.toLowerCase().startsWith(q) && o.label.toLowerCase().includes(q));
    return [...starts, ...contains];
  }, [options, query]);

  const openList = useCallback((initialQuery = '') => {
    if (disabled) return;
    setSheet(isPhone());
    setQuery(initialQuery);
    setActive(initialQuery ? 0 : Math.max(0, options.findIndex(o => o.value === value)));
    setPos(null);
    setOpen(true);
  }, [disabled, options, value]);

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const pick = useCallback((opt: Option | undefined) => {
    if (!opt || opt.disabled) return;
    setOpen(false);
    triggerRef.current?.focus();
    if (opt.value !== value) onChange?.({ target: { value: opt.value, name } });
    if (onCommit) requestAnimationFrame(onCommit);
  }, [value, onChange, onCommit, name]);

  // Anchor the popover to the trigger; flip above when there is no room below.
  const place = useCallback(() => {
    const t = triggerRef.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight, gap = 4, edge = 8;
    const width = Math.min(Math.max(r.width, 200), vw - edge * 2);
    const left = Math.min(Math.max(edge, r.left), vw - width - edge);
    const below = vh - r.bottom - gap - edge;
    const above = r.top - gap - edge;
    const up = below < 220 && above > below;
    setPos({
      left, width,
      maxHeight: Math.max(140, Math.min(340, up ? above : below)),
      ...(up ? { bottom: vh - r.top + gap } : { top: r.bottom + gap }),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open || sheet) return;
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, sheet, place]);

  // Focus the search box (or the list) once the popover is on screen.
  useEffect(() => {
    if (!open) return;
    const t = requestAnimationFrame(() => (withSearch ? searchRef.current : listRef.current)?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(t);
  }, [open, withSearch, pos]);

  // Close on outside press.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const n = e.target as Node;
      if (popRef.current?.contains(n) || triggerRef.current?.contains(n)) return;
      close(false);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [open, close]);

  // Lock page scroll behind the phone sheet.
  useEffect(() => {
    if (!open || !sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open, sheet]);

  // Keep the highlighted row in view.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, shown.length, pos]);

  const move = (delta: number) => {
    if (!shown.length) return;
    setActive(a => {
      let i = a;
      for (let n = 0; n < shown.length; n++) {
        i = (i + delta + shown.length) % shown.length;
        if (!shown[i].disabled) return i;
      }
      return a;
    });
  };

  const onPopKeyDown = (e: ReactKeyboardEvent) => {
    // The popover is portalled, but React still bubbles its events to the
    // surrounding form/dialog. Keep them here.
    e.stopPropagation();
    e.nativeEvent.stopPropagation();
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(shown.length - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(shown[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'Tab') { e.preventDefault(); close(); }
    else if (!withSearch && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // First-letter jump for short lists without a search box.
      const now = Date.now();
      const buf = typeahead.current;
      buf.text = now - buf.at > 700 ? e.key : buf.text + e.key;
      buf.at = now;
      const hit = shown.findIndex(o => o.label.toLowerCase().startsWith(buf.text.toLowerCase()));
      if (hit >= 0) setActive(hit);
    }
  };

  const onTriggerKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (open || disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      openList();
    } else if (e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Start typing on the closed control to search straight away.
      e.preventDefault();
      if (withSearch) openList(e.key);
      else {
        const hit = options.find(o => !o.disabled && o.label.toLowerCase().startsWith(e.key.toLowerCase()));
        if (hit) pick(hit);
      }
    }
  };

  const label = selected ? selected.label : placeholder || 'Select';
  const muted = !selected || selected.value === '';
  const title = ariaLabel || placeholder || 'Choose';

  const list = (
    <div
      ref={listRef}
      id={listId}
      role="listbox"
      tabIndex={-1}
      aria-label={title}
      className={cn('overflow-y-auto overscroll-contain outline-none', sheet ? 'px-2 pb-2' : 'p-1')}
    >
      {shown.length === 0 ? (
        <div className="px-3 py-6 text-center text-[13px] text-ink-3">Nothing matches “{query.trim()}”</div>
      ) : (
        shown.map((o, i) => {
          const isSelected = o.value === value;
          return (
            <div
              key={`${o.value}-${i}`}
              role="option"
              data-index={i}
              aria-selected={isSelected}
              aria-disabled={o.disabled || undefined}
              onPointerMove={() => { if (active !== i) setActive(i); }}
              onClick={() => pick(o)}
              className={cn(
                'flex items-center gap-2 rounded-[5px] cursor-pointer select-none',
                sheet ? 'min-h-12 px-3 text-[15px]' : 'min-h-8 px-2.5 py-1.5 text-[13px]',
                i === active ? 'bg-sunken text-ink' : 'text-ink-2',
                isSelected && 'text-ink font-medium',
                o.value === '' && !isSelected && 'text-ink-3',
                o.disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span className="flex-1 min-w-0 break-words">{o.label}</span>
              {isSelected && <Check className="size-4 shrink-0 text-accent" aria-hidden />}
            </div>
          );
        })
      )}
    </div>
  );

  const search = withSearch && (
    <div className={cn('flex items-center gap-2 border-b border-line', sheet ? 'mx-4 mb-1 h-12' : 'px-2.5 h-9')}>
      <Search className="size-4 text-ink-3 shrink-0" aria-hidden />
      <input
        ref={searchRef}
        value={query}
        onChange={e => { setQuery(e.target.value); setActive(0); }}
        placeholder="Type to search"
        aria-label={`Search ${title}`}
        aria-controls={listId}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        className={cn('flex-1 min-w-0 bg-transparent text-ink placeholder:text-ink-3 outline-none focus-visible:outline-none', sheet ? 'text-[16px]' : 'text-[13px]')}
      />
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        name={name}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid || undefined}
        disabled={disabled}
        data-value={value}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          controlBase, controlScale[scale],
          'flex items-center gap-2 pl-3 md:pl-2.5 pr-2 text-left cursor-pointer disabled:cursor-not-allowed',
          open && 'border-accent ring-2 ring-accent/15',
          className
        )}
      >
        <span className={cn('flex-1 min-w-0 truncate', muted && 'text-ink-2')}>{label}</span>
        <ChevronDown className={cn('size-4 shrink-0 text-ink-3 transition-transform duration-150', open && 'rotate-180')} aria-hidden />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        sheet ? (
          <div className="fixed inset-0 z-[90]" onKeyDown={onPopKeyDown}>
            <div className="absolute inset-0 bg-ink/30 animate-fade-in" />
            <div
              ref={popRef}
              className="absolute inset-x-0 bottom-0 flex max-h-[78dvh] flex-col rounded-t-xl border-t border-line bg-surface pb-[var(--safe-b)] shadow-[var(--shadow-pop)] animate-sheet-up"
            >
              <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-line-strong" aria-hidden />
              <div className="flex items-center justify-between gap-3 pl-5 pr-2 pt-1.5 pb-1">
                <span className="text-[15px] font-semibold text-ink truncate">{title}</span>
                <button type="button" onClick={() => close()} className="grid size-10 place-items-center rounded-md text-ink-3 hover:bg-sunken" aria-label="Close">
                  <X className="size-5" />
                </button>
              </div>
              {search}
              {list}
            </div>
          </div>
        ) : (
          <div
            ref={popRef}
            onKeyDown={onPopKeyDown}
            style={pos ?? { visibility: 'hidden', top: 0, left: 0 }}
            className="fixed z-[90] flex flex-col overflow-hidden rounded-md border border-line bg-surface shadow-[var(--shadow-pop)] animate-pop-in"
          >
            {search}
            {list}
          </div>
        ),
        document.body
      )}
    </>
  );
}
