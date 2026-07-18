// ============================================================
// WhatsApp workflow service — the engine that ties challans → leads →
// WhatsApp → replies → follow-ups together. Uses the service-role Supabase
// client (bypasses RLS). Safe/idempotent by design.
// ============================================================

import { createClient } from '@/lib/supabase/server';
import { sendTemplateMessage, normalizeWaNumber } from './meta';
import { classifyReply, type ReplyClass } from './classify';

const TEMPLATE = process.env.WHATSAPP_TEMPLATE_NAME || 'lead_confirmation';
const LANG = process.env.WHATSAPP_TEMPLATE_LANG || 'en';
const REMINDER_HOURS = parseInt(process.env.WHATSAPP_REMINDER_HOURS || '48', 10);

// Master switch — the whole workflow is built but parked until Meta/business
// verification is done. Flip WHATSAPP_ENABLED=true in .env to turn it back on.
// See WHATSAPP_INTEGRATION.md for the full re-enable checklist.
const WHATSAPP_ENABLED = process.env.WHATSAPP_ENABLED === 'true';

const today = () => new Date().toISOString().split('T')[0];
const datePlus = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

// ── Step 2: send the confirmation template to a lead (idempotent) ──────────────
export async function triggerLeadWhatsApp(leadId: string) {
  if (!WHATSAPP_ENABLED) return { skipped: true, reason: 'disabled' };

  const supabase = await createClient();

  // Safeguard: never send twice for the same lead.
  const { data: existing } = await supabase
    .from('whatsapp_messages')
    .select('id')
    .eq('lead_id', leadId)
    .eq('direction', 'outbound')
    .limit(1);
  if (existing && existing.length > 0) return { skipped: true, reason: 'already_sent' };

  const { data: lead } = await supabase
    .from('leads')
    .select('id, institute_contacts(contacts(name, mobile_no))')
    .eq('id', leadId)
    .single();

  const ic = Array.isArray((lead as Record<string, unknown>)?.institute_contacts)
    ? (lead as Record<string, unknown>).institute_contacts as Record<string, unknown>[]
    : [(lead as Record<string, unknown>)?.institute_contacts];
  const contact = (ic?.[0] as Record<string, unknown>)?.contacts as { name?: string; mobile_no?: string } | undefined;
  const phone = contact?.mobile_no;
  if (!phone) return { skipped: true, reason: 'no_phone' };

  const result = await sendTemplateMessage({
    toPhone: phone,
    templateName: TEMPLATE,
    languageCode: LANG,
    bodyParams: [contact?.name || 'there'],
  });

  const status = result.status === 'failed' ? 'failed' : result.status === 'stubbed' ? 'queued' : 'sent';

  await supabase.from('whatsapp_messages').insert([{
    lead_id: leadId,
    direction: 'outbound',
    wa_message_id: result.messageId || null,
    template_name: TEMPLATE,
    to_phone: normalizeWaNumber(phone),
    status,
    error: result.error || null,
    payload: { template: TEMPLATE, params: [contact?.name] },
  }]);

  await supabase.from('leads').update({ whatsapp_status: status, reply_status: 'awaiting' }).eq('id', leadId);

  await supabase.from('lead_activities').insert([{
    lead_id: leadId,
    activity_type: 'whatsapp_sent',
    description: result.status === 'stubbed'
      ? 'WhatsApp confirmation queued (stub mode — no provider configured)'
      : 'WhatsApp confirmation message sent',
    metadata: { wa_message_id: result.messageId, status, template: TEMPLATE },
  }]);

  return { sent: true, status, messageId: result.messageId };
}

// ── Delivery/read status callbacks from the provider ───────────────────────────
export async function recordStatusUpdate(waMessageId: string, providerStatus: string) {
  if (!waMessageId) return;
  const allowed = ['sent', 'delivered', 'read', 'failed'];
  const status = allowed.includes(providerStatus) ? providerStatus : null;
  if (!status) return;

  const supabase = await createClient();
  const { data: msg } = await supabase
    .from('whatsapp_messages')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('wa_message_id', waMessageId)
    .select('lead_id')
    .single();

  if (msg?.lead_id) {
    await supabase.from('leads').update({ whatsapp_status: status }).eq('id', msg.lead_id);
  }
}

// ── Step 3 + 4: inbound reply → record → branch into a follow-up ───────────────
export async function handleInboundReply(opts: {
  waMessageId: string;
  fromPhone: string;
  text?: string;
  buttonPayload?: string;
}): Promise<{ status: string; leadId?: string; classification?: ReplyClass }> {
  const supabase = await createClient();

  // Idempotency: ignore repeated webhook deliveries of the same message.
  const { data: dup } = await supabase
    .from('lead_replies')
    .select('id')
    .eq('wa_message_id', opts.waMessageId)
    .limit(1);
  if (dup && dup.length > 0) return { status: 'duplicate' };

  // Match the reply to a lead via the outbound message recipient.
  const normalized = normalizeWaNumber(opts.fromPhone);
  const { data: outbound } = await supabase
    .from('whatsapp_messages')
    .select('lead_id')
    .eq('to_phone', normalized)
    .eq('direction', 'outbound')
    .order('created_at', { ascending: false })
    .limit(1);

  const leadId = outbound?.[0]?.lead_id as string | undefined;
  if (!leadId) return { status: 'no_lead_match' };

  const classification = classifyReply(opts.text, opts.buttonPayload);

  // Record the reply (unique wa_message_id guards against races).
  const { error: insErr } = await supabase.from('lead_replies').insert([{
    lead_id: leadId,
    wa_message_id: opts.waMessageId,
    from_phone: normalized,
    reply_text: opts.text || null,
    button_payload: opts.buttonPayload || null,
    classification,
  }]);
  if (insErr) {
    if (insErr.code === '23505') return { status: 'duplicate' };
    return { status: 'error', leadId };
  }

  // Fetch the lead's agent so concern tasks can be assigned to them.
  const { data: lead } = await supabase.from('leads').select('agent_id').eq('id', leadId).single();
  const agentId = (lead as { agent_id?: string })?.agent_id || null;

  await supabase.from('lead_activities').insert([{
    lead_id: leadId,
    activity_type: 'whatsapp_reply',
    description: `WhatsApp reply received (${classification}): "${opts.buttonPayload || opts.text || ''}"`,
    metadata: { classification, wa_message_id: opts.waMessageId },
  }]);

  // ── Branch on the reply ──
  if (classification === 'positive') {
    await supabase.from('leads').update({
      reply_status: 'positive',
      status: 'interested',
      last_contact_date: today(),
    }).eq('id', leadId);

    await createFollowUp(supabase, {
      leadId, agentId, kind: 'confirmation', date: datePlus(1),
      remarks: 'Lead confirmed receipt via WhatsApp — confirm next step',
    });
  } else if (classification === 'negative') {
    await supabase.from('leads').update({
      reply_status: 'negative',
      status: 'followup_pending',
      last_contact_date: today(),
    }).eq('id', leadId);

    await createFollowUp(supabase, {
      leadId, agentId, kind: 'concern', date: today(),
      remarks: 'Lead reported an issue via WhatsApp — escalate & resolve',
    });
  }
  // 'unknown' → recorded for manual review; reply_status stays 'awaiting'.

  return { status: 'handled', leadId, classification };
}

// ── No-response reminder sweep (call on a schedule) ────────────────────────────
export async function processReminders() {
  const supabase = await createClient();
  const cutoff = new Date(Date.now() - REMINDER_HOURS * 3600 * 1000).toISOString();

  const { data: candidates } = await supabase
    .from('leads')
    .select('id, agent_id')
    .in('whatsapp_status', ['sent', 'delivered', 'read', 'queued'])
    .eq('reply_status', 'awaiting')
    .lt('updated_at', cutoff)
    .limit(200);

  let reminders = 0;
  for (const lead of candidates || []) {
    // Only nudge leads that genuinely never replied.
    const { count } = await supabase
      .from('lead_replies')
      .select('id', { count: 'exact', head: true })
      .eq('lead_id', lead.id);
    if ((count || 0) > 0) continue;

    await supabase.from('leads').update({ reply_status: 'no_response' }).eq('id', lead.id);
    await createFollowUp(supabase, {
      leadId: lead.id, agentId: lead.agent_id, kind: 'reminder', date: today(),
      remarks: 'No WhatsApp response — send reminder / nudge',
    });
    await supabase.from('lead_activities').insert([{
      lead_id: lead.id,
      activity_type: 'whatsapp_no_response',
      description: `No WhatsApp reply after ${REMINDER_HOURS}h — reminder follow-up created`,
      metadata: { reminder_hours: REMINDER_HOURS },
    }]);
    reminders++;
  }

  return { scanned: candidates?.length || 0, reminders };
}

// ── helper ──
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
async function createFollowUp(
  supabase: SupabaseClient,
  opts: { leadId: string; agentId: string | null; kind: string; date: string; remarks: string }
) {
  await supabase.from('follow_ups').insert([{
    lead_id: opts.leadId,
    agent_id: opts.agentId,
    followup_date: opts.date,
    status: 'pending',
    kind: opts.kind,
    remarks: opts.remarks,
  }]);
  await supabase.from('lead_activities').insert([{
    lead_id: opts.leadId,
    activity_type: 'followup_created',
    description: `${opts.kind[0].toUpperCase()}${opts.kind.slice(1)} follow-up scheduled for ${opts.date}`,
    metadata: { kind: opts.kind, followup_date: opts.date },
  }]);
}
