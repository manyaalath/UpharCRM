import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const leadId = searchParams.get('lead_id');
  const status = searchParams.get('status'); // pending, overdue, completed, rescheduled
  const queue = searchParams.get('queue'); // due_today, overdue, upcoming, completed

  const today = new Date().toISOString().split('T')[0];

  // ── Auto-mark overdue: update any past-due pending follow-ups ──
  await supabase
    .from('follow_ups')
    .update({ status: 'overdue' })
    .lt('followup_date', today)
    .eq('status', 'pending');

  let query = supabase
    .from('follow_ups')
    .select(`
      *,
      leads:lead_id (
        id, lead_seq_id, status,
        institute_contacts!inner(
          contacts(name, mobile_no),
          institutes(name, locations(district))
        ),
        agents(name)
      ),
      agents(name)
    `)
    .order('followup_date', { ascending: true });

  if (leadId) query = query.eq('lead_id', leadId);
  if (status) query = query.eq('status', status);

  if (queue === 'due_today') {
    query = query.eq('followup_date', today).in('status', ['pending', 'overdue']);
  } else if (queue === 'overdue') {
    query = query.lt('followup_date', today).in('status', ['pending', 'overdue']);
  } else if (queue === 'upcoming') {
    query = query.gt('followup_date', today).eq('status', 'pending');
  } else if (queue === 'completed') {
    // We don't have a specific completed_date column anymore, updated_at suffices
    query = query.eq('status', 'completed').order('updated_at', { ascending: false });
  }

  const { data, error } = await query.limit(50);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  if (!body.lead_id || !body.followup_date) {
    return NextResponse.json({ error: 'lead_id and followup_date are required' }, { status: 422 });
  }

  let agentId = body.agent_id;
  // If agent_name is passed, try to look it up
  if (!agentId && body.agent_name) {
    const { data: agent } = await supabase.from('agents').select('id').eq('name', body.agent_name).single();
    if (agent) agentId = agent.id;
  }

  const { data, error } = await supabase
    .from('follow_ups')
    .insert([{
      lead_id: body.lead_id,
      challan_id: body.challan_id || null,
      agent_id: agentId || null,
      followup_date: body.followup_date,
      status: 'pending',
      remarks: body.remarks || null,
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log activity
  await supabase.from('lead_activities').insert([{
    lead_id: body.lead_id,
    activity_type: 'followup_created',
    description: `Follow-up scheduled for ${body.followup_date}`,
    metadata: { followup_date: body.followup_date },
  }]);

  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  if (!body.id) {
    return NextResponse.json({ error: 'Follow-up ID is required' }, { status: 422 });
  }

  const updates: Record<string, unknown> = {};
  if (body.status) updates.status = body.status;
  if (body.followup_date) updates.followup_date = body.followup_date;
  if (body.remarks !== undefined) updates.remarks = body.remarks;
  
  if (body.agent_id !== undefined) updates.agent_id = body.agent_id;
  else if (body.agent_name) {
    const { data: agent } = await supabase.from('agents').select('id').eq('name', body.agent_name).single();
    if (agent) updates.agent_id = agent.id;
  }

  // When rescheduling, reset status to pending
  if (body.status === 'rescheduled') {
    updates.status = 'pending';
  }

  const { data, error } = await supabase
    .from('follow_ups')
    .update(updates)
    .eq('id', body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log activity if status changed
  if (body.status && body.lead_id) {
    const statusLabel = body.status === 'completed' ? 'completed' : body.status === 'rescheduled' ? 'rescheduled' : body.status;
    await supabase.from('lead_activities').insert([{
      lead_id: body.lead_id,
      activity_type: 'status_changed',
      description: `Follow-up ${statusLabel}${body.followup_date ? ` to ${body.followup_date}` : ''}`,
      metadata: { followup_id: body.id, new_status: body.status, ...(body.followup_date && { new_date: body.followup_date }) },
    }]);
  }

  return NextResponse.json(data);
}
