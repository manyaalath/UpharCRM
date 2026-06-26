import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(); 
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    const followUpSelect = `
      id, followup_date, status, remarks, 
      agents(name),
      leads:lead_id ( 
        id, lead_seq_id, status,
        institute_contacts!inner(
          contacts(name, mobile_no),
          institutes!inner(name, locations!inner(district))
        )
      )
    `;

    // ── Execute all independent queries in parallel ──
    const [
      // Section A: Overview
      { count: totalChallans },
      { count: totalLeads },
      { count: pendingFollowups },
      challanBooksRes, // For books_distributed
      
      // Section B: District Analysis
      allChallansRes,
      allLeadsRes,
      allFollowUpsRes,

      // Section D: Rep Performance
      repChallansRes,
      repLeadsRes,
      repFollowUpsRes,

      // Section E: Follow-Up Queue
      dueTodayRes,
      overdueRes,
      upcomingRes,
      completedFollowUpsRes,
      updateOverdueRes, // Auto-mark overdue

      // Section F: Lead Intelligence
      leadChallansRes,
      classifyLeadsRes,
    ] = await Promise.all([
      // A
      supabase.from('challans').select('*', { count: 'exact', head: true }),
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase.from('follow_ups').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('challan_books').select('quantity, books(title), challans!inner(lead_id)'),
      
      // B (Districts)
      supabase.from('challans').select('id, leads!inner(institute_contacts!inner(institutes!inner(locations!inner(district))))'),
      supabase.from('leads').select('id, status, institute_contacts!inner(institutes!inner(locations!inner(district)))'),
      supabase.from('follow_ups').select('id, status, leads!inner(institute_contacts!inner(institutes!inner(locations!inner(district))))').eq('status', 'pending'),

      // D (Reps)
      supabase.from('challans').select('id, agents(name)'),
      supabase.from('leads').select('id, status, agents(name)'),
      supabase.from('follow_ups').select('id, status, agents(name)').eq('status', 'completed'),

      // E (Follow Ups)
      supabase.from('follow_ups').select(followUpSelect).eq('followup_date', today).in('status', ['pending', 'overdue']).order('followup_date').limit(10),
      supabase.from('follow_ups').select(followUpSelect).lt('followup_date', today).in('status', ['pending', 'overdue']).order('followup_date').limit(10),
      supabase.from('follow_ups').select(followUpSelect).gt('followup_date', today).lte('followup_date', nextWeekStr).eq('status', 'pending').order('followup_date').limit(10),
      supabase.from('follow_ups').select(followUpSelect).eq('status', 'completed').order('updated_at', { ascending: false }).limit(10),
      supabase.from('follow_ups').update({ status: 'overdue' }).lt('followup_date', today).eq('status', 'pending'),

      // F (Lead Intelligence - we will use allChallans to get institutes and teachers to avoid duplicating large queries)
      supabase.from('challans').select('id, challan_date, leads!inner(id, institute_contacts!inner(contacts(name), institutes!inner(name, locations!inner(district))))').order('challan_date', { ascending: false }),
      supabase.from('leads').select('id, status'),
    ]);

    // Helpers to extract nested data safely
    const extractDistrict = (item: any) => item?.institute_contacts?.institutes?.locations?.district || item?.leads?.institute_contacts?.institutes?.locations?.district || 'Unknown';
    const extractInstName = (item: any) => item?.leads?.institute_contacts?.institutes?.name || 'Unknown';
    const extractTeacherName = (item: any) => item?.leads?.institute_contacts?.contacts?.name || 'Unknown';
    const extractAgentName = (item: any) => item?.agents?.name || 'Unknown';

    // ── Process Section A ──
    let booksDistributed = 0;
    const districtSet = new Set<string>();
    
    (challanBooksRes.data || []).forEach(cb => {
      booksDistributed += (cb.quantity || 1);
    });

    (allChallansRes.data || []).forEach(c => {
      districtSet.add(extractDistrict(c));
    });
    const districtsCovered = districtSet.size;

    // ── Process Section B ──
    const districtStats: Record<string, { challan_count: number; lead_count: number; followup_count: number }> = {};
    const ensureD = (d: string) => { if (!districtStats[d]) districtStats[d] = { challan_count: 0, lead_count: 0, followup_count: 0 }; };
    
    (allChallansRes.data || []).forEach(c => { const d = extractDistrict(c); ensureD(d); districtStats[d].challan_count++; });
    (allLeadsRes.data || []).forEach(l => { const d = extractDistrict(l); ensureD(d); districtStats[d].lead_count++; });
    (allFollowUpsRes.data || []).forEach(f => { const d = extractDistrict(f); ensureD(d); districtStats[d].followup_count++; });
    
    const districtData = Object.entries(districtStats).map(([district, s]) => ({ district, ...s })).sort((a, b) => b.challan_count - a.challan_count).slice(0, 10);

    // ── Process Section C ──
    const bookStats: Record<string, { distribution_count: number; lead_ids: Set<string> }> = {};
    (challanBooksRes.data || []).forEach(cb => {
      const bookName = (cb.books as any)?.title || 'Unknown';
      const leadId = (cb.challans as any)?.lead_id;
      if (!bookStats[bookName]) bookStats[bookName] = { distribution_count: 0, lead_ids: new Set() };
      bookStats[bookName].distribution_count += cb.quantity;
      if (leadId) bookStats[bookName].lead_ids.add(leadId);
    });
    const bookData = Object.entries(bookStats)
      .map(([book_name, s]) => ({ book_name, distribution_count: s.distribution_count, unique_leads: s.lead_ids.size, repeat_count: Math.max(0, s.distribution_count - s.lead_ids.size) }))
      .sort((a, b) => b.distribution_count - a.distribution_count).slice(0, 10);

    // ── Process Section D ──
    const repStats: Record<string, { challan_count: number; lead_count: number; interested_count: number; followups_completed: number }> = {};
    const ensureR = (n: string) => { if (!repStats[n]) repStats[n] = { challan_count: 0, lead_count: 0, interested_count: 0, followups_completed: 0 }; };
    
    (repChallansRes.data || []).forEach(c => { const n = extractAgentName(c); if(n !== 'Unknown') { ensureR(n); repStats[n].challan_count++; } });
    (repLeadsRes.data || []).forEach(l => {
      const n = extractAgentName(l);
      if (n !== 'Unknown') {
        ensureR(n); repStats[n].lead_count++;
        if (l.status === 'interested') repStats[n].interested_count++;
      }
    });
    (repFollowUpsRes.data || []).forEach(f => {
      const n = extractAgentName(f);
      if (n !== 'Unknown') { ensureR(n); repStats[n].followups_completed++; }
    });
    
    const maxC = Math.max(1, ...Object.values(repStats).map(s => s.challan_count));
    const maxI = Math.max(1, ...Object.values(repStats).map(s => s.interested_count));
    const representativeData = Object.entries(repStats)
      .map(([name, s]) => {
        const cScore = (s.challan_count / maxC) * 100;
        const iScore = (s.interested_count / maxI) * 100;
        const dq = s.lead_count > 0 ? (s.interested_count / s.lead_count) * 100 : 0;
        return { representative_name: name, ...s, performance_score: Math.round(cScore * 0.4 + iScore * 0.4 + dq * 0.2) };
      })
      .sort((a, b) => b.performance_score - a.performance_score);

    // ── Process Section F ──
    const instituteCounts: Record<string, { count: number; district: string; last_visit: string }> = {};
    const teacherCounts: Record<string, { count: number; district: string; last_visit: string }> = {};
    const challanPerLead: Record<string, number> = {};

    (leadChallansRes.data || []).forEach(c => {
      const instName = extractInstName(c);
      const teacherName = extractTeacherName(c);
      const district = extractDistrict(c);
      const leadId = (c.leads as any)?.id;
      
      if (!instituteCounts[instName]) instituteCounts[instName] = { count: 0, district, last_visit: c.challan_date };
      instituteCounts[instName].count++;
      
      if (!teacherCounts[teacherName]) teacherCounts[teacherName] = { count: 0, district, last_visit: c.challan_date };
      teacherCounts[teacherName].count++;
      
      if (leadId) challanPerLead[leadId] = (challanPerLead[leadId] || 0) + 1;
    });
    
    const topInstitutions = Object.entries(instituteCounts).map(([name, s]) => ({ name, ...s })).sort((a, b) => b.count - a.count).slice(0, 5);
    const topTeachers = Object.entries(teacherCounts).map(([name, s]) => ({ name, ...s })).sort((a, b) => b.count - a.count).slice(0, 5);

    const leadCategories = { hot: 0, warm: 0, cold: 0 };
    (classifyLeadsRes.data || []).forEach(l => {
      const visits = challanPerLead[l.id] || 0;
      const interested = l.status === 'interested';
      if (visits >= 3 && interested) leadCategories.hot++;
      else if (visits >= 2 || interested) leadCategories.warm++;
      else leadCategories.cold++;
    });

    const statusCounts: Record<string, number> = {};
    (classifyLeadsRes.data || []).forEach(l => { if (l.status !== 'converted') statusCounts[l.status] = (statusCounts[l.status] || 0) + 1; });
    const leadStatusData = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

    // Format Follow Ups for Frontend (flatten nested properties)
    const formatQueue = (queue: any[]) => queue.map(f => {
      const lead = f.leads;
      const instContact = Array.isArray(lead?.institute_contacts) ? lead?.institute_contacts[0] : lead?.institute_contacts;
      return {
        id: f.id,
        lead_id: lead?.id,
        contact_person: instContact?.contacts?.name,
        institute_name: instContact?.institutes?.name,
        district: instContact?.institutes?.locations?.district,
        mobile_no: instContact?.contacts?.mobile_no,
        followup_date: f.followup_date,
        status: f.status
      };
    });

    return NextResponse.json({
      summary: {
        total_challans: totalChallans || 0,
        total_leads: totalLeads || 0,
        pending_followups: pendingFollowups || 0,
        books_distributed: booksDistributed,
        districts_covered: districtsCovered,
      },
      districtData,
      bookData,
      representativeData,
      followUpQueue: {
        due_today: formatQueue(dueTodayRes.data || []),
        overdue: formatQueue(overdueRes.data || []),
        upcoming: formatQueue(upcomingRes.data || []),
        completed: formatQueue(completedFollowUpsRes.data || []),
      },
      leadIntelligence: { topInstitutions, topTeachers, leadCategories },
      leadStatusData,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
