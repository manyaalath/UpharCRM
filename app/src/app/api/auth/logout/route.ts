import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { type } = await request.json().catch(() => ({ type: 'all' }));
  const res = NextResponse.json({ ok: true });

  // Clear all auth cookies
  if (type === 'de') {
    res.cookies.delete('de_auth');
    res.cookies.delete('app_auth');
  } else if (type === 'book') {
    res.cookies.delete('book_auth');
  } else if (type === 'crm') {
    res.cookies.delete('crm_auth');
    res.cookies.delete('app_auth');
  } else {
    // Clear all
    res.cookies.delete('crm_auth');
    res.cookies.delete('de_auth');
    res.cookies.delete('book_auth');
    res.cookies.delete('app_auth');
  }

  return res;
}
