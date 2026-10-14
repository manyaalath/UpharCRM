import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  COOKIE_OPTS, LEGACY_COOKIES, SESSION_COOKIE, signSession, timingSafeEqual, verifyPassword,
  type Role, type Session,
} from '@/lib/auth';
import { homeFor } from '@/lib/access';

const STAFF_ROLES: Role[] = ['admin', 'manager', 'telecaller', 'data_entry', 'rep'];

// Simple in-memory brute-force brake (per warm instance). Not a substitute for
// a shared store, but it stops naive password spraying against one instance.
const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

function throttled(key: string): boolean {
  const a = attempts.get(key);
  return !!a && a.count >= MAX_ATTEMPTS && a.until > Date.now();
}
function recordFailure(key: string) {
  const a = attempts.get(key);
  if (!a || a.until < Date.now()) attempts.set(key, { count: 1, until: Date.now() + WINDOW_MS });
  else a.count++;
}

type Outcome =
  | { kind: 'ok'; session: Omit<Session, 'exp'> }
  | { kind: 'pending' }
  | { kind: 'rejected' }
  | { kind: 'inactive' };

// POST /api/auth/login — one login for every product. The account's table
// and role decide where the user lands.
export async function POST(request: Request) {
  const { email: rawEmail, password } = await request.json().catch(() => ({}));
  const email = String(rawEmail || '').trim().toLowerCase();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const key = `${ip}|${email}`;
  if (throttled(key)) {
    return NextResponse.json({ error: 'Too many attempts. Try again in a few minutes.' }, { status: 429 });
  }

  const outcomes: Outcome[] = [];

  // 1. Bootstrap admin from env, so the owner is never locked out.
  const envEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const envPassword = process.env.CRM_PASSWORD;
  if (envEmail && envPassword && email === envEmail && timingSafeEqual(String(password), envPassword)) {
    outcomes.push({ kind: 'ok', session: { uid: 'env-admin', src: 'env', role: 'admin', name: 'Admin', email } });
  }

  const supabase = await createClient();

  // 2. Staff accounts (admin / manager / telecaller / challan entry).
  if (!outcomes.length) {
    const { data: staff } = await supabase
      .from('data_entry_users')
      .select('id, name, password_hash, status, role, is_active')
      .eq('email', email)
      .maybeSingle();
    if (staff && (await verifyPassword(String(password), staff.password_hash))) {
      if (staff.status === 'pending') outcomes.push({ kind: 'pending' });
      else if (staff.status === 'rejected') outcomes.push({ kind: 'rejected' });
      else if (staff.is_active === false) outcomes.push({ kind: 'inactive' });
      else {
        const role = (STAFF_ROLES.includes(staff.role as Role) ? staff.role : 'data_entry') as Role;
        outcomes.push({ kind: 'ok', session: { uid: staff.id, src: 'staff', role, name: staff.name, email } });
      }
    }
  }

  // 3. Books catalog accounts.
  if (!outcomes.some(o => o.kind === 'ok')) {
    const { data: book } = await supabase
      .from('book_entry_users')
      .select('id, name, password_hash, status')
      .eq('email', email)
      .maybeSingle();
    if (book && (await verifyPassword(String(password), book.password_hash))) {
      if (book.status === 'pending') outcomes.push({ kind: 'pending' });
      else if (book.status === 'rejected') outcomes.push({ kind: 'rejected' });
      else outcomes.push({ kind: 'ok', session: { uid: book.id, src: 'books', role: 'books', name: book.name, email } });
    }
  }

  const ok = outcomes.find((o): o is Extract<Outcome, { kind: 'ok' }> => o.kind === 'ok');
  if (ok) {
    attempts.delete(key);
    const token = await signSession(ok.session);
    const res = NextResponse.json({ status: 'approved', redirect: homeFor(ok.session.role), role: ok.session.role });
    res.cookies.set(SESSION_COOKIE, token, COOKIE_OPTS);
    LEGACY_COOKIES.forEach(c => res.cookies.delete(c));
    return res;
  }

  if (outcomes.some(o => o.kind === 'pending')) {
    return NextResponse.json({ status: 'pending' });
  }
  if (outcomes.some(o => o.kind === 'rejected')) {
    return NextResponse.json({ error: 'Your access request was rejected. Contact the admin.' }, { status: 403 });
  }
  if (outcomes.some(o => o.kind === 'inactive')) {
    return NextResponse.json({ error: 'This account has been deactivated. Contact the admin.' }, { status: 403 });
  }

  recordFailure(key);
  // Same message for unknown email and wrong password — don't leak which accounts exist.
  return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 });
}
