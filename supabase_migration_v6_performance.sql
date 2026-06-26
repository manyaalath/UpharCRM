-- Migration V6: Performance Optimization
-- This migration adds indexes, drops redundant indexes/fields, and creates Materialized Views for dashboard aggregations.

-- 1. Optimize Indexes
CREATE INDEX IF NOT EXISTS idx_leads_agent ON leads(agent_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_agent ON follow_ups(agent_id);
CREATE INDEX IF NOT EXISTS idx_leads_institute_contact ON leads(institute_contact_id);
CREATE INDEX IF NOT EXISTS idx_challans_lead ON challans(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id);

-- Drop redundant index (covered by UNIQUE(institute_id, contact_id))
DROP INDEX IF EXISTS idx_institute_contacts_inst;

-- 2. Drop obsolete fields
ALTER TABLE call_feedback DROP COLUMN IF EXISTS created_by;

-- 3. Create Materialized Views for Dashboard Analytics

-- MV 1: District Analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_district_stats AS
SELECT 
    l.district,
    COUNT(DISTINCT c.id) as challan_count,
    COUNT(DISTINCT ld.id) as lead_count,
    COUNT(DISTINCT f.id) FILTER (WHERE f.status = 'pending' OR f.status = 'overdue') as followup_count
FROM locations l
LEFT JOIN institutes i ON i.location_id = l.id
LEFT JOIN institute_contacts ic ON ic.institute_id = i.id
LEFT JOIN leads ld ON ld.institute_contact_id = ic.id
LEFT JOIN challans c ON c.lead_id = ld.id
LEFT JOIN follow_ups f ON f.lead_id = ld.id
GROUP BY l.district;

CREATE UNIQUE INDEX idx_mv_district_stats_district ON mv_district_stats(district);

-- MV 2: Book Analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_book_stats AS
SELECT 
    b.title as book_name,
    COALESCE(SUM(cb.quantity), 0) as distribution_count,
    COUNT(DISTINCT c.lead_id) as unique_leads
FROM books b
LEFT JOIN challan_books cb ON cb.book_id = b.id
LEFT JOIN challans c ON c.id = cb.challan_id
GROUP BY b.title;

CREATE UNIQUE INDEX idx_mv_book_stats_book ON mv_book_stats(book_name);

-- Helper function to refresh all Materialized Views
CREATE OR REPLACE FUNCTION refresh_dashboard_mvs()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_district_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_book_stats;
END;
$$ LANGUAGE plpgsql;
