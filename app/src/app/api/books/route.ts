import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/books — list all books
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('books')
    .select('id, title, created_at')
    .order('title', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

// POST /api/books — create a book { title }
export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  const title = (body.title || '').trim();
  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 422 });
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
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

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
