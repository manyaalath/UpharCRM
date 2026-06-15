import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { validateChallan } from '@/lib/validators';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  let query = supabase
    .from('challans')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (searchParams.has('district')) query = query.eq('district', searchParams.get('district'));
  if (searchParams.has('agent_name')) query = query.eq('agent_name', searchParams.get('agent_name'));
  if (searchParams.has('search')) {
    const s = searchParams.get('search');
    query = query.or(`challan_no.ilike.%${s}%,teacher_name.ilike.%${s}%,institute_name.ilike.%${s}%,mobile_no.ilike.%${s}%`);
  }

  const { data, count, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total: count,
      total_pages: count ? Math.ceil(count / limit) : 0
    }
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  const validation = validateChallan(body);
  if (!validation.valid) {
    return NextResponse.json({ error: 'Validation failed', fields: validation.fields }, { status: 422 });
  }

  // Check for duplicate challan_no first
  const { data: existing } = await supabase
    .from('challans')
    .select('id')
    .eq('challan_no', body.challan_no)
    .single();

  if (existing) {
    return NextResponse.json({ error: `Challan number ${body.challan_no} already exists` }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('challans')
    .insert([body])
    .select('id, challan_no')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id, challan_no: data.challan_no, message: 'Challan created successfully' }, { status: 201 });
}
