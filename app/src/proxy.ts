import { type NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';
import { canAccessApi, canAccessPage, homeFor, isPublicPath } from '@/lib/access';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  // Root and login: send signed-in users straight to their product.
  if (pathname === '/' || pathname === '/login') {
    if (session) return NextResponse.redirect(new URL(homeFor(session.role), request.url));
    if (pathname === '/') return NextResponse.redirect(new URL('/login', request.url));
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    if (!canAccessApi(session.role, pathname)) {
      return NextResponse.json({ error: 'You do not have access to this resource' }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (!session) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (!canAccessPage(session.role, pathname)) {
    return NextResponse.redirect(new URL(homeFor(session.role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
