-- Uphar CRM Sample Data Seed
-- This script truncates existing data and seeds the database with realistic dummy data.

BEGIN;

-- 1. Wipe existing data safely (respecting cascades)
TRUNCATE TABLE locations, books, agents, institutes, contacts, institute_contacts, leads, challans, challan_books, follow_ups, lead_activities, call_feedback CASCADE;

-- 2. Insert Agents
INSERT INTO agents (id, name, is_active) VALUES
('a0000000-0000-0000-0000-000000000001', 'Rahul Sharma', true),
('a0000000-0000-0000-0000-000000000002', 'Priya Singh', true),
('a0000000-0000-0000-0000-000000000003', 'Amit Kumar', true),
('a0000000-0000-0000-0000-000000000004', 'Neha Gupta', true);

-- 3. Insert Books
INSERT INTO books (id, title) VALUES
('b0000000-0000-0000-0000-000000000001', 'Mathematics Class 10'),
('b0000000-0000-0000-0000-000000000002', 'Science Class 10'),
('b0000000-0000-0000-0000-000000000003', 'English Grammar Class 8'),
('b0000000-0000-0000-0000-000000000004', 'Hindi Vyakaran Class 9'),
('b0000000-0000-0000-0000-000000000005', 'Social Studies Class 7'),
('b0000000-0000-0000-0000-000000000006', 'Computer Science Class 12'),
('b0000000-0000-0000-0000-000000000007', 'Physics Vol 1 Class 11'),
('b0000000-0000-0000-0000-000000000008', 'Chemistry Vol 1 Class 11');

-- 4. Insert Locations
INSERT INTO locations (id, pincode, district, state) VALUES
('l0000000-0000-0000-0000-000000000001', '201301', 'Gautam Buddha Nagar', 'Uttar Pradesh'),
('l0000000-0000-0000-0000-000000000002', '110001', 'New Delhi', 'Delhi'),
('l0000000-0000-0000-0000-000000000003', '226001', 'Lucknow', 'Uttar Pradesh'),
('l0000000-0000-0000-0000-000000000004', '302001', 'Jaipur', 'Rajasthan');

-- 5. Insert Institutes
INSERT INTO institutes (id, name, address_line, village_town, locality, location_id) VALUES
('i0000000-0000-0000-0000-000000000001', 'Delhi Public School', 'Sector 30', 'Noida', 'Sector 30', 'l0000000-0000-0000-0000-000000000001'),
('i0000000-0000-0000-0000-000000000002', 'Modern School', 'Barakhamba Road', 'New Delhi', 'Connaught Place', 'l0000000-0000-0000-0000-000000000002'),
('i0000000-0000-0000-0000-000000000003', 'City Montessori School', 'Gomti Nagar', 'Lucknow', 'Gomti Nagar', 'l0000000-0000-0000-0000-000000000003'),
('i0000000-0000-0000-0000-000000000004', 'St. Xavier''s High School', 'C-Scheme', 'Jaipur', 'C-Scheme', 'l0000000-0000-0000-0000-000000000004'),
('i0000000-0000-0000-0000-000000000005', 'Amity International', 'Sector 44', 'Noida', 'Sector 44', 'l0000000-0000-0000-0000-000000000001');

-- 6. Insert Contacts
INSERT INTO contacts (id, name, mobile_no) VALUES
('c0000000-0000-0000-0000-000000000001', 'Mr. Rakesh Verma', '9876543210'),
('c0000000-0000-0000-0000-000000000002', 'Mrs. Sunita Tiwari', '9876543211'),
('c0000000-0000-0000-0000-000000000003', 'Dr. Alok Pandey', '9876543212'),
('c0000000-0000-0000-0000-000000000004', 'Ms. Kavita Jain', '9876543213'),
('c0000000-0000-0000-0000-000000000005', 'Mr. Sanjay Yadav', '9876543214');

-- 7. Insert Institute Contacts (Junction)
INSERT INTO institute_contacts (id, institute_id, contact_id, role) VALUES
('ic000000-0000-0000-0000-000000000001', 'i0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Principal'),
('ic000000-0000-0000-0000-000000000002', 'i0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'HOD Science'),
('ic000000-0000-0000-0000-000000000003', 'i0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'Director'),
('ic000000-0000-0000-0000-000000000004', 'i0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004', 'Admin'),
('ic000000-0000-0000-0000-000000000005', 'i0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000005', 'Librarian');

-- 8. Insert Leads
INSERT INTO leads (id, lead_seq_id, institute_contact_id, agent_id, status, last_contact_date, next_followup_date) VALUES
('ld000000-0000-0000-0000-000000000001', 'LD-260624-001', 'ic000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'interested', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE),
('ld000000-0000-0000-0000-000000000002', 'LD-260624-002', 'ic000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'followup_pending', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE - INTERVAL '2 days'),
('ld000000-0000-0000-0000-000000000003', 'LD-260624-003', 'ic000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'contacted', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '10 days'),
('ld000000-0000-0000-0000-000000000004', 'LD-260624-004', 'ic000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', 'new', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '14 days'),
('ld000000-0000-0000-0000-000000000005', 'LD-260624-005', 'ic000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000004', 'not_interested', CURRENT_DATE - INTERVAL '30 days', NULL);

-- 9. Insert Challans
INSERT INTO challans (id, challan_no, challan_date, lead_id, agent_id) VALUES
('ch000000-0000-0000-0000-000000000001', 'CH-24-001', CURRENT_DATE - INTERVAL '15 days', 'ld000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
('ch000000-0000-0000-0000-000000000002', 'CH-24-002', CURRENT_DATE - INTERVAL '20 days', 'ld000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002'),
('ch000000-0000-0000-0000-000000000003', 'CH-24-003', CURRENT_DATE - INTERVAL '5 days', 'ld000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001'),
('ch000000-0000-0000-0000-000000000004', 'CH-24-004', CURRENT_DATE - INTERVAL '1 day', 'ld000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003');

-- 10. Insert Challan Books
INSERT INTO challan_books (challan_id, book_id, quantity) VALUES
('ch000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 2),
('ch000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 3),
('ch000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000007', 5),
('ch000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 1),
('ch000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', 4);

-- 11. Insert Follow Ups
INSERT INTO follow_ups (id, lead_id, challan_id, agent_id, followup_date, status, remarks) VALUES
('fu000000-0000-0000-0000-000000000001', 'ld000000-0000-0000-0000-000000000001', 'ch000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', CURRENT_DATE, 'pending', 'Ask about book quality'),
('fu000000-0000-0000-0000-000000000002', 'ld000000-0000-0000-0000-000000000002', 'ch000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', CURRENT_DATE - INTERVAL '2 days', 'overdue', 'Follow up on Physics order'),
('fu000000-0000-0000-0000-000000000003', 'ld000000-0000-0000-0000-000000000003', 'ch000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', CURRENT_DATE + INTERVAL '10 days', 'pending', 'General check in'),
('fu000000-0000-0000-0000-000000000004', 'ld000000-0000-0000-0000-000000000004', 'ch000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', CURRENT_DATE + INTERVAL '14 days', 'pending', NULL);

-- 12. Insert Lead Activities
INSERT INTO lead_activities (id, lead_id, activity_type, description, metadata) VALUES
(gen_random_uuid(), 'ld000000-0000-0000-0000-000000000001', 'lead_created', 'Lead automatically generated from new challan CH-24-001', '{}'),
(gen_random_uuid(), 'ld000000-0000-0000-0000-000000000001', 'specimen_distributed', 'Distributed 5 books via challan CH-24-001', '{}'),
(gen_random_uuid(), 'ld000000-0000-0000-0000-000000000001', 'followup_created', 'Follow-up scheduled automatically for ' || CURRENT_DATE, '{}'),
(gen_random_uuid(), 'ld000000-0000-0000-0000-000000000002', 'call_completed', 'Spoke to HOD Science, they need more specimens next week', '{"outcome":"interested"}'),
(gen_random_uuid(), 'ld000000-0000-0000-0000-000000000005', 'status_changed', 'Lead marked as Not Interested', '{"new_status":"not_interested"}');

-- 13. Insert Call Feedback
INSERT INTO call_feedback (id, lead_id, agent_id, call_outcome, suggestions, complaints, remarks) VALUES
(gen_random_uuid(), 'ld000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'interested', 'Needs Physics Vol 2', NULL, 'Very positive response'),
(gen_random_uuid(), 'ld000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000004', 'not_interested', NULL, 'Books delivered late', 'Refused to talk further');

-- 14. Refresh Materialized Views (Since we added new data)
SELECT refresh_dashboard_mvs();

COMMIT;
