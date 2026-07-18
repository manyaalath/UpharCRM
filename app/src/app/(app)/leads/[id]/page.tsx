import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import LeadDetailClient from './LeadDetailClient';

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead, error } = await supabase
    .from('leads')
    .select('*, institute_contacts(contacts(*), institutes(*, locations(*)))')
    .eq('id', id)
    .single();

  if (error || !lead) {
    return notFound();
  }

  return <LeadDetailClient lead={lead} />;
}
