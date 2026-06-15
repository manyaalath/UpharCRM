import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  const { data: challans, error } = await supabase.from('challans').select('district');
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const districtCounts: Record<string, number> = {};
  (challans || []).forEach(c => {
    districtCounts[c.district] = (districtCounts[c.district] || 0) + 1;
  });

  const data = Object.entries(districtCounts)
    .map(([district, count]) => ({ district, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ data });
}
