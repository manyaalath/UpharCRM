import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  // Get all challans with agent_name
  const { data: challans } = await supabase.from('challans').select('agent_name');
  // Get all leads with agent_name and status
  const { data: leads } = await supabase.from('leads').select('agent_name, status');
  // Get completed follow-ups with lead info
  const { data: followUps } = await supabase
    .from('follow_ups')
    .select('status, lead:leads!lead_id ( agent_name )')
    .eq('status', 'completed');

  const stats: Record<string, {
    challan_count: number;
    lead_count: number;
    interested_count: number;
    followups_completed: number;
    fields_filled: number;
    total_fields: number;
  }> = {};

  const ensureRep = (name: string) => {
    if (!stats[name]) {
      stats[name] = { challan_count: 0, lead_count: 0, interested_count: 0, followups_completed: 0, fields_filled: 0, total_fields: 0 };
    }
  };

  // Count challans per representative
  (challans || []).forEach(c => {
    if (c.agent_name) {
      ensureRep(c.agent_name);
      stats[c.agent_name].challan_count += 1;
    }
  });

  // Count leads and interested leads per representative
  (leads || []).forEach(l => {
    if (l.agent_name) {
      ensureRep(l.agent_name);
      stats[l.agent_name].lead_count += 1;
      if (l.status === 'interested') {
        stats[l.agent_name].interested_count += 1;
      }
    }
  });

  // Count completed follow-ups per representative
  (followUps || []).forEach(f => {
    const lead = f.lead as unknown as { agent_name: string } | null;
    if (lead?.agent_name) {
      ensureRep(lead.agent_name);
      stats[lead.agent_name].followups_completed += 1;
    }
  });

  // Calculate performance score
  // Formula: (challans * 0.4) + (interested_leads * 0.4) + (data_quality * 0.2)
  // Normalize each component to a 0-100 scale
  const maxChallans = Math.max(1, ...Object.values(stats).map(s => s.challan_count));
  const maxInterested = Math.max(1, ...Object.values(stats).map(s => s.interested_count));

  const data = Object.entries(stats)
    .map(([representative_name, s]) => {
      const challanScore = (s.challan_count / maxChallans) * 100;
      const interestedScore = (s.interested_count / maxInterested) * 100;
      // Data quality: ratio of leads with interested status to total leads
      const dataQuality = s.lead_count > 0 ? (s.interested_count / s.lead_count) * 100 : 0;

      const performance_score = Math.round(
        (challanScore * 0.4) + (interestedScore * 0.4) + (dataQuality * 0.2)
      );

      return {
        representative_name,
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
