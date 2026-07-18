import { NextResponse } from 'next/server';
import { processReminders } from '@/lib/whatsapp/service';

// GET|POST /api/whatsapp/process-reminders?secret=... — no-response reminder sweep.
// Intended to be called on a schedule (Supabase cron / Vercel cron / external).
// If WHATSAPP_CRON_SECRET is set, the request must supply a matching ?secret=.
async function run(request: Request) {
  const secret = process.env.WHATSAPP_CRON_SECRET;
  if (secret) {
    const provided = new URL(request.url).searchParams.get('secret');
    if (provided !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const result = await processReminders();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
