import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hashPassword } from '@/lib/auth';
import { getUserContext, logAudit } from '@/lib/rbac';
import type { UserRole } from '@/lib/rbac';

const VALID_ROLES: UserRole[] = ['rep', 'data_entry', 'telecaller', 'manager', 'admin'];

// GET /api/users — List all users (admin only)
export async function GET(request: Request) {
  const ctx = await getUserContext(request);
  if (!ctx || ctx.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const supabase = await createClient();

  const { data: users, error } = await supabase
    .from('data_entry_users')
    .select('id, name, email, role, status, is_active, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch all district assignments in one query
  const { data: allAssignments } = await supabase
    .from('district_assignments')
    .select('user_id, district');

  // Group assignments by user_id
  const assignmentMap: Record<string, string[]> = {};
  (allAssignments || []).forEach((a: { user_id: string; district: string }) => {
    if (!assignmentMap[a.user_id]) assignmentMap[a.user_id] = [];
    assignmentMap[a.user_id].push(a.district);
  });

  const enrichedUsers = (users || []).map(u => ({
    ...u,
    districts: assignmentMap[u.id] || [],
  }));

  return NextResponse.json({ data: enrichedUsers });
}

// POST /api/users — Create a new user (admin only)
export async function POST(request: Request) {
  const ctx = await getUserContext(request);
  if (!ctx || ctx.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const { name, email, password, role, districts } = body;

  // Validate
  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 });
  }

  const supabase = await createClient();

  // Check for existing email
  const { data: existing } = await supabase
    .from('data_entry_users')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();

  if (existing) {
    return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
  }

  // Create user
  const password_hash = await hashPassword(password);
  const { data: newUser, error } = await supabase
    .from('data_entry_users')
    .insert({
      name: name.trim(),
      email: email.toLowerCase(),
      password_hash,
      role,
      status: 'approved', // Admin-created users are auto-approved
      is_active: true,
    })
    .select('id, name, email, role, status, is_active, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Assign districts if provided
  if (districts && Array.isArray(districts) && districts.length > 0 && newUser) {
    const districtRows = districts.map((d: string) => ({
      user_id: newUser.id,
      district: d,
    }));
    await supabase.from('district_assignments').insert(districtRows);
  }

  // Audit
  await logAudit(ctx.userId, 'user_created', newUser?.id, {
    name: name.trim(),
    email: email.toLowerCase(),
    role,
    districts: districts || [],
  });

  return NextResponse.json({ data: { ...newUser, districts: districts || [] } }, { status: 201 });
}

// PATCH /api/users — Update a user (admin only)
export async function PATCH(request: Request) {
  const ctx = await getUserContext(request);
  if (!ctx || ctx.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const { id, role, districts, is_active, name } = body;

  if (!id) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const changes: Record<string, unknown> = {};

  // Update basic fields
  const updatePayload: Record<string, unknown> = {};
  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 });
    }
    updatePayload.role = role;
    changes.role = role;
  }
  if (is_active !== undefined) {
    updatePayload.is_active = is_active;
    changes.is_active = is_active;
  }
  if (name !== undefined) {
    updatePayload.name = name.trim();
    changes.name = name.trim();
  }

  if (Object.keys(updatePayload).length > 0) {
    const { error } = await supabase
      .from('data_entry_users')
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Update districts if provided
  if (districts !== undefined && Array.isArray(districts)) {
    // Delete existing assignments
    await supabase.from('district_assignments').delete().eq('user_id', id);

    // Insert new ones
    if (districts.length > 0) {
      const districtRows = districts.map((d: string) => ({
        user_id: id,
        district: d,
      }));
      await supabase.from('district_assignments').insert(districtRows);
    }
    changes.districts = districts;
  }

  // Audit
  await logAudit(ctx.userId, 'user_updated', id, changes);

  return NextResponse.json({ ok: true });
}
