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
    .from('call_feedback')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  if (!body.lead_id || !body.call_outcome) {
    return NextResponse.json({ error: 'lead_id and call_outcome are required' }, { status: 422 });
  }

  const validOutcomes = ['not_reachable', 'busy', 'call_back_later', 'interested', 'not_interested', 'wants_more_specimens'];
  if (!validOutcomes.includes(body.call_outcome)) {
    return NextResponse.json({ error: 'Invalid call outcome' }, { status: 422 });
  }

  const { data, error } = await supabase
    .from('call_feedback')
    .insert([{
      lead_id: body.lead_id,
      call_outcome: body.call_outcome,
      suggestions: body.suggestions || null,
      complaints: body.complaints || null,
      remarks: body.remarks || null,
      created_by: body.created_by || null,
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log activity on the lead
  const outcomeLabels: Record<string, string> = {
    not_reachable: 'Not Reachable',
    busy: 'Busy',
    call_back_later: 'Call Back Later',
    interested: 'Interested',
    not_interested: 'Not Interested',
    wants_more_specimens: 'Wants More Specimens',
  };

  await supabase.from('lead_activities').insert([{
    lead_id: body.lead_id,
    activity_type: 'call_completed',
    description: `Call outcome: ${outcomeLabels[body.call_outcome] || body.call_outcome}`,
    metadata: { call_outcome: body.call_outcome, suggestions: body.suggestions, complaints: body.complaints },
  }]);

  // If suggestions provided, log separately
  if (body.suggestions) {
    await supabase.from('lead_activities').insert([{
      lead_id: body.lead_id,
      activity_type: 'suggestion_received',
      description: body.suggestions,
      metadata: { source: 'call_feedback' },
    }]);
  }

  // If complaints provided, log separately
  if (body.complaints) {
    await supabase.from('lead_activities').insert([{
      lead_id: body.lead_id,
      activity_type: 'complaint_received',
      description: body.complaints,
      metadata: { source: 'call_feedback' },
    }]);
  }

  // Update lead status if call outcome indicates interest
  if (body.call_outcome === 'interested') {
    await supabase.from('leads').update({
      status: 'interested',
      last_contact_date: new Date().toISOString().split('T')[0],
    }).eq('id', body.lead_id);
  } else if (body.call_outcome === 'not_interested') {
    await supabase.from('leads').update({
      status: 'not_interested',
      last_contact_date: new Date().toISOString().split('T')[0],
    }).eq('id', body.lead_id);
  } else {
    // Update last_contact_date for any call
    await supabase.from('leads').update({
      last_contact_date: new Date().toISOString().split('T')[0],
    }).eq('id', body.lead_id);
  }

  return NextResponse.json(data, { status: 201 });
}
