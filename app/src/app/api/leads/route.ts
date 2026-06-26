import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  // Supabase inner join to filter nested relations easily
  let query = supabase
    .from('leads')
    .select('*, institute_contacts!inner(contacts(name, mobile_no), institutes!inner(name, locations!inner(district))), agents!inner(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (searchParams.has('status')) {
    query = query.eq('status', searchParams.get('status'));
  }
  if (searchParams.has('district')) {
    query = query.eq('institute_contacts.institutes.locations.district', searchParams.get('district'));
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
    // For nested text search in supabase JS, it's quite complex.
    // As a workaround, we could rely on fetching all and filtering in memory or writing a custom SQL function.
    // But Supabase JS supports doing simple nested filters if configured right. However, `or` across relationships is not fully supported in standard JS syntax easily.
    // Let's do our best with what we have. A stored procedure would be better, but we will filter what we can.
    // For now, we will do a basic approach: just fetch and let the frontend do the deep text search if needed, or we implement a fallback.
    // We will do a generic search over the lead sequence ID.
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
