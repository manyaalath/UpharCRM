import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleInboundReply } from '@/lib/whatsapp/service';

// POST /api/whatsapp/simulate — dev/test helper.
// Simulates an inbound WhatsApp reply for a lead so the branching workflow can be
// exercised without a live provider. Body: { lead_id, reply: 'received' | 'not_received' | <text> }
export async function POST(request: Request) {
  const supabase = await createClient();
  const { lead_id, reply } = await request.json();

  if (!lead_id || !reply) {
    return NextResponse.json({ error: 'lead_id and reply are required' }, { status: 422 });
  }

  // Resolve the lead's phone (the "from" number of the simulated reply).
  const { data: lead } = await supabase
    .from('leads')
    .select('institute_contacts(contacts(mobile_no))')
    .eq('id', lead_id)
    .single();
  const ic = Array.isArray((lead as Record<string, unknown>)?.institute_contacts)
    ? (lead as Record<string, unknown>).institute_contacts as Record<string, unknown>[]
    : [(lead as Record<string, unknown>)?.institute_contacts];
  const phone = ((ic?.[0] as Record<string, unknown>)?.contacts as { mobile_no?: string })?.mobile_no;

  if (!phone) {
    return NextResponse.json({ error: 'Lead has no contact phone number' }, { status: 422 });
  }

  const label = reply === 'received' ? 'Received' : reply === 'not_received' ? 'Not Received' : String(reply);

  const result = await handleInboundReply({
    waMessageId: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fromPhone: phone,
    text: label,
    buttonPayload: label,
  });

  return NextResponse.json({ ok: true, result });
}
