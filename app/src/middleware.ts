import { type NextRequest, NextResponse } from 'next/server';
import { verifyCookie } from '@/lib/auth';

// Route-level role restrictions
// If a route is not listed here, it's accessible to all authenticated users.
const ROUTE_ROLES: Record<string, string[]> = {
  '/dashboard': ['admin', 'manager'],
  '/daily-brief': ['admin', 'manager'],
  '/leads': ['admin', 'manager', 'data_entry', 'telecaller'],
  '/follow-ups': ['admin', 'manager', 'telecaller'],
  '/records': ['admin', 'manager', 'data_entry'],
  '/agents': ['admin', 'manager', 'data_entry'],
  '/notifications': ['admin', 'manager', 'telecaller'],
  '/users': ['admin'],
  '/import': ['admin', 'data_entry', 'manager'],
  '/data-entry': ['admin', 'data_entry', 'manager'],
};

async function getUserFromToken(token: string): Promise<{ id: string; role: string } | null> {
  const payload = await verifyCookie(token);
  if (!payload) return null;

  if (payload.startsWith('user:')) {
    // New unified format — we need to look up the role
    // Since middleware runs on the edge, we can't easily query DB.
    // We'll encode role in the cookie payload going forward.
    // For now, let the request through and let API routes do role checks.
    return { id: payload.slice(5), role: 'authenticated' };
  }
  if (payload.startsWith('de:')) {
    return { id: payload.slice(3), role: 'data_entry' };
  }
  if (payload === 'crm') {
    return { id: 'legacy-admin', role: 'admin' };
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths — no auth needed
  if (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth/')
  ) {
    return NextResponse.next();
  }

  // Try to authenticate from any cookie
  const appToken = request.cookies.get('app_auth')?.value;
  const deToken = request.cookies.get('de_auth')?.value;
  const crmToken = request.cookies.get('crm_auth')?.value;

  let user: { id: string; role: string } | null = null;

  // Priority: app_auth > de_auth > crm_auth
  if (appToken) {
    user = await getUserFromToken(appToken);
  }
  if (!user && deToken) {
    user = await getUserFromToken(deToken);
  }
  if (!user && crmToken) {
    user = await getUserFromToken(crmToken);
  }

  // Data entry portal (/de/*) — keep backward compat
  if (pathname.startsWith('/de')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login/data-entry', request.url));
    }
    return NextResponse.next();
  }

  // API routes — check auth
  if (pathname.startsWith('/api/')) {
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    // Role-based API enforcement is done inside each API route handler
    return NextResponse.next();
  }

  // App routes — check auth
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
