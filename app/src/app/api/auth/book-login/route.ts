import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hashPassword, verifyPassword, signCookie, COOKIE_OPTS } from '@/lib/auth';

// POST /api/auth/book-login — Books portal register / login
export async function POST(request: Request) {
  const { mode, name, email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const supabase = await createClient();

  if (mode === 'register') {
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('book_entry_users')
      .select('id, status')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      if (existing.status === 'pending') {
        return NextResponse.json({ status: 'pending' });
      }
      if (existing.status === 'approved') {
        return NextResponse.json({ error: 'Account already exists. Please login.' }, { status: 409 });
      }
      if (existing.status === 'rejected') {
        return NextResponse.json({ error: 'Your access request was rejected. Contact the admin.' }, { status: 403 });
      }
    }

    const password_hash = await hashPassword(password);

    const { error } = await supabase.from('book_entry_users').insert([{
      name: name.trim(),
      email: email.toLowerCase(),
      password_hash,
      status: 'pending',
    }]);

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: 'pending' });
  }

  // mode === 'login'
  const { data: user } = await supabase
    .from('book_entry_users')
    .select('id, password_hash, status')
    .eq('email', email.toLowerCase())
    .single();

  if (!user) {
    return NextResponse.json({ error: 'No account found. Please request access first.' }, { status: 404 });
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  if (user.status === 'pending') {
    return NextResponse.json({ status: 'pending' });
  }

  if (user.status === 'rejected') {
    return NextResponse.json({ error: 'Your access request was rejected. Contact the admin.' }, { status: 403 });
  }

  // approved
  const token = await signCookie(`book:${user.id}`);
  const res = NextResponse.json({ status: 'approved' });
  res.cookies.set('book_auth', token, COOKIE_OPTS);
  return res;
}
