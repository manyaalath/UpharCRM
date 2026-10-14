// ============================================================
// Role → product routing and path access. Edge-safe (used by proxy).
// ============================================================
import type { Role } from './auth';

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  manager: 'Manager',
  telecaller: 'Telecaller',
  data_entry: 'Challan Entry',
  rep: 'Field Rep',
  books: 'Books',
};

// Where each role lands after login.
export function homeFor(role: Role): string {
  switch (role) {
    case 'admin':
    case 'manager':
      return '/dashboard';
    case 'telecaller':
      return '/follow-ups';
    case 'data_entry':
      return '/de';
    case 'books':
      return '/books';
    default:
      return '/no-access';
  }
}

const CRM_PAGES = ['/dashboard', '/daily-brief', '/leads', '/follow-ups', '/records', '/agents', '/notifications', '/users'];

const PAGE_ACCESS: Record<Role, string[]> = {
  admin: [...CRM_PAGES, '/de', '/books'],
  manager: ['/dashboard', '/daily-brief', '/leads', '/follow-ups', '/records', '/agents', '/de'],
  telecaller: ['/follow-ups', '/leads', '/records', '/daily-brief'],
  data_entry: ['/de'],
  books: ['/books'],
  rep: [],
};

// API prefixes each role may call. Admin gets everything.
const API_ACCESS: Record<Exclude<Role, 'admin'>, string[]> = {
  manager: [
    '/api/dashboard', '/api/ai', '/api/leads', '/api/follow-ups', '/api/call-feedback',
    '/api/lead-activities', '/api/challans', '/api/agents', '/api/specimen-books', '/api/books',
    '/api/export', '/api/import', '/api/search', '/api/whatsapp/simulate',
  ],
  telecaller: [
    '/api/ai/lead-summary', '/api/ai/daily-brief', '/api/leads', '/api/follow-ups', '/api/call-feedback',
    '/api/lead-activities', '/api/challans', '/api/agents', '/api/specimen-books', '/api/search',
  ],
  data_entry: ['/api/challans', '/api/agents', '/api/specimen-books', '/api/import', '/api/export'],
  books: ['/api/books', '/api/specimen-books'],
  rep: [],
};

// Always reachable by any signed-in user.
const SHARED_API = ['/api/auth/me'];

const matches = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(prefix + '/');

export function canAccessPage(role: Role, pathname: string): boolean {
  return PAGE_ACCESS[role].some(p => matches(pathname, p));
}

export function canAccessApi(role: Role, pathname: string): boolean {
  if (role === 'admin') return true;
  if (SHARED_API.some(p => matches(pathname, p))) return true;
  return API_ACCESS[role].some(p => matches(pathname, p));
}

// Public paths — no session needed.
export function isPublicPath(pathname: string): boolean {
  return (
    pathname === '/' ||
    matches(pathname, '/login') ||
    pathname === '/no-access' ||
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/register' ||
    pathname === '/api/auth/logout' ||
    // Called by Meta (webhook) and a scheduler (reminders) — these check their own secrets.
    pathname === '/api/whatsapp/webhook' ||
    pathname === '/api/whatsapp/process-reminders'
  );
}
