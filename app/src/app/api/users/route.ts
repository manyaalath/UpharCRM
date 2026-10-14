import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRequestSession } from '@/lib/session';
import type { Role, Session } from '@/lib/auth';

// Admin-only account management for both user tables.
// staff = data_entry_users (role column), books = book_entry_users.

const STAFF_ROLES: Role[] = ['admin', 'manager', 'telecaller', 'data_entry', 'rep'];
type Source = 'staff' | 'books';
type Action = 'approve' | 'reject' | 'set_role' | 'deactivate' | 'reactivate';
type AccountStatus = 'pending' | 'active' | 'deactivated' | 'rejected';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireAdmin(request: Request): Promise<Session | null> {
  const session = await getRequestSession(request);
  return session?.role === 'admin' ? session : null;
}

function staffStatus(status: string, isActive: boolean | null): AccountStatus {
  if (status === 'pending') return 'pending';
  if (status === 'rejected') return 'rejected';
  return isActive === false ? 'deactivated' : 'active';
}

export async function GET(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const supabase = await createClient();
  const [staffRes, booksRes] = await Promise.all([
    supabase.from('data_entry_users').select('id, name, email, status, role, is_active, created_at'),
    supabase.from('book_entry_users').select('id, name, email, status, created_at'),
  ]);

  if (staffRes.error && staffRes.error.code !== '42P01') {
    return NextResponse.json({ error: staffRes.error.message }, { status: 500 });
  }

  const staff = (staffRes.data || []).map(u => ({
    source: 'staff' as Source,
    id: u.id,
    name: u.name,
    email: u.email,
    role: (STAFF_ROLES.includes(u.role) ? u.role : 'data_entry') as Role,
    status: staffStatus(u.status, u.is_active),
    created_at: u.created_at,
  }));

  // Books accounts: 'rejected' after approval is how access is revoked.
  const books = (booksRes.error ? [] : booksRes.data || []).map(u => ({
    source: 'books' as Source,
    id: u.id,
    name: u.name,
    email: u.email,
    role: 'books' as Role,
    status: (u.status === 'approved' ? 'active' : u.status) as AccountStatus,
    created_at: u.created_at,
  }));

  const data = [...staff, ...books].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return NextResponse.json({ data });
}

export async function PATCH(request: Request) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const source = body.source as Source;
  const id = String(body.id || '');
  const action = body.action as Action;
  const role = body.role as Role | undefined;

  if (!['staff', 'books'].includes(source) || !id || !['approve', 'reject', 'set_role', 'deactivate', 'reactivate'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  if (role !== undefined && !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }
  if (source === 'books' && action === 'set_role') {
    return NextResponse.json({ error: 'Book catalogue accounts have a fixed role' }, { status: 400 });
  }

  // An admin can't lock themselves out.
  const isSelf = source === 'staff' && session.src === 'staff' && session.uid === id;
  if (isSelf && (action === 'reject' || action === 'deactivate' || (action === 'set_role' && role !== 'admin'))) {
    return NextResponse.json({ error: "You can't remove your own admin access" }, { status: 400 });
  }

  const supabase = await createClient();
  const table = source === 'books' ? 'book_entry_users' : 'data_entry_users';

  const { data: target, error: findError } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
  if (!target) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  let updates: Record<string, unknown>;
  if (source === 'books') {
    updates = { status: action === 'approve' || action === 'reactivate' ? 'approved' : 'rejected' };
  } else {
    switch (action) {
      case 'approve':
        updates = { status: 'approved', is_active: true, ...(role ? { role } : {}) };
        break;
      case 'reject':
        updates = { status: 'rejected' };
        break;
      case 'set_role':
        if (!role) return NextResponse.json({ error: 'Role is required' }, { status: 400 });
        updates = { role };
        break;
      case 'deactivate':
        updates = { is_active: false };
        break;
      case 'reactivate':
      default:
        updates = { is_active: true, status: 'approved' };
        break;
    }
  }

  const { error } = await supabase.from(table).update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit trail. actor_id must reference data_entry_users, so the env bootstrap
  // admin can't be recorded as actor — its email goes into details instead.
  if (UUID.test(session.uid) && session.src === 'staff') {
    await supabase.from('audit_log').insert({
      actor_id: session.uid,
      action: `user.${action}`,
      target_id: UUID.test(id) ? id : null,
      details: {
        actor_email: session.email,
        source,
        target_email: target.email,
        previous: { status: target.status, role: target.role ?? 'books', is_active: target.is_active },
        changes: updates,
      },
    }).then(() => undefined, () => undefined);
  }

  return NextResponse.json({ ok: true });
}
