import { NextResponse } from 'next/server';
import { recordStatusUpdate, handleInboundReply } from '@/lib/whatsapp/service';

// GET — Meta webhook verification handshake.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge || '', { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

// POST — inbound messages + delivery status callbacks (Meta Cloud API shape).
// Always returns 200 quickly so Meta doesn't retry storms; handling is idempotent.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const entries = body?.entry || [];

    for (const entry of entries) {
      for (const change of entry?.changes || []) {
        const value = change?.value || {};

        // Delivery / read status updates
        for (const s of value.statuses || []) {
          await recordStatusUpdate(s.id, s.status);
        }

        // Inbound messages (replies)
        for (const m of value.messages || []) {
          const text = m?.text?.body;
          const buttonPayload =
            m?.button?.payload ||
            m?.interactive?.button_reply?.id ||
            m?.interactive?.button_reply?.title ||
            m?.interactive?.list_reply?.title;
          await handleInboundReply({
            waMessageId: m.id,
            fromPhone: m.from,
            text,
            buttonPayload,
          });
        }
      }
    }
  } catch (e) {
    console.error('WhatsApp webhook error:', e);
    // Still 200 — never make Meta retry on our internal errors.
  }

  return NextResponse.json({ received: true });
}
