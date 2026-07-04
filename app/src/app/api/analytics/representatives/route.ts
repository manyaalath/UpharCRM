import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getUserContext, getDistrictFilter } from '@/lib/rbac';

export async function GET(request: Request) {
  const ctx = await getUserContext(request);
  if (!ctx) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Only admin and manager can access analytics
  if (!['admin', 'manager'].includes(ctx.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const supabase = await createClient();
  const districtFilter = getDistrictFilter(ctx);

  // Manager with no assigned districts — return empty
  if (districtFilter && districtFilter.length === 0) {
    return NextResponse.json({ data: [] });
  }

  // Get agents with their challans, leads, and follow-ups
  const { data: agents } = await supabase
    .from('agents')
    .select('id, name')
    .eq('is_active', true);

  if (!agents || agents.length === 0) {
    return NextResponse.json({ data: [] });
  }

  // Get challans per agent with district info
  const { data: challans } = await supabase
    .from('challans')
    .select('agent_id, leads!inner(status, institute_contacts!inner(institutes!inner(locations!inner(district))))');

  // Get completed follow-ups per agent
  const { data: followUps } = await supabase
    .from('follow_ups')
    .select('agent_id, status')
    .eq('status', 'completed');

  // Build stats per agent
  const stats: Record<string, {
    challan_count: number;
    lead_count: number;
    interested_count: number;
    followups_completed: number;
  }> = {};

  const ensureRep = (agentId: string) => {
    if (!stats[agentId]) {
      stats[agentId] = { challan_count: 0, lead_count: 0, interested_count: 0, followups_completed: 0 };
    }
  };

  // Count challans per agent, filtered by district
  (challans || []).forEach((c: Record<string, unknown>) => {
    const agentId = c.agent_id as string;
    if (!agentId) return;

    const lead = c.leads as Record<string, unknown> | undefined;
    const ic = lead?.institute_contacts as Record<string, unknown> | undefined;
    const inst = ic?.institutes as Record<string, unknown> | undefined;
    const loc = inst?.locations as { district?: string } | undefined;
    const district = loc?.district;

    if (districtFilter && district && !districtFilter.includes(district)) return;

    ensureRep(agentId);
    stats[agentId].challan_count += 1;

    // Count leads
    stats[agentId].lead_count += 1;
    if (lead?.status === 'interested') {
      stats[agentId].interested_count += 1;
    }
  });

  // Count completed follow-ups per agent
  (followUps || []).forEach((f: Record<string, unknown>) => {
    const agentId = f.agent_id as string;
    if (!agentId) return;
    ensureRep(agentId);
    stats[agentId].followups_completed += 1;
  });

  // Build agent name map
  const agentMap = new Map(agents.map(a => [a.id, a.name]));

  // Calculate performance score
  const maxChallans = Math.max(1, ...Object.values(stats).map(s => s.challan_count));
  const maxInterested = Math.max(1, ...Object.values(stats).map(s => s.interested_count));

  const data = Object.entries(stats)
    .map(([agentId, s]) => {
      const challanScore = (s.challan_count / maxChallans) * 100;
      const interestedScore = (s.interested_count / maxInterested) * 100;
      const dataQuality = s.lead_count > 0 ? (s.interested_count / s.lead_count) * 100 : 0;

      const performance_score = Math.round(
        (challanScore * 0.4) + (interestedScore * 0.4) + (dataQuality * 0.2)
      );

      return {
        representative_name: agentMap.get(agentId) || 'Unknown',
        challan_count: s.challan_count,
        lead_count: s.lead_count,
        interested_count: s.interested_count,
        followups_completed: s.followups_completed,
        performance_score,
      };
    })
    .sort((a, b) => b.performance_score - a.performance_score);

  return NextResponse.json({ data });
}
