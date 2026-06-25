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
      lead:leads!lead_id (
        id, lead_id, contact_person, institute_name, district, mobile_no, status, village_town, agent_name
      )
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
    query = query.eq('status', 'completed').order('completed_date', { ascending: false });
  }

  const { data, error } = await query.limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  if (!body.lead_id || !body.followup_date) {
    return NextResponse.json({ error: 'lead_id and followup_date are required' }, { status: 422 });
  }

  const { data, error } = await supabase
    .from('follow_ups')
    .insert([{
      lead_id: body.lead_id,
      challan_id: body.challan_id || null,
      challan_no: body.challan_no || null,
      assigned_rep: body.assigned_rep || null,
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
  if (body.assigned_rep !== undefined) updates.assigned_rep = body.assigned_rep;

  // Set completed_date when marking as completed
  if (body.status === 'completed') {
    updates.completed_date = new Date().toISOString().split('T')[0];
  }

  // When rescheduling, reset status to pending and clear completed_date
  if (body.status === 'rescheduled') {
    updates.status = 'pending';
    updates.completed_date = null;
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
      activity_type: body.status === 'completed' ? 'followup_completed' : 'followup_rescheduled',
      description: `Follow-up ${statusLabel}${body.followup_date ? ` to ${body.followup_date}` : ''}`,
      metadata: { followup_id: body.id, new_status: body.status, ...(body.followup_date && { new_date: body.followup_date }) },
    }]);
  }

  return NextResponse.json(data);
}
