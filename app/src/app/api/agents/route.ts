import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  if (!body.name) {
    return NextResponse.json({ error: 'Representative name is required' }, { status: 422 });
  }

  const { data, error } = await supabase
    .from('agents')
    .insert([{ name: body.name }])
    .select('id, name')
    .single();

  if (error) {
    // Unique violation constraint code
    if (error.code === '23505') {
       return NextResponse.json({ error: 'Representative already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
