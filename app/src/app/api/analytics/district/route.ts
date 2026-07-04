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

  // Use normalized schema: challans → leads → institute_contacts → institutes → locations
  const { data: challans, error: challansError } = await supabase
    .from('challans')
    .select('lead_id, leads!inner(institute_contacts!inner(institutes!inner(locations!inner(district))))');

  if (challansError) return NextResponse.json({ error: challansError.message }, { status: 500 });

  const { data: leads } = await supabase
    .from('leads')
    .select('id, institute_contacts!inner(institutes!inner(locations!inner(district)))');

  const { data: followUps } = await supabase
    .from('follow_ups')
    .select('lead_id, status, leads!inner(institute_contacts!inner(institutes!inner(locations!inner(district))))')
    .eq('status', 'pending');

  // Aggregate by district
  const districtStats: Record<string, { challan_count: number; lead_count: number; followup_count: number }> = {};

  const ensureDistrict = (d: string) => {
    if (!districtStats[d]) districtStats[d] = { challan_count: 0, lead_count: 0, followup_count: 0 };
  };

  const getDistrict = (row: Record<string, unknown>): string | null => {
    const leads = row.leads as Record<string, unknown> | undefined;
    const ic = (leads?.institute_contacts || row.institute_contacts) as Record<string, unknown> | undefined;
    const inst = ic?.institutes as Record<string, unknown> | undefined;
    const loc = inst?.locations as { district?: string } | undefined;
    return loc?.district || null;
  };

  (challans || []).forEach((c: Record<string, unknown>) => {
    const district = getDistrict(c);
    if (district) {
      if (districtFilter && !districtFilter.includes(district)) return;
      ensureDistrict(district);
      districtStats[district].challan_count += 1;
    }
  });

  (leads || []).forEach((l: Record<string, unknown>) => {
    const ic = l.institute_contacts as Record<string, unknown> | undefined;
    const inst = ic?.institutes as Record<string, unknown> | undefined;
    const loc = inst?.locations as { district?: string } | undefined;
    const district = loc?.district;
    if (district) {
      if (districtFilter && !districtFilter.includes(district)) return;
      ensureDistrict(district);
      districtStats[district].lead_count += 1;
    }
  });

  (followUps || []).forEach((f: Record<string, unknown>) => {
    const district = getDistrict(f);
    if (district) {
      if (districtFilter && !districtFilter.includes(district)) return;
      ensureDistrict(district);
      districtStats[district].followup_count += 1;
    }
  });

  const data = Object.entries(districtStats)
    .map(([district, stats]) => ({ district, ...stats }))
    .sort((a, b) => b.challan_count - a.challan_count);

  return NextResponse.json({ data });
}
