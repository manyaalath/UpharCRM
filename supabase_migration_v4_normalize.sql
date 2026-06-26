-- ============================================================
-- Uphar CRM — Migration V4 (Complete Relational Normalization to 5NF)
-- WARNING: This will drop all existing transaction data and recreate the schema.
-- ============================================================

-- 1. Drop existing tables that are being refactored
DROP TABLE IF EXISTS call_feedback CASCADE;
DROP TABLE IF EXISTS lead_activities CASCADE;
DROP TABLE IF EXISTS follow_ups CASCADE;
DROP TABLE IF EXISTS challans CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS agents CASCADE;

-- Note: We are deliberately NOT dropping `profiles` or `data_entry_users` as they contain auth/user role bindings.

-- 2. Create Core Normalized Entities

CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pincode TEXT NOT NULL UNIQUE,
  district TEXT NOT NULL,
  state TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  mobile_no TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE institutes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address_line TEXT,
  village_town TEXT,
  locality TEXT,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Relationships & Transactions

CREATE TABLE institute_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(institute_id, contact_id)
);

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_seq_id TEXT NOT NULL UNIQUE,
  institute_contact_id UUID NOT NULL REFERENCES institute_contacts(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new'
         CHECK (status IN ('new','contacted','interested','followup_pending','not_interested','closed')),
  last_contact_date DATE,
  next_followup_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE challans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challan_no TEXT NOT NULL UNIQUE,
  challan_date DATE NOT NULL,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE challan_books (
  challan_id UUID NOT NULL REFERENCES challans(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  PRIMARY KEY (challan_id, book_id)
);

-- 4. Activities & Tracking

CREATE TABLE follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  challan_id UUID REFERENCES challans(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  followup_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
         CHECK (status IN ('pending','completed','overdue','rescheduled')),
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lead_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE call_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  call_outcome TEXT NOT NULL
               CHECK (call_outcome IN ('not_reachable','busy','call_back_later','interested','not_interested','wants_more_specimens')),
  suggestions TEXT,
  complaints TEXT,
  remarks TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Auto-update updated_at triggers

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER challans_updated_at BEFORE UPDATE ON challans
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER follow_ups_updated_at BEFORE UPDATE ON follow_ups
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. Indexes for common joins/lookups

CREATE INDEX idx_locations_pincode ON locations(pincode);
CREATE INDEX idx_contacts_mobile_no ON contacts(mobile_no);
CREATE INDEX idx_institutes_location ON institutes(location_id);
CREATE INDEX idx_institute_contacts_inst ON institute_contacts(institute_id);
CREATE INDEX idx_institute_contacts_cont ON institute_contacts(contact_id);
CREATE INDEX idx_leads_inst_cont ON leads(institute_contact_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_challans_lead ON challans(lead_id);
CREATE INDEX idx_challans_agent ON challans(agent_id);
CREATE INDEX idx_challans_date ON challans(challan_date);
CREATE INDEX idx_follow_ups_lead ON follow_ups(lead_id);
CREATE INDEX idx_follow_ups_date ON follow_ups(followup_date);
CREATE INDEX idx_lead_activities_lead ON lead_activities(lead_id);
CREATE INDEX idx_call_feedback_lead ON call_feedback(lead_id);

-- 7. Insert Initial Sample Data for base tables
INSERT INTO agents (name) VALUES 
('Rahul Sharma (North)'), 
('Vikas Singh (East)'), 
('Amit Kumar (Central)')
ON CONFLICT (name) DO NOTHING;

-- Seed some books
INSERT INTO books (title) VALUES 
('Mathematics Class 10'), 
('Science Class 10'), 
('English Grammar Class 8'),
('History Class 9')
ON CONFLICT (title) DO NOTHING;

-- 8. Row Level Security Policies
-- Enable RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE institute_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE challan_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_feedback ENABLE ROW LEVEL SECURITY;

-- Base Tables (Agents, Books, Locations): Read for everyone, Write for Super Admin / Data Entry
CREATE POLICY "Read base tables" ON locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read base tables" ON agents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read base tables" ON books FOR SELECT TO authenticated USING (true);

CREATE POLICY "Write base tables" ON locations FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('data_entry', 'super_admin'))
);
CREATE POLICY "Write base tables" ON agents FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('data_entry', 'super_admin'))
);
CREATE POLICY "Write base tables" ON books FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('data_entry', 'super_admin'))
);

-- Core Entities & Transactions: Write/Read for Super Admin / Data Entry
CREATE POLICY "Data Entry and Super Admin Policy" ON contacts FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('data_entry', 'super_admin'))
);
CREATE POLICY "Data Entry and Super Admin Policy" ON institutes FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('data_entry', 'super_admin'))
);
CREATE POLICY "Data Entry and Super Admin Policy" ON institute_contacts FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('data_entry', 'super_admin'))
);
CREATE POLICY "Data Entry and Super Admin Policy" ON leads FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('data_entry', 'super_admin'))
);
CREATE POLICY "Data Entry and Super Admin Policy" ON challans FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('data_entry', 'super_admin'))
);
CREATE POLICY "Data Entry and Super Admin Policy" ON challan_books FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('data_entry', 'super_admin'))
);
CREATE POLICY "Data Entry and Super Admin Policy" ON follow_ups FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('data_entry', 'super_admin'))
);
CREATE POLICY "Data Entry and Super Admin Policy" ON lead_activities FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('data_entry', 'super_admin'))
);
CREATE POLICY "Data Entry and Super Admin Policy" ON call_feedback FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('data_entry', 'super_admin'))
);
