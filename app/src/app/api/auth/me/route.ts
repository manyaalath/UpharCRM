import { NextResponse } from 'next/server';
import { getUserContext } from '@/lib/rbac';

// GET /api/auth/me — Return current user info
export async function GET(request: Request) {
  const ctx = await getUserContext(request);
  if (!ctx) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  return NextResponse.json({
    id: ctx.userId,
    name: ctx.name,
    email: ctx.email,
    role: ctx.role,
    districts: ctx.districts,
  });
}
