// ============================================================
// Meta WhatsApp Cloud API adapter.
// Runs in "stub" mode (logs, no network) unless the env is configured,
// so the whole workflow is testable end-to-end without real credentials.
// To go live, set: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
// WHATSAPP_TEMPLATE_NAME, WHATSAPP_TEMPLATE_LANG, WHATSAPP_VERIFY_TOKEN.
// ============================================================

const GRAPH_VERSION = 'v20.0';

export function isConfigured(): boolean {
  return !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export interface SendResult {
  messageId: string;
  status: 'sent' | 'stubbed' | 'failed';
  error?: string;
}

// Normalize an Indian mobile to WhatsApp's wa_id format (country code + number).
export function normalizeWaNumber(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export async function sendTemplateMessage(opts: {
  toPhone: string;
  templateName: string;
  languageCode?: string;
  bodyParams?: string[];
}): Promise<SendResult> {
  const to = normalizeWaNumber(opts.toPhone);

  // Stub mode — no creds yet. Log the intended payload and return a fake id.
  if (!isConfigured()) {
    const messageId = `stub-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    console.log('[whatsapp:stub] would send template', {
      to,
      template: opts.templateName,
      params: opts.bodyParams,
    });
    return { messageId, status: 'stubbed' };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: opts.templateName,
            language: { code: opts.languageCode || 'en' },
            ...(opts.bodyParams && opts.bodyParams.length
              ? {
                  components: [
                    {
                      type: 'body',
                      parameters: opts.bodyParams.map((t) => ({ type: 'text', text: t })),
                    },
                  ],
                }
              : {}),
          },
        }),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      return { messageId: '', status: 'failed', error: data?.error?.message || 'send failed' };
    }
    return { messageId: data?.messages?.[0]?.id || '', status: 'sent' };
  } catch (e) {
    return { messageId: '', status: 'failed', error: e instanceof Error ? e.message : 'send error' };
  }
}
