import { createClient } from '@/lib/supabase/server';
import DashboardClient from './DashboardClient';

export const metadata = {
  title: 'Dashboard - Uphar CRM',
  description: 'Super Admin analytics dashboard for Uphar Prakashan Specimen Distribution CRM',
};

async function fetchDashboardData() {
  const supabase = await createClient();

  // Fetch summary KPIs
  const [
    { count: totalChallans },
    { data: institutions },
    { count: totalLeads },
    { count: pendingFollowups },
    { count: notContacted },
    { count: thisMonth },
  ] = await Promise.all([
    supabase.from('challans').select('*', { count: 'exact', head: true }),
    supabase.from('challans').select('institute_name').then(res => ({
      data: [...new Set((res.data || []).map(c => c.institute_name))],
    })),
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'followup_pending'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('challans').select('*', { count: 'exact', head: true })
      .gte('challan_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
  ]);

  // District-wise distribution
  const { data: challansData } = await supabase.from('challans').select('district');
  const districtCounts: Record<string, number> = {};
  (challansData || []).forEach(c => {
    districtCounts[c.district] = (districtCounts[c.district] || 0) + 1;
  });
  const districtData = Object.entries(districtCounts)
    .map(([district, count]) => ({ district, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Lead status breakdown
  const { data: leadsData } = await supabase.from('leads').select('status');
  const statusCounts: Record<string, number> = {};
  (leadsData || []).forEach(l => {
    statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
  });
  const leadStatusData = Object.entries(statusCounts)
    .map(([status, count]) => ({ status, count }));

  // Pending follow-ups (leads with next_followup_date <= today)
  const { data: pendingLeads } = await supabase
    .from('leads')
    .select('*')
    .eq('status', 'followup_pending')
    .order('next_followup_date', { ascending: true })
    .limit(5);

  // Representative performance
  const { data: agentChallans } = await supabase.from('challans').select('agent_name');
  const { data: agentLeads } = await supabase.from('leads').select('agent_name');
  const agentStats: Record<string, { challan_count: number; lead_count: number }> = {};
  (agentChallans || []).forEach(c => {
    if (!agentStats[c.agent_name]) agentStats[c.agent_name] = { challan_count: 0, lead_count: 0 };
    agentStats[c.agent_name].challan_count += 1;
  });
  (agentLeads || []).forEach(l => {
    if (l.agent_name) {
      if (!agentStats[l.agent_name]) agentStats[l.agent_name] = { challan_count: 0, lead_count: 0 };
      agentStats[l.agent_name].lead_count += 1;
    }
  });
  const agentData = Object.entries(agentStats)
    .map(([agent_name, stats]) => ({ agent_name, ...stats }))
    .sort((a, b) => b.challan_count - a.challan_count);

  return {
    summary: {
      total_challans: totalChallans || 0,
      total_institutions: institutions?.length || 0,
      total_leads: totalLeads || 0,
      leads_pending_followup: pendingFollowups || 0,
      leads_not_contacted: notContacted || 0,
      challans_this_month: thisMonth || 0,
    },
    districtData,
    leadStatusData,
    pendingLeads: pendingLeads || [],
    agentData,
  };
}

export default async function DashboardPage() {
  const data = await fetchDashboardData();
  return <DashboardClient data={data} />;
}
