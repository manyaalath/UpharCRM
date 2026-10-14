// ============================================================
// Dates in India time. Never use new Date().toISOString().split('T')[0]
// for "today" — that is UTC and is yesterday until 05:30 IST.
// ============================================================

const TZ = 'Asia/Kolkata';

// YYYY-MM-DD for a Date, in IST.
export function isoDateIST(d: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export function todayIST(): string {
  return isoDateIST(new Date());
}

// YYYY-MM-DD n days from today (IST). Negative for the past.
export function addDaysIST(n: number, from: string = todayIST()): string {
  const [y, m, d] = from.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

// Whole days between two YYYY-MM-DD strings (b - a).
export function daysBetween(a: string, b: string): number {
  const toUTC = (s: string) => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((toUTC(b) - toUTC(a)) / 86_400_000);
}

// "15 Oct 2026"
export function formatDate(value?: string | Date | null): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value.length === 10 ? `${value}T00:00:00+05:30` : value) : value;
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

// "15 Oct, 3:42 pm"
export function formatDateTime(value?: string | Date | null): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { timeZone: TZ, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(d);
}

// "Today", "Yesterday", "In 3 days", "5 days ago", else a date.
export function relativeDay(value?: string | null): string {
  if (!value) return '—';
  const diff = daysBetween(todayIST(), value.slice(0, 10));
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0 && diff > -14) return `${-diff} days ago`;
  if (diff > 0 && diff < 14) return `In ${diff} days`;
  return formatDate(value);
}

// Start/end of an IST day as UTC ISO timestamps, for filtering timestamptz columns.
export function istDayBoundsUTC(day: string): { start: string; end: string } {
  return {
    start: new Date(`${day}T00:00:00+05:30`).toISOString(),
    end: new Date(`${day}T23:59:59.999+05:30`).toISOString(),
  };
}
