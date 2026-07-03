import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyPassword, signCookie, COOKIE_OPTS } from '@/lib/auth';

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const supabase = await createClient();

  // Look up user by email
  const { data: user } = await supabase
    .from('data_entry_users')
    .select('id, name, email, password_hash, status, role, is_active')
    .eq('email', email.toLowerCase())
    .single();

  if (!user) {
    return NextResponse.json({ error: 'No account found with this email.' }, { status: 404 });
  }

  // Check password
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  // Check account status
  if (user.status === 'pending') {
    return NextResponse.json({ status: 'pending', message: 'Your account is awaiting admin approval.' });
  }
  if (user.status === 'rejected') {
    return NextResponse.json({ error: 'Your access request was rejected. Contact the admin.' }, { status: 403 });
  }
  if (!user.is_active) {
    return NextResponse.json({ error: 'Your account has been deactivated. Contact the admin.' }, { status: 403 });
  }

  // Fetch district assignments for the user
  let districts: string[] = [];
  if (user.role === 'manager' || user.role === 'telecaller') {
    const { data: assignments } = await supabase
      .from('district_assignments')
      .select('district')
      .eq('user_id', user.id);
    districts = (assignments || []).map((a: { district: string }) => a.district);
  }

  // Sign cookie with user ID
  const token = await signCookie(`user:${user.id}`);
  const res = NextResponse.json({
    status: 'approved',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      districts,
    },
  });

  res.cookies.set('app_auth', token, COOKIE_OPTS);
  // Also set legacy cookies for backward compatibility during transition
  if (user.role === 'data_entry') {
    res.cookies.set('de_auth', await signCookie(`de:${user.id}`), COOKIE_OPTS);
  }

  return res;
}
