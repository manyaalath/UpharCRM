import { NextResponse } from 'next/server';
import { LEGACY_COOKIES, SESSION_COOKIE } from '@/lib/auth';

function clear(res: NextResponse) {
  res.cookies.delete(SESSION_COOKIE);
  LEGACY_COOKIES.forEach(c => res.cookies.delete(c));
  return res;
}

export async function POST() {
  return clear(NextResponse.json({ ok: true }));
}

// GET is used by server layouts to sign out a revoked account and land on /login.
export async function GET(request: Request) {
  const reason = new URL(request.url).searchParams.get('reason');
  const url = new URL('/login', request.url);
  if (reason) url.searchParams.set('reason', reason);
  return clear(NextResponse.redirect(url));
}
