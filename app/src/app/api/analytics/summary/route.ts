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

  // If manager with no assigned districts, return zeros
  if (districtFilter && districtFilter.length === 0) {
    return NextResponse.json({
      total_challans: 0,
      total_leads: 0,
      pending_followups: 0,
      books_distributed: 0,
      districts_covered: 0,
    });
  }

  // For admin (no district filter), use simple counts
  // For managers, we need to filter by district through the join chain
  if (!districtFilter) {
    // Admin — full access
    const [
      { count: totalChallans },
      { count: totalLeads },
      { count: pendingFollowups },
    ] = await Promise.all([
      supabase.from('challans').select('*', { count: 'exact', head: true }),
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase.from('follow_ups').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    // Books distributed from challan_books
    const { data: bookCounts } = await supabase
      .from('challan_books')
      .select('quantity');
    const booksDistributed = (bookCounts || []).reduce((sum, cb) => sum + (cb.quantity || 0), 0);

    // Districts covered
    const { data: locations } = await supabase
      .from('locations')
      .select('district');
    const uniqueDistricts = new Set((locations || []).map(l => l.district)).size;

    return NextResponse.json({
      total_challans: totalChallans || 0,
      total_leads: totalLeads || 0,
      pending_followups: pendingFollowups || 0,
      books_distributed: booksDistributed,
      districts_covered: uniqueDistricts,
    });
  } else {
    // Manager — scoped to assigned districts via materialized view
    const { data: districtStats } = await supabase
      .from('mv_district_stats')
      .select('*')
      .in('district', districtFilter);

    const stats = districtStats || [];
    return NextResponse.json({
      total_challans: stats.reduce((sum, s) => sum + (s.challan_count || 0), 0),
      total_leads: stats.reduce((sum, s) => sum + (s.lead_count || 0), 0),
      pending_followups: stats.reduce((sum, s) => sum + (s.followup_count || 0), 0),
      books_distributed: 0, // Would need a more complex query — leave as 0 for now
      districts_covered: stats.length,
    });
  }
}
