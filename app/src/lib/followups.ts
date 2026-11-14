// Server-only helpers that keep leads.next_followup_date honest.
import type { createClient } from './supabase/server';

type Supabase = Awaited<ReturnType<typeof createClient>>;

export const OPEN_FOLLOWUP_STATUSES = ['pending', 'overdue'];

// Earliest open follow-up date for a lead, or null when nothing is scheduled.
export async function nextOpenFollowUp(supabase: Supabase, leadId: string): Promise<string | null> {
  const { data } = await supabase
    .from('follow_ups')
    .select('followup_date')
    .eq('lead_id', leadId)
    .in('status', OPEN_FOLLOWUP_STATUSES)
    .order('followup_date', { ascending: true })
    .limit(1);
  return data?.[0]?.followup_date ?? null;
}

// Call after any follow-up is created, completed or moved, so the lead's
// "Next follow-up" always matches the follow-up queue.
export async function syncNextFollowUp(supabase: Supabase, leadId: string): Promise<string | null> {
  const next = await nextOpenFollowUp(supabase, leadId);
  const { error } = await supabase.from('leads').update({ next_followup_date: next }).eq('id', leadId);
  if (error) console.error('Failed to sync next follow-up date', error);
  return next;
}
