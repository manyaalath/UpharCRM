import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  // Build query
  let query = supabase
    .from('leads')
    .select('*, institute_contacts!inner(contacts(name, mobile_no), institutes!inner(name, locations!inner(district))), agents(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (searchParams.has('status')) {
    query = query.eq('status', searchParams.get('status'));
  }
  if (searchParams.has('district')) {
    query = query.eq('institute_contacts.institutes.locations.district', searchParams.get('district')!);
  }
  if (searchParams.has('agent_name')) {
    query = query.eq('agents.name', searchParams.get('agent_name'));
  }
  if (searchParams.has('date_start')) {
    query = query.gte('created_at', `${searchParams.get('date_start')}T00:00:00.000Z`);
  }
  if (searchParams.has('date_end')) {
    query = query.lte('created_at', `${searchParams.get('date_end')}T23:59:59.999Z`);
  }
  if (searchParams.has('search')) {
    const s = searchParams.get('search');
    query = query.ilike('lead_seq_id', `%${s}%`);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    pagination: { page, limit, total: count, total_pages: count ? Math.ceil(count / limit) : 0 }
  });
}
