import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/books/bulk — bulk-insert book titles { titles: string[] }
// Dedupes against existing titles and within the payload.
export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  const rawTitles: unknown[] = Array.isArray(body.titles) ? body.titles : [];

  // Normalize + de-dupe within the payload (case-insensitive)
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const t of rawTitles) {
    const title = String(t ?? '').trim();
    if (!title) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(title);
  }

  if (cleaned.length === 0) {
    return NextResponse.json({ error: 'No valid book titles found in the file' }, { status: 422 });
  }

  // Filter out titles that already exist
  const { data: existing, error: fetchError } = await supabase
    .from('books')
    .select('title');
  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const existingSet = new Set((existing || []).map(b => (b.title || '').toLowerCase()));
  const toInsert = cleaned.filter(t => !existingSet.has(t.toLowerCase()));
  const skipped = cleaned.length - toInsert.length;

  let created = 0;
  if (toInsert.length > 0) {
    const { data, error } = await supabase
      .from('books')
      .insert(toInsert.map(title => ({ title })))
      .select('id');
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    created = data?.length || 0;
  }

  return NextResponse.json({
    total: cleaned.length,
    created,
    skipped,
  });
}
