import { NextResponse } from 'next/server';
import { timingSafeEqual } from '@/lib/auth';
import { processReminders } from '@/lib/whatsapp/service';

// GET|POST /api/whatsapp/process-reminders — no-response reminder sweep.
// Called on a schedule. Accepts either:
//   - Vercel Cron: `Authorization: Bearer $CRON_SECRET`
//   - Any other scheduler: `?secret=$WHATSAPP_CRON_SECRET`
// With neither secret configured the route is closed.
function authorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization') || '';
  if (cronSecret && timingSafeEqual(auth, `Bearer ${cronSecret}`)) return true;

  const querySecret = process.env.WHATSAPP_CRON_SECRET;
  const provided = new URL(request.url).searchParams.get('secret') || '';
  if (querySecret && timingSafeEqual(provided, querySecret)) return true;

  return false;
}

async function run(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
