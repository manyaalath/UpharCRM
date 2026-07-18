import { type NextRequest, NextResponse } from 'next/server';
import { verifyCookie } from '@/lib/auth';

// Returns true if the token is a valid signed session cookie.
async function isValidToken(token: string): Promise<boolean> {
  const payload = await verifyCookie(token);
  if (!payload) return false;
  return payload.startsWith('de:') || payload.startsWith('book:') || payload === 'crm';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths — no auth needed
  if (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth/') ||
    // Called by Meta (webhook) and a scheduler (reminders) — no session cookie.
    pathname === '/api/whatsapp/webhook' ||
    pathname === '/api/whatsapp/process-reminders'
  ) {
    return NextResponse.next();
  }

  // Try to authenticate from any cookie
  const deToken = request.cookies.get('de_auth')?.value;
  const bookToken = request.cookies.get('book_auth')?.value;
  const crmToken = request.cookies.get('crm_auth')?.value;

  let authed = false;
  if (deToken) authed = await isValidToken(deToken);
  if (!authed && bookToken) authed = await isValidToken(bookToken);
  if (!authed && crmToken) authed = await isValidToken(crmToken);

  // Data entry portal (/de, /de/*) — its own access flow
  if (pathname === '/de' || pathname.startsWith('/de/')) {
    if (!authed) {
      return NextResponse.redirect(new URL('/login/data-entry', request.url));
    }
    return NextResponse.next();
  }

  // Books portal (/books, /books/*) — its own access flow
  if (pathname === '/books' || pathname.startsWith('/books/')) {
    if (!authed) {
      return NextResponse.redirect(new URL('/login/books', request.url));
    }
    return NextResponse.next();
  }

  // API routes — check auth
  if (pathname.startsWith('/api/')) {
    if (!authed) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // App routes — check auth
  if (!authed) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
