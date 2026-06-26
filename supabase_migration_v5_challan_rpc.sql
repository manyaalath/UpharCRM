-- ============================================================
-- Uphar CRM — Migration V5 (Atomic RPC for Challan Transaction)
-- Ensures End-to-End Workflow Validation with Full ACID Rollback
-- ============================================================

CREATE OR REPLACE FUNCTION create_challan_transaction(
  p_agent_name TEXT,
  p_pincode TEXT,
  p_district TEXT,
  p_state TEXT,
  p_contact_name TEXT,
  p_mobile_no TEXT,
  p_institute_name TEXT,
  p_address_line TEXT,
  p_village_town TEXT,
  p_locality TEXT,
  p_challan_no TEXT,
  p_challan_date DATE,
  p_specimens JSONB, -- JSON array of strings
  p_confirm_action TEXT, -- 'create_new', 'attach_to_lead', or null
  p_existing_lead_id UUID
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
    INSERT INTO contacts (name, mobile_no) VALUES (p_contact_name, p_mobile_no) RETURNING id INTO v_contact_id;
  END IF;

  -- 4. Institute (Match by name and optionally location)
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

  -- 5. Institute Contact (Junction)
  SELECT id INTO v_institute_contact_id FROM institute_contacts WHERE institute_id = v_institute_id AND contact_id = v_contact_id;
  IF NOT FOUND THEN
    INSERT INTO institute_contacts (institute_id, contact_id) VALUES (v_institute_id, v_contact_id) RETURNING id INTO v_institute_contact_id;
  END IF;

  -- 6. Lead
  IF p_confirm_action = 'attach_to_lead' AND p_existing_lead_id IS NOT NULL THEN
    v_lead_id := p_existing_lead_id;
  ELSE
    -- Generate next Lead ID safely via count
    SELECT COUNT(*) INTO v_lead_count FROM leads;
    v_lead_seq := 'L' || LPAD((v_lead_count + 1)::TEXT, 4, '0');
    
    INSERT INTO leads (lead_seq_id, institute_contact_id, agent_id, status)
    VALUES (v_lead_seq, v_institute_contact_id, v_agent_id, 'new')
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

  -- Phase 4: Follow-up auto creation
  v_followup_date := p_challan_date + INTERVAL '15 days';
  
  INSERT INTO follow_ups (lead_id, challan_id, agent_id, followup_date, status, remarks)
  VALUES (v_lead_id, v_challan_id, v_agent_id, v_followup_date, 'pending', 'Auto-scheduled 15 days after challan creation');

  INSERT INTO lead_activities (lead_id, activity_type, description, metadata)
  VALUES (v_lead_id, 'followup_created', 'Follow-up automatically scheduled for ' || to_char(v_followup_date, 'YYYY-MM-DD'), jsonb_build_object('source', 'auto_create', 'challan_no', p_challan_no));

  RETURN jsonb_build_object('success', true, 'challan_id', v_challan_id, 'lead_id', v_lead_id);
EXCEPTION WHEN OTHERS THEN
  -- Postgres automatically rolls back the entire transaction if an exception is raised
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$;
