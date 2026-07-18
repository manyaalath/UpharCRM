import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/leads/[id]/whatsapp — WhatsApp status + message + reply history for a lead.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params;
  const supabase = await createClient();

  const [leadRes, messagesRes, repliesRes] = await Promise.all([
    supabase.from('leads').select('whatsapp_status, reply_status').eq('id', leadId).single(),
    supabase
      .from('whatsapp_messages')
      .select('id, direction, template_name, status, error, created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false }),
    supabase
      .from('lead_replies')
      .select('id, reply_text, button_payload, classification, created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false }),
  ]);

  return NextResponse.json({
    data: {
      whatsapp_status: leadRes.data?.whatsapp_status || 'not_sent',
      reply_status: leadRes.data?.reply_status || 'awaiting',
      messages: messagesRes.data || [],
      replies: repliesRes.data || [],
    },
  });
}
