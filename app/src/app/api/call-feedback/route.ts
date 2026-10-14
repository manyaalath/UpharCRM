import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/session';
import { todayIST } from '@/lib/date';

const OUTCOME_LABELS: Record<string, string> = {
  not_reachable: 'Not Reachable',
  busy: 'Busy',
  call_back_later: 'Call Back Later',
  interested: 'Interested',
  not_interested: 'Not Interested',
  wants_more_specimens: 'Wants More Specimens',
};

const isIsoDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const clean = (v: unknown, max = 2000) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

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

// POST — log a call. Optional:
//   followup_id        → that follow-up is marked completed
//   next_followup_date → a new pending follow-up is scheduled (YYYY-MM-DD, today or later)
export async function POST(request: Request) {
  const supabase = await createClient();
  const session = await getRequestSession(request);
  const body = await request.json().catch(() => ({}));
  const today = todayIST();

  if (!body.lead_id || !body.call_outcome) {
    return NextResponse.json({ error: 'lead_id and call_outcome are required' }, { status: 422 });
  }
  if (!OUTCOME_LABELS[body.call_outcome]) {
    return NextResponse.json({ error: 'Invalid call outcome' }, { status: 422 });
  }
  if (body.next_followup_date != null && body.next_followup_date !== '') {
    if (!isIsoDate(body.next_followup_date)) {
      return NextResponse.json({ error: 'next_followup_date must be YYYY-MM-DD' }, { status: 422 });
    }
    if (body.next_followup_date < today) {
      return NextResponse.json({ error: 'Next follow-up date cannot be in the past' }, { status: 422 });
    }
  }

  const { data: lead } = await supabase
    .from('leads')
    .select('id, status, agent_id')
    .eq('id', body.lead_id)
    .maybeSingle();
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const remarks = clean(body.remarks);
  const suggestions = clean(body.suggestions);
  const complaints = clean(body.complaints);
  const nextDate: string | null = isIsoDate(body.next_followup_date) ? body.next_followup_date : null;

  const { data, error } = await supabase
    .from('call_feedback')
    .insert([{
      lead_id: body.lead_id,
      call_outcome: body.call_outcome,
      suggestions,
      complaints,
      remarks,
      created_by: session?.name || clean(body.created_by, 100),
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const outcomeLabel = OUTCOME_LABELS[body.call_outcome];
  const activities: Array<{ lead_id: string; activity_type: string; description: string; metadata: Record<string, unknown> }> = [{
    lead_id: body.lead_id,
    activity_type: 'call_completed',
    description: `Call outcome: ${outcomeLabel}${remarks ? ` — ${remarks}` : ''}`,
    metadata: { call_outcome: body.call_outcome, suggestions, complaints, by: session?.name ?? null },
  }];
  if (suggestions) {
    activities.push({ lead_id: body.lead_id, activity_type: 'suggestion_received', description: suggestions, metadata: { source: 'call_feedback' } });
  }
  if (complaints) {
    activities.push({ lead_id: body.lead_id, activity_type: 'complaint_received', description: complaints, metadata: { source: 'call_feedback' } });
  }

  // Close the follow-up this call was made for.
  if (body.followup_id) {
    const { error: fuError } = await supabase
      .from('follow_ups')
      .update({ status: 'completed', remarks: remarks ? `${outcomeLabel}: ${remarks}` : outcomeLabel })
      .eq('id', body.followup_id)
      .eq('lead_id', body.lead_id);
    if (fuError) console.error('Failed to complete follow-up', fuError);
  }

  // Schedule the next one.
  let nextFollowUp = null;
  if (nextDate) {
    const { data: created, error: nextError } = await supabase
      .from('follow_ups')
      .insert([{
        lead_id: body.lead_id,
        agent_id: lead.agent_id,
        followup_date: nextDate,
        status: 'pending',
        remarks: `After call: ${outcomeLabel}`,
      }])
      .select('id, followup_date')
      .single();
    if (nextError) console.error('Failed to schedule next follow-up', nextError);
    nextFollowUp = created;
    activities.push({
      lead_id: body.lead_id,
      activity_type: 'followup_created',
      description: `Follow-up scheduled for ${nextDate}`,
      metadata: { followup_date: nextDate, source: 'call_feedback' },
    });
  }

  await supabase.from('lead_activities').insert(activities);

  // Lead status follows the outcome; any call moves a brand-new lead to "contacted".
  const leadUpdate: Record<string, unknown> = { last_contact_date: today };
  if (body.call_outcome === 'interested' || body.call_outcome === 'wants_more_specimens') leadUpdate.status = 'interested';
  else if (body.call_outcome === 'not_interested') leadUpdate.status = 'not_interested';
  else if (lead.status === 'new') leadUpdate.status = 'contacted';
  if (body.followup_id || nextDate) leadUpdate.next_followup_date = nextDate;

  await supabase.from('leads').update(leadUpdate).eq('id', body.lead_id);

  return NextResponse.json({ ...data, next_followup: nextFollowUp }, { status: 201 });
}
