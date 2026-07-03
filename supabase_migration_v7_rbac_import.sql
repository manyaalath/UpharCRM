-- ============================================================
-- Uphar CRM — Migration V7 (RBAC, Import Tracking, Schema Enhancements)
-- Run AFTER all previous migrations (v1–v6).
-- ============================================================

-- 1. Expand data_entry_users with role + active status
ALTER TABLE data_entry_users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'data_entry'
    CHECK (role IN ('rep', 'data_entry', 'telecaller', 'manager', 'admin'));

ALTER TABLE data_entry_users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 2. District assignments (many-to-many: user ↔ district)
CREATE TABLE IF NOT EXISTS district_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES data_entry_users(id) ON DELETE CASCADE,
  district TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, district)
);

CREATE INDEX IF NOT EXISTS idx_district_assignments_user ON district_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_district_assignments_district ON district_assignments(district);

-- 3. Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID NOT NULL REFERENCES data_entry_users(id),
  action TEXT NOT NULL,
  target_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- 4. Lead type on leads
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS lead_type TEXT
    CHECK (lead_type IN ('teacher', 'retail_salesperson', 'shopkeeper', 'institution'));

-- 5. Alternate phone on contacts
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS alt_mobile_no TEXT;

-- 6. Import tracking
CREATE TABLE IF NOT EXISTS import_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES data_entry_users(id),
  filename TEXT NOT NULL,
  total_rows INT NOT NULL DEFAULT 0,
  rows_created INT NOT NULL DEFAULT 0,
  rows_merged INT NOT NULL DEFAULT 0,
  rows_skipped INT NOT NULL DEFAULT 0,
  rows_errored INT NOT NULL DEFAULT 0,
  details JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_logs_user ON import_logs(user_id);

-- 7. RLS for new tables
ALTER TABLE district_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

-- Admin-only policies for management tables
CREATE POLICY "Admin full access to district_assignments" ON district_assignments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Admin full access to audit_log" ON audit_log
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Admin and data_entry access to import_logs" ON import_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('data_entry', 'super_admin')
    )
  );

-- 8. Update the challan RPC to accept lead_type
CREATE OR REPLACE FUNCTION create_challan_transaction(
  p_agent_name TEXT,
  p_pincode TEXT,
  p_district TEXT,
  p_state TEXT,
  p_contact_name TEXT,
  p_mobile_no TEXT,
  p_alt_mobile_no TEXT DEFAULT NULL,
  p_institute_name TEXT DEFAULT NULL,
  p_address_line TEXT DEFAULT NULL,
  p_village_town TEXT DEFAULT NULL,
  p_locality TEXT DEFAULT NULL,
  p_challan_no TEXT DEFAULT NULL,
  p_challan_date DATE DEFAULT NULL,
  p_specimens JSONB DEFAULT NULL,
  p_confirm_action TEXT DEFAULT NULL,
  p_existing_lead_id UUID DEFAULT NULL,
  p_lead_type TEXT DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  v_agent_id UUID;
  v_location_id UUID;
  v_contact_id UUID;
  v_institute_id UUID;
  v_institute_contact_id UUID;
  v_lead_id UUID;
  v_challan_id UUID;
  v_book_id UUID;
  v_book_title TEXT;
  v_lead_seq TEXT;
  v_lead_count INT;
  v_specimen_count INT;
  v_followup_date DATE;
BEGIN
  -- 1. Agent
  IF p_agent_name IS NOT NULL AND p_agent_name <> '' THEN
    SELECT id INTO v_agent_id FROM agents WHERE name = p_agent_name;
    IF NOT FOUND THEN
      INSERT INTO agents (name) VALUES (p_agent_name) RETURNING id INTO v_agent_id;
    END IF;
  END IF;

  -- 2. Location
  IF p_pincode IS NOT NULL AND p_pincode <> '' THEN
    SELECT id INTO v_location_id FROM locations WHERE pincode = p_pincode;
    IF NOT FOUND THEN
      INSERT INTO locations (pincode, district, state)
      VALUES (p_pincode, COALESCE(p_district, 'Unknown'), COALESCE(p_state, 'Unknown'))
      RETURNING id INTO v_location_id;
    END IF;
  END IF;

  -- 3. Contact
  SELECT id INTO v_contact_id FROM contacts WHERE mobile_no = p_mobile_no;
  IF NOT FOUND THEN
    INSERT INTO contacts (name, mobile_no, alt_mobile_no) VALUES (p_contact_name, p_mobile_no, p_alt_mobile_no) RETURNING id INTO v_contact_id;
  ELSE
    -- Update alt phone if provided
    IF p_alt_mobile_no IS NOT NULL THEN
      UPDATE contacts SET alt_mobile_no = p_alt_mobile_no WHERE id = v_contact_id AND alt_mobile_no IS NULL;
    END IF;
  END IF;

  -- 4. Institute
  IF v_location_id IS NOT NULL THEN
    SELECT id INTO v_institute_id FROM institutes WHERE name = p_institute_name AND location_id = v_location_id;
  ELSE
    SELECT id INTO v_institute_id FROM institutes WHERE name = p_institute_name AND location_id IS NULL;
  END IF;

  IF NOT FOUND THEN
    INSERT INTO institutes (name, address_line, village_town, locality, location_id)
    VALUES (p_institute_name, p_address_line, p_village_town, p_locality, v_location_id)
    RETURNING id INTO v_institute_id;
  END IF;

  -- 5. Institute Contact
  SELECT id INTO v_institute_contact_id FROM institute_contacts WHERE institute_id = v_institute_id AND contact_id = v_contact_id;
  IF NOT FOUND THEN
    INSERT INTO institute_contacts (institute_id, contact_id) VALUES (v_institute_id, v_contact_id) RETURNING id INTO v_institute_contact_id;
  END IF;

  -- 6. Lead
  IF p_confirm_action = 'attach_to_lead' AND p_existing_lead_id IS NOT NULL THEN
    v_lead_id := p_existing_lead_id;
  ELSE
    SELECT COUNT(*) INTO v_lead_count FROM leads;
    v_lead_seq := 'L' || LPAD((v_lead_count + 1)::TEXT, 4, '0');

    INSERT INTO leads (lead_seq_id, institute_contact_id, agent_id, status, lead_type)
    VALUES (v_lead_seq, v_institute_contact_id, v_agent_id, 'new', p_lead_type)
    RETURNING id INTO v_lead_id;

    INSERT INTO lead_activities (lead_id, activity_type, description, metadata)
    VALUES (v_lead_id, 'lead_created', 'Lead created from Challan ' || p_challan_no, jsonb_build_object('challan_no', p_challan_no));
  END IF;

  -- 7. Challan
  INSERT INTO challans (challan_no, challan_date, lead_id, agent_id)
  VALUES (p_challan_no, p_challan_date, v_lead_id, v_agent_id)
  RETURNING id INTO v_challan_id;

  -- 8. Books
  IF p_specimens IS NOT NULL AND jsonb_array_length(p_specimens) > 0 THEN
    v_specimen_count := jsonb_array_length(p_specimens);
    FOR i IN 0..(v_specimen_count - 1) LOOP
      v_book_title := p_specimens->>i;

      SELECT id INTO v_book_id FROM books WHERE title = v_book_title;
      IF NOT FOUND THEN
        INSERT INTO books (title) VALUES (v_book_title) RETURNING id INTO v_book_id;
      END IF;

      INSERT INTO challan_books (challan_id, book_id, quantity)
      VALUES (v_challan_id, v_book_id, 1);
    END LOOP;
  END IF;

  -- 9. Activities and Follow-ups
  IF p_confirm_action = 'attach_to_lead' THEN
    INSERT INTO lead_activities (lead_id, activity_type, description, metadata)
    VALUES (v_lead_id, 'challan_attached', 'Challan ' || p_challan_no || ' attached to existing lead', jsonb_build_object('challan_no', p_challan_no));

    INSERT INTO lead_activities (lead_id, activity_type, description, metadata)
    VALUES (v_lead_id, 'additional_specimen', 'Additional specimens distributed via Challan ' || p_challan_no, jsonb_build_object('challan_no', p_challan_no, 'books', p_specimens));
  ELSE
    INSERT INTO lead_activities (lead_id, activity_type, description, metadata)
    VALUES (v_lead_id, 'specimen_distributed', 'Specimens distributed', jsonb_build_object('challan_no', p_challan_no, 'books', p_specimens));
  END IF;

  v_followup_date := p_challan_date + INTERVAL '15 days';

  INSERT INTO follow_ups (lead_id, challan_id, agent_id, followup_date, status, remarks)
  VALUES (v_lead_id, v_challan_id, v_agent_id, v_followup_date, 'pending', 'Auto-scheduled 15 days after challan creation');

  INSERT INTO lead_activities (lead_id, activity_type, description, metadata)
  VALUES (v_lead_id, 'followup_created', 'Follow-up automatically scheduled for ' || to_char(v_followup_date, 'YYYY-MM-DD'), jsonb_build_object('source', 'auto_create', 'challan_no', p_challan_no));

  RETURN jsonb_build_object('success', true, 'challan_id', v_challan_id, 'lead_id', v_lead_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$;
