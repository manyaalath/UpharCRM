import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  let query = supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (searchParams.has('status')) query = query.eq('status', searchParams.get('status'));
  if (searchParams.has('district')) query = query.eq('district', searchParams.get('district'));
  if (searchParams.has('agent_name')) query = query.eq('agent_name', searchParams.get('agent_name'));
  if (searchParams.has('search')) {
    const s = searchParams.get('search');
    query = query.or(`contact_person.ilike.%${s}%,institute_name.ilike.%${s}%,mobile_no.ilike.%${s}%`);
  }

  const { data, count, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data,
    pagination: { page, limit, total: count, total_pages: count ? Math.ceil(count / limit) : 0 }
  });
}
