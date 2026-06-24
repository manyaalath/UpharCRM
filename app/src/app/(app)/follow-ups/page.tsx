import { createClient } from '@/lib/supabase/server';
import FollowUpsClient from './FollowUpsClient';

export const metadata = {
  title: 'Follow-Ups - Uphar CRM',
  description: 'Manage and track follow-ups for specimen distribution leads',
};

async function fetchFollowUpData() {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  // Due today
  const { data: dueToday } = await supabase
    .from('follow_ups')
    .select(`
      *,
      lead:leads!lead_id (
        id, lead_id, contact_person, institute_name, district, mobile_no, status, village_town
      )
    `)
    .eq('followup_date', today)
    .eq('status', 'pending')
    .order('followup_date', { ascending: true });

  // Overdue
  const { data: overdue } = await supabase
    .from('follow_ups')
    .select(`
      *,
      lead:leads!lead_id (
        id, lead_id, contact_person, institute_name, district, mobile_no, status, village_town
      )
    `)
    .lt('followup_date', today)
    .eq('status', 'pending')
    .order('followup_date', { ascending: true });

  // Upcoming (next 14 days)
  const twoWeeksOut = new Date();
  twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);
  const twoWeeksStr = twoWeeksOut.toISOString().split('T')[0];

  const { data: upcoming } = await supabase
    .from('follow_ups')
    .select(`
      *,
      lead:leads!lead_id (
        id, lead_id, contact_person, institute_name, district, mobile_no, status, village_town
      )
    `)
    .gt('followup_date', today)
    .lte('followup_date', twoWeeksStr)
    .eq('status', 'pending')
    .order('followup_date', { ascending: true });

  // Recently completed
  const { data: completed } = await supabase
    .from('follow_ups')
    .select(`
      *,
      lead:leads!lead_id (
        id, lead_id, contact_person, institute_name, district, mobile_no, status, village_town
      )
    `)
    .eq('status', 'completed')
    .order('updated_at', { ascending: false })
    .limit(20);

  return {
    dueToday: (dueToday as any) || [],
    overdue: (overdue as any) || [],
    upcoming: (upcoming as any) || [],
    completed: (completed as any) || [],
  };
}

export default async function FollowUpsPage() {
  const data = await fetchFollowUpData();
  return <FollowUpsClient data={data} />;
}
