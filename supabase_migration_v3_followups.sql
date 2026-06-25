-- ============================================================
-- Uphar CRM — Migration V3: Enhanced Follow-ups
-- Run this AFTER migration V2 is in place.
-- ============================================================

-- 1. Add new columns to follow_ups table
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS challan_id UUID REFERENCES challans(id) ON DELETE SET NULL;
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS assigned_rep TEXT;
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS completed_date DATE;

-- 2. Add index for assigned_rep lookups
CREATE INDEX IF NOT EXISTS idx_follow_ups_assigned_rep ON follow_ups(assigned_rep);
CREATE INDEX IF NOT EXISTS idx_follow_ups_challan_id ON follow_ups(challan_id);

-- 3. Backfill assigned_rep from linked leads for existing follow-ups
UPDATE follow_ups
SET assigned_rep = leads.agent_name
FROM leads
WHERE follow_ups.lead_id = leads.id
  AND follow_ups.assigned_rep IS NULL;

-- 4. Backfill challan_id from challan_no for existing follow-ups
UPDATE follow_ups
SET challan_id = challans.id
FROM challans
WHERE follow_ups.challan_no = challans.challan_no
  AND follow_ups.challan_id IS NULL;
