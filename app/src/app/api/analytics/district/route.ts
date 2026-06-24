import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  // Get all challans with district
  const { data: challans, error: challansError } = await supabase.from('challans').select('district');
  if (challansError) return NextResponse.json({ error: challansError.message }, { status: 500 });

  // Get all leads with district
  const { data: leads } = await supabase.from('leads').select('district');

  // Get pending follow-ups with lead's district
  const { data: followUps } = await supabase
    .from('follow_ups')
    .select('lead:leads!lead_id ( district )')
    .eq('status', 'pending');

  // Aggregate by district
  const districtStats: Record<string, { challan_count: number; lead_count: number; followup_count: number }> = {};

  const ensureDistrict = (d: string) => {
    if (!districtStats[d]) districtStats[d] = { challan_count: 0, lead_count: 0, followup_count: 0 };
  };

  (challans || []).forEach(c => {
    ensureDistrict(c.district);
    districtStats[c.district].challan_count += 1;
  });

  (leads || []).forEach(l => {
    ensureDistrict(l.district);
    districtStats[l.district].lead_count += 1;
  });

  (followUps || []).forEach(f => {
    const lead = f.lead as unknown as { district: string } | null;
    if (lead?.district) {
      ensureDistrict(lead.district);
      districtStats[lead.district].followup_count += 1;
    }
  });

  const data = Object.entries(districtStats)
    .map(([district, stats]) => ({ district, ...stats }))
    .sort((a, b) => b.challan_count - a.challan_count);

  return NextResponse.json({ data });
}
