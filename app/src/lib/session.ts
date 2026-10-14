// Server-only session helpers for layouts, pages and route handlers.
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, verifySession, type Role, type Session } from './auth';
import { createClient } from './supabase/server';
import { homeFor } from './access';

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

// Session from a route handler request (same cookie, no next/headers needed).
export async function getRequestSession(request: Request): Promise<Session | null> {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.split(/;\s*/).find(c => c.startsWith(`${SESSION_COOKIE}=`));
  return verifySession(match ? decodeURIComponent(match.slice(SESSION_COOKIE.length + 1)) : null);
}

// Re-checks the account in the database so a rejected or deactivated
// user loses access on their next page load, not when the cookie expires.
async function isStillActive(session: Session): Promise<boolean> {
  if (session.src === 'env') return true;
  const supabase = await createClient();
  if (session.src === 'books') {
    const { data, error } = await supabase.from('book_entry_users').select('status').eq('id', session.uid).maybeSingle();
    if (error) return true; // DB hiccup: don't log everyone out
    return data?.status === 'approved';
  }
  const { data, error } = await supabase
    .from('data_entry_users')
    .select('status, is_active, role')
    .eq('id', session.uid)
    .maybeSingle();
  if (error) return true;
  return data?.status === 'approved' && data?.is_active !== false && data?.role === session.role;
}

// Use at the top of protected layouts.
export async function requireSession(roles?: Role[]): Promise<Session> {
  const session = await getSession();
  if (!session) redirect('/login');
  if (roles && !roles.includes(session.role)) redirect(homeFor(session.role));
  // Clear the cookie via the logout route, otherwise /login would bounce back here.
  if (!(await isStillActive(session))) redirect('/api/auth/logout?reason=revoked');
  return session;
}
