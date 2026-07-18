-- ============================================================
-- Uphar CRM — Migration V8 (WhatsApp Workflow)
-- Run AFTER all previous migrations (v1–v7).
--
-- NOT required yet — the WhatsApp workflow is parked behind
-- WHATSAPP_ENABLED=false until Meta business verification is done.
-- Run this only when you're ready to go live. See WHATSAPP_INTEGRATION.md.
-- ============================================================

-- 1. Delivery/reply status on leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS whatsapp_status TEXT NOT NULL DEFAULT 'not_sent'
  CHECK (whatsapp_status IN ('not_sent','queued','sent','delivered','read','failed'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS reply_status TEXT NOT NULL DEFAULT 'awaiting'
  CHECK (reply_status IN ('awaiting','positive','negative','no_response'));

-- 2. Outbound/inbound message log (one row per template send + status callback)
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id        UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  direction      TEXT NOT NULL CHECK (direction IN ('outbound','inbound')),
  wa_message_id  TEXT,
  template_name  TEXT,
  to_phone       TEXT,
  status         TEXT,
  error          TEXT,
  payload        JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_lead ON whatsapp_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_wa_id ON whatsapp_messages(wa_message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_to_phone ON whatsapp_messages(to_phone);

DROP TRIGGER IF EXISTS whatsapp_messages_updated_at ON whatsapp_messages;
CREATE TRIGGER whatsapp_messages_updated_at BEFORE UPDATE ON whatsapp_messages
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3. Inbound replies (matched back to a lead via the outbound recipient number)
CREATE TABLE IF NOT EXISTS lead_replies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  wa_message_id   TEXT UNIQUE,
  from_phone      TEXT,
  reply_text      TEXT,
  button_payload  TEXT,
  classification  TEXT CHECK (classification IN ('positive','negative','unknown')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_replies_lead ON lead_replies(lead_id);

-- 4. follow_ups needs a "kind" tag so WhatsApp-triggered follow-ups
--    (confirmation / concern / reminder) are distinguishable from manual ones.
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS kind TEXT;

-- 5. RLS — these tables are only ever touched via the service-role client
--    (src/lib/supabase/server.ts), so enabling with no policy is enough
--    to keep them out of reach of the anon/authenticated keys.
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_replies ENABLE ROW LEVEL SECURITY;
