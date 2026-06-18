import { type NextRequest, NextResponse } from 'next/server';
import { verifyCookie } from '@/lib/auth';

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

  // Data entry portal (/de/*)
  if (pathname.startsWith('/de')) {
    const token = request.cookies.get('de_auth')?.value;
    if (!token) return NextResponse.redirect(new URL('/login/data-entry', request.url));
    const payload = await verifyCookie(token);
    if (!payload?.startsWith('de:')) {
      const res = NextResponse.redirect(new URL('/login/data-entry', request.url));
      res.cookies.delete('de_auth');
      return res;
    }
    return NextResponse.next();
  }

  // Shared API Routes (for both DE and CRM)
  if (
    pathname.startsWith('/api/agents') ||
    pathname.startsWith('/api/challans') ||
    pathname.startsWith('/api/specimen-books')
  ) {
    const deToken = request.cookies.get('de_auth')?.value;
    const crmToken = request.cookies.get('crm_auth')?.value;

    let authorized = false;
    if (deToken) {
      const payload = await verifyCookie(deToken);
      if (payload?.startsWith('de:')) authorized = true;
    }
    if (!authorized && crmToken) {
      const payload = await verifyCookie(crmToken);
      if (payload === 'crm') authorized = true;
    }

    if (!authorized) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // Everything else = CRM (dashboard, leads, records, agents, api/*)
  const token = request.cookies.get('crm_auth')?.value;
  if (!token) return NextResponse.redirect(new URL('/login', request.url));
  const payload = await verifyCookie(token);
  if (payload !== 'crm') {
    const res = NextResponse.redirect(new URL('/login', request.url));
    res.cookies.delete('crm_auth');
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
