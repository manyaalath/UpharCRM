import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { type } = await request.json().catch(() => ({ type: 'crm' }));
  const res = NextResponse.json({ ok: true });

  if (type === 'de') {
    res.cookies.delete('de_auth');
  } else {
    res.cookies.delete('crm_auth');
  }

  return res;
}
