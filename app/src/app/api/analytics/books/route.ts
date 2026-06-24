import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  // Get all challans specimen data
  const { data: challans, error } = await supabase.from('challans').select('specimens_given, lead_id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aggregate book-wise distribution
  const bookStats: Record<string, { distribution_count: number; lead_ids: Set<string> }> = {};

  (challans || []).forEach(c => {
    const specimens = c.specimens_given as string[];
    if (Array.isArray(specimens)) {
      specimens.forEach(bookName => {
        if (!bookStats[bookName]) {
          bookStats[bookName] = { distribution_count: 0, lead_ids: new Set() };
        }
        bookStats[bookName].distribution_count += 1;
        if (c.lead_id) bookStats[bookName].lead_ids.add(c.lead_id);
      });
    }
  });

  const data = Object.entries(bookStats)
    .map(([book_name, stats]) => ({
      book_name,
      distribution_count: stats.distribution_count,
      unique_leads: stats.lead_ids.size,
      repeat_count: Math.max(0, stats.distribution_count - stats.lead_ids.size),
    }))
    .sort((a, b) => b.distribution_count - a.distribution_count);

  return NextResponse.json({ data });
}
