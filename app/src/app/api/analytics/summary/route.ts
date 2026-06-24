import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  const today = new Date().toISOString().split('T')[0];

  const [
    { count: totalChallans },
    { count: totalLeads },
    { count: pendingFollowups },
    challanSpecimens,
    districts,
  ] = await Promise.all([
    supabase.from('challans').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    // Pending follow-ups: pending status + overdue (date < today)
    supabase.from('follow_ups').select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    // Books distributed: count total specimens across all challans
    supabase.from('challans').select('specimens_given'),
    // Districts covered: unique districts
    supabase.from('challans').select('district'),
  ]);

  // Calculate total books distributed (sum of all specimen arrays)
  let booksDistributed = 0;
  (challanSpecimens.data || []).forEach(c => {
    if (Array.isArray(c.specimens_given)) {
      booksDistributed += c.specimens_given.length;
    }
  });

  // Calculate unique districts
  const uniqueDistricts = new Set((districts.data || []).map(c => c.district)).size;

  return NextResponse.json({
    total_challans: totalChallans || 0,
    total_leads: totalLeads || 0,
    pending_followups: pendingFollowups || 0,
    books_distributed: booksDistributed,
    districts_covered: uniqueDistricts,
  });
}
