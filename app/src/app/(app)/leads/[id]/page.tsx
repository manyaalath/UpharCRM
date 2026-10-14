import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import LeadDetailClient from './LeadDetailClient';
import type { LeadRow } from '../_components/leadFields';

export const metadata = { title: 'Lead · Uphar CRM' };

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead, error } = await supabase
    .from('leads')
    .select('*, institute_contacts(id, contacts(name, mobile_no, alt_mobile_no), institutes(name, address_line, village_town, locality, locations(district, state, pincode))), agents(name)')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Could not load lead: ${error.message}`);
  if (!lead) notFound();

  return <LeadDetailClient lead={lead as LeadRow} />;
}
