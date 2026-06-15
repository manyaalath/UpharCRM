import { createClient } from '@/lib/supabase/server';
import LeadsClient from './LeadsClient';

export const metadata = {
  title: 'All Leads - Uphar CRM',
  description: 'Lead management and follow-up tracking for Uphar CRM',
};

export default async function LeadsPage() {
  const supabase = await createClient();

  // Fetch initial leads data
  const { data: initialLeads, count } = await supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .order('next_followup_date', { ascending: true, nullsFirst: false })
    .limit(20);

  // Fetch agents for the filter dropdown
  const { data: agents } = await supabase
    .from('agents')
    .select('name');

  return (
    <LeadsClient 
      initialData={initialLeads || []} 
      totalCount={count || 0}
      agents={(agents || []).map(a => a.name)}
    />
  );
}
