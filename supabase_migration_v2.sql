-- ============================================================
-- Uphar CRM — Migration V2 (PRD Revision)
-- Run this AFTER the original schema is in place.
-- ============================================================

-- 1. Add new address fields to challans
ALTER TABLE challans ADD COLUMN IF NOT EXISTS village_town TEXT;
ALTER TABLE challans ADD COLUMN IF NOT EXISTS locality TEXT;
ALTER TABLE challans ADD COLUMN IF NOT EXISTS lead_id UUID;

-- 2. Add new address fields & feedback fields to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS village_town TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS locality TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS suggestions TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS complaints TEXT;

-- 3. Update leads status CHECK constraint to remove 'converted'
--    (Drop old constraint, add new one)
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check
  CHECK (status IN ('new','contacted','interested','followup_pending','not_interested','closed'));

-- Update any existing 'converted' leads to 'closed'
UPDATE leads SET status = 'closed' WHERE status = 'converted';

-- 4. Drop old auto_create_lead trigger (leads are now conditionally created via API)
DROP TRIGGER IF EXISTS auto_create_lead ON challans;
DROP FUNCTION IF EXISTS create_lead_from_challan();

-- 5. Follow-ups table
CREATE TABLE IF NOT EXISTS follow_ups (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  challan_no      TEXT,
  followup_date   DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','completed','overdue','rescheduled')),
  remarks         TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 6. Lead Activities table (timeline)
CREATE TABLE IF NOT EXISTS lead_activities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  activity_type   TEXT NOT NULL,
  description     TEXT NOT NULL,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 7. Call Feedback table
CREATE TABLE IF NOT EXISTS call_feedback (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  call_outcome    TEXT NOT NULL
                  CHECK (call_outcome IN ('not_reachable','busy','call_back_later','interested','not_interested','wants_more_specimens')),
  suggestions     TEXT,
  complaints      TEXT,
  remarks         TEXT,
  created_by      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 8. Auto-update updated_at triggers for new tables
DROP TRIGGER IF EXISTS follow_ups_updated_at ON follow_ups;
CREATE TRIGGER follow_ups_updated_at BEFORE UPDATE ON follow_ups
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 9. RLS for new tables
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_feedback ENABLE ROW LEVEL SECURITY;

-- Follow-ups: super_admin full access
DROP POLICY IF EXISTS "super_admin_follow_ups" ON follow_ups;
CREATE POLICY "super_admin_follow_ups" ON follow_ups
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Lead activities: super_admin full access
DROP POLICY IF EXISTS "super_admin_lead_activities" ON lead_activities;
CREATE POLICY "super_admin_lead_activities" ON lead_activities
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Call feedback: super_admin full access
DROP POLICY IF EXISTS "super_admin_call_feedback" ON call_feedback;
CREATE POLICY "super_admin_call_feedback" ON call_feedback
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- 10. Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_leads_mobile_no ON leads(mobile_no);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_lead_id ON follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_date ON follow_ups(followup_date);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_feedback_lead_id ON call_feedback(lead_id);
CREATE INDEX IF NOT EXISTS idx_challans_lead_id ON challans(lead_id);
CREATE INDEX IF NOT EXISTS idx_challans_mobile ON challans(mobile_no);
