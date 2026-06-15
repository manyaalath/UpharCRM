import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  const [
    { count: totalChallans },
    { data: institutions },
    { count: totalLeads },
    { count: pendingFollowups },
    { count: notContacted },
    { count: thisMonth },
  ] = await Promise.all([
    supabase.from('challans').select('*', { count: 'exact', head: true }),
    supabase.from('challans').select('institute_name'),
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'followup_pending'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('challans').select('*', { count: 'exact', head: true })
      .gte('challan_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
  ]);

  const uniqueInstitutions = new Set((institutions || []).map(c => c.institute_name)).size;

  return NextResponse.json({
    total_challans: totalChallans || 0,
    total_institutions: uniqueInstitutions,
    total_leads: totalLeads || 0,
    leads_pending_followup: pendingFollowups || 0,
    leads_not_contacted: notContacted || 0,
    challans_this_month: thisMonth || 0,
  });
}
