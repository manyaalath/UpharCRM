import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  // Due today
  const { data: dueToday } = await supabase
    .from('follow_ups')
    .select(`
      id, followup_date, status, remarks,
      lead:leads!lead_id (
        id, lead_id, contact_person, institute_name, district, mobile_no
      )
    `)
    .eq('followup_date', today)
    .eq('status', 'pending')
    .order('followup_date', { ascending: true })
    .limit(20);

  // Overdue
  const { data: overdue } = await supabase
    .from('follow_ups')
    .select(`
      id, followup_date, status, remarks,
      lead:leads!lead_id (
        id, lead_id, contact_person, institute_name, district, mobile_no
      )
    `)
    .lt('followup_date', today)
    .eq('status', 'pending')
    .order('followup_date', { ascending: true })
    .limit(20);

  // Upcoming (next 7 days)
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  const { data: upcoming } = await supabase
    .from('follow_ups')
    .select(`
      id, followup_date, status, remarks,
      lead:leads!lead_id (
        id, lead_id, contact_person, institute_name, district, mobile_no
      )
    `)
    .gt('followup_date', today)
    .lte('followup_date', nextWeekStr)
    .eq('status', 'pending')
    .order('followup_date', { ascending: true })
    .limit(20);

  return NextResponse.json({
    due_today: dueToday || [],
    overdue: overdue || [],
    upcoming: upcoming || [],
    counts: {
      due_today: (dueToday || []).length,
      overdue: (overdue || []).length,
      upcoming: (upcoming || []).length,
    }
  });
}
