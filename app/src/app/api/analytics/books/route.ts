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

  // Get book distribution via normalized schema: challan_books → challans → leads
  const { data: challanBooks, error } = await supabase
    .from('challan_books')
    .select('quantity, books(title), challan_id, challans!inner(lead_id, leads!inner(institute_contacts!inner(institutes!inner(locations!inner(district)))))');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aggregate book-wise distribution
  const bookStats: Record<string, { distribution_count: number; lead_ids: Set<string> }> = {};

  (challanBooks || []).forEach((cb: Record<string, unknown>) => {
    const books = cb.books as { title?: string } | undefined;
    const bookName = books?.title;
    if (!bookName) return;

    const challan = cb.challans as Record<string, unknown> | undefined;
    const lead = challan?.leads as Record<string, unknown> | undefined;
    const ic = lead?.institute_contacts as Record<string, unknown> | undefined;
    const inst = ic?.institutes as Record<string, unknown> | undefined;
    const loc = inst?.locations as { district?: string } | undefined;
    const district = loc?.district;

    // Apply district filter
    if (districtFilter && district && !districtFilter.includes(district)) return;

    if (!bookStats[bookName]) {
      bookStats[bookName] = { distribution_count: 0, lead_ids: new Set() };
    }
    bookStats[bookName].distribution_count += (cb.quantity as number) || 1;
    const leadId = challan?.lead_id as string;
    if (leadId) bookStats[bookName].lead_ids.add(leadId);
  });

  const data = Object.entries(bookStats)
    .map(([book_name, stats]) => ({
      book_name,
      distribution_count: stats.distribution_count,
      unique_leads: stats.lead_ids.size,
      repeat_count: Math.max(0, stats.distribution_count - stats.lead_ids.size),
    }))
    .sort((a, b) => b.distribution_count - a.distribution_count);

  return NextResponse.json({ data });
}
