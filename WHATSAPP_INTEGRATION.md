# WhatsApp Workflow — Integration Guide

Status: **built, parked**. The whole challan → lead → WhatsApp confirmation →
reply → follow-up workflow is implemented and works end-to-end in "stub mode"
(no real messages sent). It's switched off for now because the Meta WhatsApp
Business API needs account/template verification, which takes time. Turning
it back on is a ~10 minute job once you have Meta credentials — follow the
checklist below.

## How it's currently turned off

One flag, one commented-out line. Nothing was deleted.

1. `app/.env` → `WHATSAPP_ENABLED=false`. Checked centrally in
   `triggerLeadWhatsApp()` (`app/src/lib/whatsapp/service.ts`) — the function
   that fires automatically every time a challan/lead is created
   (`app/src/app/api/challans/route.ts`). While the flag is off it returns
   `{ skipped: true, reason: 'disabled' }` immediately — no DB writes, no
   network calls, challan creation is unaffected either way.
2. `app/src/app/(app)/leads/[id]/LeadDetailClient.tsx` — the `<LeadWhatsApp>`
   widget (status badges, message history, "simulate reply" test buttons) is
   commented out along with its import, so the lead detail page doesn't fetch
   `/api/leads/[id]/whatsapp` at all.

Everything else (API routes, `lib/whatsapp/*`, the `LeadWhatsApp.tsx`
component itself) is untouched and ready to go.

## What's already built

| Piece | File |
|---|---|
| Meta Cloud API adapter (send template message, stub mode without creds) | `app/src/lib/whatsapp/meta.ts` |
| Reply classifier (EN + Hindi keywords → positive/negative/unknown) | `app/src/lib/whatsapp/classify.ts` |
| Core workflow (trigger send, record status, handle reply, reminder sweep) | `app/src/lib/whatsapp/service.ts` |
| Send confirmation on challan/lead creation | called from `app/src/app/api/challans/route.ts` |
| Per-lead status/history API | `app/src/app/api/leads/[id]/whatsapp/route.ts` |
| Meta webhook (verification handshake + inbound messages/status) | `app/src/app/api/whatsapp/webhook/route.ts` |
| No-response reminder sweep (call on a schedule) | `app/src/app/api/whatsapp/process-reminders/route.ts` |
| Dev helper to simulate a customer reply without a live provider | `app/src/app/api/whatsapp/simulate/route.ts` |
| Lead detail UI widget (status, history, simulate buttons) | `app/src/app/(app)/leads/[id]/LeadWhatsApp.tsx` |
| Status badges on the leads table | `app/src/app/(app)/leads/LeadsClient.tsx` (`lead.whatsapp_status` / `lead.reply_status`) |
| Activity feed icons (`whatsapp_sent`, `whatsapp_reply`, `whatsapp_no_response`) | `app/src/app/(app)/leads/[id]/LeadDetailClient.tsx` |
| `middleware.ts` already allowlists the webhook + reminders routes (no session cookie) | `app/src/middleware.ts` |

### Flow

```
Challan saved → triggerLeadWhatsApp(leadId)
    → sends "lead_confirmation" template via Meta
    → whatsapp_messages row + leads.whatsapp_status updated

Customer replies on WhatsApp → Meta calls /api/whatsapp/webhook
    → handleInboundReply()
    → classifyReply() → positive / negative / unknown
    → lead_replies row + leads.reply_status updated
    → positive → follow_up (kind: confirmation, +1 day)
    → negative → follow_up (kind: concern, today)

No reply after WHATSAPP_REMINDER_HOURS (default 48h) → /api/whatsapp/process-reminders (cron)
    → follow_up (kind: reminder, today) + leads.reply_status = 'no_response'
```

## Going live — checklist

1. **Get Meta credentials** (Meta Business Manager → WhatsApp → API Setup):
   a permanent access token, phone number ID, and an approved message
   template (default name `lead_confirmation`, one body param for the
   contact's name).
2. **Run the DB migration** — `supabase_migration_v8_whatsapp.sql` (repo
   root). Adds `leads.whatsapp_status` / `leads.reply_status`, the
   `whatsapp_messages` and `lead_replies` tables, and `follow_ups.kind`.
   Not run yet — none of these columns/tables exist in the DB today.
3. **Fill in `app/.env`**:
   ```
   WHATSAPP_ENABLED=true
   WHATSAPP_ACCESS_TOKEN=<permanent token>
   WHATSAPP_PHONE_NUMBER_ID=<from Meta>
   WHATSAPP_VERIFY_TOKEN=<any string you pick — also enter it in the Meta webhook config>
   WHATSAPP_TEMPLATE_NAME=lead_confirmation
   WHATSAPP_TEMPLATE_LANG=en
   WHATSAPP_REMINDER_HOURS=48
   WHATSAPP_CRON_SECRET=<random string, protects /api/whatsapp/process-reminders>
   ```
4. **Uncomment the UI widget** in
   `app/src/app/(app)/leads/[id]/LeadDetailClient.tsx`:
   - `import LeadWhatsApp from './LeadWhatsApp';`
   - `<LeadWhatsApp leadId={lead.id} onChange={() => fetchActivities(lead.id)} />`
5. **Point the Meta webhook** at `https://<your-domain>/api/whatsapp/webhook`
   using the `WHATSAPP_VERIFY_TOKEN` from step 3.
6. **Schedule the reminder sweep** — hit
   `GET /api/whatsapp/process-reminders?secret=<WHATSAPP_CRON_SECRET>` on a
   schedule (Vercel Cron / Supabase cron / any external scheduler), e.g.
   hourly.
7. **Sanity check in stub mode first**: leave `WHATSAPP_ACCESS_TOKEN` /
   `WHATSAPP_PHONE_NUMBER_ID` unset with `WHATSAPP_ENABLED=true` — sends are
   logged and stored as `status: 'queued'` without hitting the network, so
   you can create a challan and use the "Simulate reply" buttons on the lead
   detail page to exercise the full branch logic (positive/negative →
   follow-up creation) before spending real template sends.
