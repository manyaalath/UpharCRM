import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getUserContext, getDistrictFilter } from '@/lib/rbac';

export async function GET(request: Request) {
  const ctx = await getUserContext(request);
  if (!ctx) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Admin, manager, and telecaller can access follow-up queue
  if (!['admin', 'manager', 'telecaller'].includes(ctx.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const supabase = await createClient();
  const districtFilter = getDistrictFilter(ctx);
  const today = new Date().toISOString().split('T')[0];

  // Manager/telecaller with no assigned districts — return empty
  if (districtFilter && districtFilter.length === 0) {
    return NextResponse.json({
      due_today: [],
      overdue: [],
      upcoming: [],
      counts: { due_today: 0, overdue: 0, upcoming: 0 },
    });
  }

  // Build follow-up query with district info via normalized joins
  const selectClause = `
    id, followup_date, status, remarks,
    leads!inner(
      id, lead_seq_id, status,
      institute_contacts!inner(
        contacts(name, mobile_no),
        institutes!inner(name, locations!inner(district))
      )
    )
  `;

  // Due today
  let dueTodayQuery = supabase
    .from('follow_ups')
    .select(selectClause)
    .eq('followup_date', today)
    .eq('status', 'pending')
    .order('followup_date', { ascending: true })
    .limit(20);

  if (districtFilter && districtFilter.length > 0) {
    dueTodayQuery = dueTodayQuery.in('leads.institute_contacts.institutes.locations.district', districtFilter);
  }

  // Overdue
  let overdueQuery = supabase
    .from('follow_ups')
    .select(selectClause)
    .lt('followup_date', today)
    .in('status', ['pending', 'overdue'])
    .order('followup_date', { ascending: true })
    .limit(20);

  if (districtFilter && districtFilter.length > 0) {
    overdueQuery = overdueQuery.in('leads.institute_contacts.institutes.locations.district', districtFilter);
  }

  // Upcoming (next 7 days)
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  let upcomingQuery = supabase
    .from('follow_ups')
    .select(selectClause)
    .gt('followup_date', today)
    .lte('followup_date', nextWeekStr)
    .eq('status', 'pending')
    .order('followup_date', { ascending: true })
    .limit(20);

  if (districtFilter && districtFilter.length > 0) {
    upcomingQuery = upcomingQuery.in('leads.institute_contacts.institutes.locations.district', districtFilter);
  }

  const [dueToday, overdue, upcoming] = await Promise.all([
    dueTodayQuery,
    overdueQuery,
    upcomingQuery,
  ]);

  // Transform results to include flattened lead info
  const transformFollowUp = (f: Record<string, unknown>) => {
    const lead = f.leads as Record<string, unknown> | undefined;
    const ic = lead?.institute_contacts as Record<string, unknown> | undefined;
    const contact = ic?.contacts as { name?: string; mobile_no?: string } | undefined;
    const institute = ic?.institutes as { name?: string; locations?: { district?: string } } | undefined;

    return {
      id: f.id,
      followup_date: f.followup_date,
      status: f.status,
      remarks: f.remarks,
      lead_id: lead?.id,
      lead_seq_id: lead?.lead_seq_id,
      contact_person: contact?.name || '',
      institute_name: institute?.name || '',
      district: institute?.locations?.district || '',
      mobile_no: contact?.mobile_no || '',
    };
  };

  return NextResponse.json({
    due_today: (dueToday.data || []).map(transformFollowUp),
    overdue: (overdue.data || []).map(transformFollowUp),
    upcoming: (upcoming.data || []).map(transformFollowUp),
    counts: {
      due_today: (dueToday.data || []).length,
      overdue: (overdue.data || []).length,
      upcoming: (upcoming.data || []).length,
    }
  });
}
