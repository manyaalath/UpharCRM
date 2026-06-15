import { NextResponse } from 'next/server';
import { signCookie, COOKIE_OPTS } from '@/lib/auth';

export async function POST(request: Request) {
  const { password } = await request.json();

  const expected = process.env.CRM_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  if (password !== expected) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const token = await signCookie('crm');
  const res = NextResponse.json({ ok: true });
  res.cookies.set('crm_auth', token, COOKIE_OPTS);
  return res;
}
