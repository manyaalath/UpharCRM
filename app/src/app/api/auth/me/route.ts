import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/session';

export async function GET(request: Request) {
  const session = await getRequestSession(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const { uid, role, name, email } = session;
  return NextResponse.json({ data: { uid, role, name, email } });
}
