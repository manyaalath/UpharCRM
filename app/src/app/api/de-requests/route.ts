import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyCookie } from '@/lib/auth';

async function requireCRM(request: NextRequest) {
  const token = request.cookies.get('crm_auth')?.value;
  if (!token) return false;
  const payload = await verifyCookie(token);
  return payload === 'crm';
}

export async function GET(request: NextRequest) {
  if (!(await requireCRM(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const supabase = await createClient();
  let query = supabase
    .from('data_entry_users')
    .select('id, name, email, status, created_at')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) {
    // Table not yet created — return empty list gracefully
    if (error.code === '42P01') return NextResponse.json({ data: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest) {
  if (!(await requireCRM(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, action } = await request.json();
  if (!id || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('data_entry_users')
    .update({ status: action === 'approve' ? 'approved' : 'rejected' })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
