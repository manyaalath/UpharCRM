import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import LeadsClient from './LeadsClient';

export const metadata = {
  title: 'Leads · Uphar CRM',
  description: 'Teachers, shopkeepers and institutes that received specimens',
};

export default async function LeadsPage() {
  const supabase = await createClient();
  const { data: agents } = await supabase.from('agents').select('name').eq('is_active', true).order('name');

  return (
    <Suspense>
      <LeadsClient agents={(agents || []).map(a => a.name)} />
    </Suspense>
  );
}
