import { createClient } from '@/lib/supabase/server';
import RecordsClient from './RecordsClient';

export const metadata = {
  title: 'All Records - Uphar CRM',
  description: 'View and filter all specimen distribution challan records.',
};

export default async function RecordsPage() {
  const supabase = await createClient();
  
  // Fetch initial data for SSR
  const { data: initialChallans, count } = await supabase
    .from('challans')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(20);

  // Fetch agents for the filter dropdown
  const { data: agents } = await supabase
    .from('agents')
    .select('name');

  return (
    <RecordsClient 
      initialData={initialChallans || []} 
      totalCount={count || 0} 
      agents={(agents || []).map(a => a.name)}
    />
  );
}
