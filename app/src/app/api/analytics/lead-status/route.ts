import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getUserContext, getDistrictFilter } from '@/lib/rbac';

export async function GET(request: Request) {
  const ctx = await getUserContext(request);
  if (!ctx) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Only admin and manager can access analytics
  if (!['admin', 'manager'].includes(ctx.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const supabase = await createClient();
  const districtFilter = getDistrictFilter(ctx);

  // Manager with no assigned districts — return empty
  if (districtFilter && districtFilter.length === 0) {
    return NextResponse.json({ data: [] });
  }

  // Get leads with status and district info
  let query = supabase
    .from('leads')
    .select('status, institute_contacts!inner(institutes!inner(locations!inner(district)))');

  const { data: leads, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const statusCounts: Record<string, number> = {};
  (leads || []).forEach((l: Record<string, unknown>) => {
    const status = l.status as string;
    if (status === 'converted') return; // Skip 'converted' status (removed from PRD)

    // Apply district filter
    const ic = l.institute_contacts as Record<string, unknown> | undefined;
    const inst = ic?.institutes as Record<string, unknown> | undefined;
    const loc = inst?.locations as { district?: string } | undefined;
    const district = loc?.district;

    if (districtFilter && district && !districtFilter.includes(district)) return;

    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  const data = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

  return NextResponse.json({ data });
}
