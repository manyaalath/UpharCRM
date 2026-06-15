-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Challans table
CREATE TABLE IF NOT EXISTS challans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challan_no      TEXT NOT NULL UNIQUE,
  challan_date    DATE NOT NULL,
  teacher_name    TEXT NOT NULL,
  institute_name  TEXT NOT NULL,
  address         TEXT NOT NULL,
  district        TEXT NOT NULL,
  pincode         CHAR(6) NOT NULL,
  mobile_no       CHAR(10) NOT NULL,
  specimens_given JSONB NOT NULL DEFAULT '[]',
  agent_name      TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id             TEXT NOT NULL UNIQUE,
  challan_no          TEXT REFERENCES challans(challan_no) ON DELETE CASCADE,
  contact_person      TEXT NOT NULL,
  institute_name      TEXT NOT NULL,
  mobile_no           TEXT NOT NULL,
  district            TEXT NOT NULL,
  agent_name          TEXT,
  status              TEXT NOT NULL DEFAULT 'new'
                      CHECK (status IN ('new','contacted','interested',
                      'followup_pending','converted','not_interested','closed')),
  last_contact_date   DATE,
  next_followup_date  DATE,
  remarks             TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL UNIQUE,
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles table for user roles
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('data_entry', 'super_admin')),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Data entry users table (for DE portal login)
-- Accessed only via service role key (not RLS-protected)
CREATE TABLE IF NOT EXISTS data_entry_users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Auto-create lead on challan insert
CREATE OR REPLACE FUNCTION create_lead_from_challan()
RETURNS TRIGGER AS $$
DECLARE
  next_lead_id TEXT;
  lead_count INT;
BEGIN
  SELECT COUNT(*) INTO lead_count FROM leads;
  next_lead_id := 'L' || LPAD((lead_count + 1)::TEXT, 4, '0');

  INSERT INTO leads (lead_id, challan_no, contact_person, institute_name,
                     mobile_no, district, agent_name, status)
  VALUES (next_lead_id, NEW.challan_no, NEW.teacher_name, NEW.institute_name,
          NEW.mobile_no, NEW.district, NEW.agent_name, 'new');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_lead ON challans;
CREATE TRIGGER auto_create_lead
AFTER INSERT ON challans
FOR EACH ROW EXECUTE FUNCTION create_lead_from_challan();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS challans_updated_at ON challans;
CREATE TRIGGER challans_updated_at BEFORE UPDATE ON challans
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS leads_updated_at ON leads;
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable RLS (idempotent — safe to run multiple times)
ALTER TABLE IF EXISTS challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- data_entry role: read + write challans and agents
DROP POLICY IF EXISTS "data_entry_challans" ON challans;
CREATE POLICY "data_entry_challans" ON challans
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('data_entry', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "data_entry_agents" ON agents;
CREATE POLICY "data_entry_agents" ON agents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('data_entry', 'super_admin')
    )
  );

-- super_admin only for leads
DROP POLICY IF EXISTS "super_admin_leads" ON leads;
CREATE POLICY "super_admin_leads" ON leads
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'super_admin'
    )
  );

-- Insert sample agents (safe to run multiple times)
INSERT INTO agents (name) VALUES ('Rahul Sharma (North)'), ('Vikas Singh (East)'), ('Amit Kumar (Central)')
ON CONFLICT (name) DO NOTHING;
