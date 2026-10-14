import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { recordStatusUpdate, handleInboundReply, isWhatsAppEnabled } from '@/lib/whatsapp/service';

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

// Meta signs every POST with HMAC-SHA256(app secret, raw body) in X-Hub-Signature-256.
function signatureValid(rawBody: string, header: string | null, secret: string): boolean {
  if (!header?.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  const given = header.slice('sha256='.length);
  if (given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given, 'hex'), Buffer.from(expected, 'hex'));
}

// POST — inbound messages + delivery status callbacks (Meta Cloud API shape).
// Returns 200 quickly so Meta doesn't retry storms; handling is idempotent.
export async function POST(request: Request) {
  const rawBody = await request.text();

  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (appSecret) {
    if (!signatureValid(rawBody, request.headers.get('x-hub-signature-256'), appSecret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } else if (isWhatsAppEnabled()) {
    // Live mode without a secret would let anyone forge replies.
    console.error('WhatsApp webhook: WHATSAPP_APP_SECRET is not set while WHATSAPP_ENABLED=true — rejecting');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  } else {
    console.warn('WhatsApp webhook: WHATSAPP_APP_SECRET is not set; accepting unsigned payload (WhatsApp disabled)');
  }

  try {
    const body = JSON.parse(rawBody || '{}');
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
