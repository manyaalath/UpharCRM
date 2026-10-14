import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/session';

const WRITE_ROLES = ['admin', 'books'];

async function canWrite(request: Request) {
  const session = await getRequestSession(request);
  return !!session && WRITE_ROLES.includes(session.role);
}

// GET /api/books — list all books. ?with_counts=1 adds copies distributed + challans per title.
export async function GET(request: Request) {
  const supabase = await createClient();
  const withCounts = new URL(request.url).searchParams.get('with_counts') === '1';

  const { data, error } = await supabase
    .from('books')
    .select('id, title, created_at')
    .order('title', { ascending: true })
    .range(0, 4999);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!withCounts) return NextResponse.json({ data });

  // Page through challan_books (PostgREST caps each response at 1000 rows).
  const copies = new Map<string, number>();
  const challans = new Map<string, number>();
  for (let from = 0; ; from += 1000) {
    const { data: lines, error: lineError } = await supabase
      .from('challan_books')
      .select('book_id, quantity')
      .range(from, from + 999);
    if (lineError || !lines) break;
    for (const l of lines) {
      copies.set(l.book_id, (copies.get(l.book_id) || 0) + (l.quantity || 1));
      challans.set(l.book_id, (challans.get(l.book_id) || 0) + 1);
    }
    if (lines.length < 1000) break;
  }

  return NextResponse.json({
    data: (data || []).map(b => ({ ...b, copies: copies.get(b.id) || 0, challans: challans.get(b.id) || 0 })),
  });
}

// POST /api/books — create a book { title }
export async function POST(request: Request) {
  if (!(await canWrite(request))) {
    return NextResponse.json({ error: 'Only the catalogue team can add books' }, { status: 403 });
  }
  const supabase = await createClient();
  const body = await request.json().catch(() => ({}));

  const title = String(body.title || '').trim().replace(/\s+/g, ' ');
  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 422 });
  }
  if (title.length > 255) {
    return NextResponse.json({ error: 'Title must be under 255 characters' }, { status: 422 });
  }

  const { data: existing } = await supabase.from('books').select('id').ilike('title', title).limit(1);
  if (existing?.length) {
    return NextResponse.json({ error: 'A book with this title already exists' }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('books')
    .insert([{ title }])
    .select('id, title, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A book with this title already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

// DELETE /api/books?id=... — remove a book
export async function DELETE(request: Request) {
  if (!(await canWrite(request))) {
    return NextResponse.json({ error: 'Only the catalogue team can delete books' }, { status: 403 });
  }
  const supabase = await createClient();
  const id = new URL(request.url).searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Book id is required' }, { status: 422 });
  }

  const { error } = await supabase.from('books').delete().eq('id', id);

  if (error) {
    // FK violation — book is referenced by a challan
    if (error.code === '23503') {
      return NextResponse.json({ error: 'This book has been distributed and cannot be deleted' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
