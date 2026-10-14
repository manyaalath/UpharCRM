import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hashPassword } from '@/lib/auth';

// POST /api/auth/register — request access. { name, email, password, product: 'challans' | 'books' }
// Staff requests land as role 'data_entry'; an admin can change the role on approval.
export async function POST(request: Request) {
  const { name, email: rawEmail, password, product } = await request.json().catch(() => ({}));
  const email = String(rawEmail || '').trim().toLowerCase();

  if (!name?.trim() || !email || !password) {
    return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
  }
  if (String(password).length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
  }

  const table = product === 'books' ? 'book_entry_users' : 'data_entry_users';
  const supabase = await createClient();

  const { data: existing } = await supabase.from(table).select('id, status').eq('email', email).maybeSingle();
  if (existing) {
    if (existing.status === 'pending') return NextResponse.json({ status: 'pending' });
    if (existing.status === 'approved') {
      return NextResponse.json({ error: 'Account already exists. Please sign in.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Your access request was rejected. Contact the admin.' }, { status: 403 });
  }

  const { error } = await supabase.from(table).insert([{
    name: name.trim(),
    email,
    password_hash: await hashPassword(String(password)),
    status: 'pending',
  }]);

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: 'pending' });
}
