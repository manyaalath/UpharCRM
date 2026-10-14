import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { LEAD_STATUS_OPTIONS } from '@/lib/types';
import { getRequestSession } from '@/lib/session';

const LEAD_SELECT =
  '*, institute_contacts(id, contacts(name, mobile_no, alt_mobile_no), institutes(name, address_line, village_town, locality, locations(district, state, pincode))), agents(name)';

// GET /api/leads/[id] — one lead with contact, institute and rep.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.from('leads').select(LEAD_SELECT).eq('id', id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  return NextResponse.json({ data });
}

// PATCH /api/leads/[id] — { status } — change lead status and log it.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const status = String(body.status || '');

  const option = LEAD_STATUS_OPTIONS.find(o => o.value === status);
  if (!option) return NextResponse.json({ error: 'Invalid status' }, { status: 422 });

  const supabase = await createClient();
  const { data: before, error: readError } = await supabase.from('leads').select('status').eq('id', id).maybeSingle();
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  if (!before) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  if (before.status === status) return NextResponse.json({ data: { id, status } });

  const { error } = await supabase
    .from('leads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const session = await getRequestSession(request);
  const fromLabel = LEAD_STATUS_OPTIONS.find(o => o.value === before.status)?.label || before.status;
  await supabase.from('lead_activities').insert([{
    lead_id: id,
    activity_type: 'status_changed',
    description: `Status changed from ${fromLabel} to ${option.label}${session?.name ? ` by ${session.name}` : ''}`,
    metadata: { from: before.status, to: status, by: session?.uid || null },
  }]);

  return NextResponse.json({ data: { id, status } });
}
