import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  const { data: leads, error } = await supabase.from('leads').select('status');
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const statusCounts: Record<string, number> = {};
  (leads || []).forEach(l => {
    // Skip 'converted' status (removed from PRD)
    if (l.status === 'converted') return;
    statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
  });

  const data = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

  return NextResponse.json({ data });
}
