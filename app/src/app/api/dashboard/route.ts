import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { computeAnalytics, filtersFromParams } from './analytics';

export const dynamic = 'force-dynamic';

// GET /api/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD&district=Patna
// Read-only. All numbers are computed live over every row.
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const data = await computeAnalytics(supabase, filtersFromParams(new URL(request.url).searchParams));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 });
  }
}
