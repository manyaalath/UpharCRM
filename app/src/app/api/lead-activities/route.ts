import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const leadId = searchParams.get('lead_id');
  if (!leadId) {
    return NextResponse.json({ error: 'lead_id is required' }, { status: 422 });
  }

  const { data, error } = await supabase
    .from('lead_activities')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
