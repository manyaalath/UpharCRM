import { createClient } from '@/lib/supabase/server';
import DashboardClient from './DashboardClient';

export const metadata = {
  title: 'Dashboard - Uphar CRM',
  description: 'Super Admin analytics dashboard for Uphar Prakashan Specimen Distribution CRM',
};

async function fetchDashboardData() {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  // ── Section A: Overview KPIs ──
  const [
    { count: totalChallans },
    { count: totalLeads },
    { count: pendingFollowups },
    challanSpecimens,
    challanDistricts,
  ] = await Promise.all([
    supabase.from('challans').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('follow_ups').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('challans').select('specimens_given'),
    supabase.from('challans').select('district'),
  ]);

  let booksDistributed = 0;
  (challanSpecimens.data || []).forEach(c => {
    if (Array.isArray(c.specimens_given)) booksDistributed += c.specimens_given.length;
  });
  const districtsCovered = new Set((challanDistricts.data || []).map(c => c.district)).size;

  // ── Section B: District Analysis ──
  const { data: allChallans } = await supabase.from('challans').select('district');
  const { data: allLeads } = await supabase.from('leads').select('district, status');
  const { data: allFollowUps } = await supabase
    .from('follow_ups')
    .select('status, lead:leads!lead_id ( district )')
    .eq('status', 'pending');

  const districtStats: Record<string, { challan_count: number; lead_count: number; followup_count: number }> = {};
  const ensureD = (d: string) => {
    if (!districtStats[d]) districtStats[d] = { challan_count: 0, lead_count: 0, followup_count: 0 };
  };
  (allChallans || []).forEach(c => { ensureD(c.district); districtStats[c.district].challan_count++; });
  (allLeads || []).forEach(l => { ensureD(l.district); districtStats[l.district].lead_count++; });
  (allFollowUps || []).forEach(f => {
    const lead = f.lead as unknown as { district: string } | null;
    if (lead?.district) { ensureD(lead.district); districtStats[lead.district].followup_count++; }
  });
  const districtData = Object.entries(districtStats)
    .map(([district, s]) => ({ district, ...s }))
    .sort((a, b) => b.challan_count - a.challan_count)
    .slice(0, 10);

  // ── Section C: Book Analysis ──
  const bookStats: Record<string, { distribution_count: number; lead_ids: Set<string> }> = {};
  const { data: bookChallans } = await supabase.from('challans').select('specimens_given, lead_id');
  (bookChallans || []).forEach(c => {
    const specimens = c.specimens_given as string[];
    if (Array.isArray(specimens)) {
      specimens.forEach(name => {
        if (!bookStats[name]) bookStats[name] = { distribution_count: 0, lead_ids: new Set() };
        bookStats[name].distribution_count++;
        if (c.lead_id) bookStats[name].lead_ids.add(c.lead_id);
      });
    }
  });
  const bookData = Object.entries(bookStats)
    .map(([book_name, s]) => ({
      book_name,
      distribution_count: s.distribution_count,
      unique_leads: s.lead_ids.size,
      repeat_count: Math.max(0, s.distribution_count - s.lead_ids.size),
    }))
    .sort((a, b) => b.distribution_count - a.distribution_count)
    .slice(0, 10);

  // ── Section D: Representative Performance ──
  const { data: repChallans } = await supabase.from('challans').select('agent_name');
  const { data: repLeads } = await supabase.from('leads').select('agent_name, status');
  const { data: repFollowUps } = await supabase
    .from('follow_ups')
    .select('status, lead:leads!lead_id ( agent_name )')
    .eq('status', 'completed');

  const repStats: Record<string, { challan_count: number; lead_count: number; interested_count: number; followups_completed: number }> = {};
  const ensureR = (n: string) => {
    if (!repStats[n]) repStats[n] = { challan_count: 0, lead_count: 0, interested_count: 0, followups_completed: 0 };
  };
  (repChallans || []).forEach(c => { if (c.agent_name) { ensureR(c.agent_name); repStats[c.agent_name].challan_count++; } });
  (repLeads || []).forEach(l => {
    if (l.agent_name) {
      ensureR(l.agent_name); repStats[l.agent_name].lead_count++;
      if (l.status === 'interested') repStats[l.agent_name].interested_count++;
    }
  });
  (repFollowUps || []).forEach(f => {
    const lead = f.lead as unknown as { agent_name: string } | null;
    if (lead?.agent_name) { ensureR(lead.agent_name); repStats[lead.agent_name].followups_completed++; }
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

  // ── Section E: Follow-Up Queue ──
  const { data: dueToday } = await supabase
    .from('follow_ups')
    .select('id, followup_date, status, lead:leads!lead_id ( id, contact_person, institute_name, district, mobile_no )')
    .eq('followup_date', today).eq('status', 'pending').order('followup_date').limit(10);
  const { data: overdue } = await supabase
    .from('follow_ups')
    .select('id, followup_date, status, lead:leads!lead_id ( id, contact_person, institute_name, district, mobile_no )')
    .lt('followup_date', today).eq('status', 'pending').order('followup_date').limit(10);
  const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
  const { data: upcoming } = await supabase
    .from('follow_ups')
    .select('id, followup_date, status, lead:leads!lead_id ( id, contact_person, institute_name, district, mobile_no )')
    .gt('followup_date', today).lte('followup_date', nextWeek.toISOString().split('T')[0])
    .eq('status', 'pending').order('followup_date').limit(10);

  // ── Section F: Lead Intelligence ──
  // Most frequently visited institutions
  const instituteCounts: Record<string, { count: number; district: string; last_visit: string }> = {};
  const { data: instChallans } = await supabase.from('challans').select('institute_name, district, challan_date').order('challan_date', { ascending: false });
  (instChallans || []).forEach(c => {
    if (!instituteCounts[c.institute_name]) {
      instituteCounts[c.institute_name] = { count: 0, district: c.district, last_visit: c.challan_date };
    }
    instituteCounts[c.institute_name].count++;
  });
  const topInstitutions = Object.entries(instituteCounts)
    .map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Most frequently visited teachers
  const teacherCounts: Record<string, { count: number; district: string; last_visit: string }> = {};
  const { data: teachChallans } = await supabase.from('challans').select('teacher_name, district, challan_date').order('challan_date', { ascending: false });
  (teachChallans || []).forEach(c => {
    if (!teacherCounts[c.teacher_name]) {
      teacherCounts[c.teacher_name] = { count: 0, district: c.district, last_visit: c.challan_date };
    }
    teacherCounts[c.teacher_name].count++;
  });
  const topTeachers = Object.entries(teacherCounts)
    .map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Lead categories (Hot/Warm/Cold)
  const leadCategories: { hot: number; warm: number; cold: number } = { hot: 0, warm: 0, cold: 0 };
  // Group leads by mobile to get visit counts
  const leadVisits: Record<string, { visits: number; interested: boolean }> = {};
  (allLeads || []).forEach(l => {
    // Count visits per lead would need challan count - approximate from lead data
    leadVisits[l.district + '_' + Math.random()] = { visits: 1, interested: l.status === 'interested' };
  });
  // Get challan counts per lead
  const { data: leadChallans } = await supabase.from('challans').select('lead_id');
  const challanPerLead: Record<string, number> = {};
  (leadChallans || []).forEach(c => {
    if (c.lead_id) challanPerLead[c.lead_id] = (challanPerLead[c.lead_id] || 0) + 1;
  });
  // Classify leads
  const { data: classifyLeads } = await supabase.from('leads').select('id, status');
  (classifyLeads || []).forEach(l => {
    const visits = challanPerLead[l.id] || 1;
    const interested = l.status === 'interested';
    if (visits >= 3 && interested) leadCategories.hot++;
    else if (visits >= 2 || interested) leadCategories.warm++;
    else leadCategories.cold++;
  });

  // Lead status breakdown
  const statusCounts: Record<string, number> = {};
  (allLeads || []).forEach(l => {
    if (l.status !== 'converted') {
      statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
    }
  });
  const leadStatusData = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

  return {
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
      due_today: (dueToday as any) || [],
      overdue: (overdue as any) || [],
      upcoming: (upcoming as any) || [],
    },
    leadIntelligence: {
      topInstitutions,
      topTeachers,
      leadCategories,
    },
    leadStatusData,
  };
}

export default async function DashboardPage() {
  const data = await fetchDashboardData();
  return <DashboardClient data={data} />;
}
