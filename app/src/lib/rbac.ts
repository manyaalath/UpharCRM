// ============================================================
// Uphar CRM — RBAC (Role-Based Access Control) Helpers
// ============================================================

import { cookies } from 'next/headers';
import { verifyCookie } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export type UserRole = 'rep' | 'data_entry' | 'telecaller' | 'manager' | 'admin';

export interface UserContext {
  userId: string;
  role: UserRole;
  name: string;
  email: string;
  districts: string[]; // empty = all districts (admin), populated = scoped
}

// Role hierarchy for permission checks
const ROLE_PERMISSIONS: Record<UserRole, {
  canAccessDashboard: boolean;
  canAccessAnalytics: boolean;
  canAccessDataEntry: boolean;
  canAccessImport: boolean;
  canAccessExport: boolean;
  canAccessFollowUps: boolean;
  canAccessUserManagement: boolean;
  canEditLeads: boolean;
  canEditChallans: boolean;
}> = {
  rep: {
    canAccessDashboard: false,
    canAccessAnalytics: false,
    canAccessDataEntry: false,
    canAccessImport: false,
    canAccessExport: false,
    canAccessFollowUps: false,
    canAccessUserManagement: false,
    canEditLeads: false,
    canEditChallans: false,
  },
  data_entry: {
    canAccessDashboard: false,
    canAccessAnalytics: false,
    canAccessDataEntry: true,
    canAccessImport: true,
    canAccessExport: false,
    canAccessFollowUps: false,
    canAccessUserManagement: false,
    canEditLeads: true,
    canEditChallans: true,
  },
  telecaller: {
    canAccessDashboard: false,
    canAccessAnalytics: false,
    canAccessDataEntry: false,
    canAccessImport: false,
    canAccessExport: false,
    canAccessFollowUps: true,
    canAccessUserManagement: false,
    canEditLeads: false,
    canEditChallans: false,
  },
  manager: {
    canAccessDashboard: true,
    canAccessAnalytics: true,
    canAccessDataEntry: true,
    canAccessImport: true,
    canAccessExport: true,
    canAccessFollowUps: true,
    canAccessUserManagement: false,
    canEditLeads: true,
    canEditChallans: true,
  },
  admin: {
    canAccessDashboard: true,
    canAccessAnalytics: true,
    canAccessDataEntry: true,
    canAccessImport: true,
    canAccessExport: true,
    canAccessFollowUps: true,
    canAccessUserManagement: true,
    canEditLeads: true,
    canEditChallans: true,
  },
};

/**
 * Extract user context from request cookies.
 * Returns null if not authenticated.
 */
export async function getUserContext(request?: Request): Promise<UserContext | null> {
  try {
    let token: string | undefined;

    if (request) {
      // Extract from request headers (API route)
      const cookieHeader = request.headers.get('cookie') || '';
      const match = cookieHeader.match(/app_auth=([^;]+)/);
      token = match?.[1];

      // Fallback to de_auth or crm_auth for backward compat
      if (!token) {
        const deMatch = cookieHeader.match(/de_auth=([^;]+)/);
        const crmMatch = cookieHeader.match(/crm_auth=([^;]+)/);
        token = deMatch?.[1] || crmMatch?.[1];
      }
    } else {
      // Server component — use next/headers
      const cookieStore = await cookies();
      token = cookieStore.get('app_auth')?.value
           || cookieStore.get('de_auth')?.value
           || cookieStore.get('crm_auth')?.value;
    }

    if (!token) return null;

    const payload = await verifyCookie(token);
    if (!payload) return null;

    // New format: "user:{id}" or legacy "crm" / "de:{id}"
    let userId: string | null = null;

    if (payload.startsWith('user:')) {
      userId = payload.slice(5);
    } else if (payload.startsWith('de:')) {
      userId = payload.slice(3);
    } else if (payload === 'crm') {
      // Legacy CRM login — treat as admin with no specific user ID
      // This is a transitional path; eventually all users will have individual accounts
      return {
        userId: 'legacy-admin',
        role: 'admin',
        name: 'Admin',
        email: 'admin@uphar.com',
        districts: [], // empty = all districts
      };
    } else {
      return null;
    }

    // Fetch user details + districts from DB
    const supabase = await createClient();
    const { data: user } = await supabase
      .from('data_entry_users')
      .select('id, name, email, role, is_active')
      .eq('id', userId)
      .single();

    if (!user || !user.is_active) return null;

    // Fetch district assignments for manager/telecaller
    let districts: string[] = [];
    if (user.role === 'manager' || user.role === 'telecaller') {
      const { data: assignments } = await supabase
        .from('district_assignments')
        .select('district')
        .eq('user_id', userId);
      districts = (assignments || []).map(a => a.district);
    }
    // admin and data_entry get empty array (= all districts)
    // rep gets empty array too (but their access is restricted by role, not district)

    return {
      userId: user.id,
      role: user.role as UserRole,
      name: user.name,
      email: user.email,
      districts,
    };
  } catch {
    return null;
  }
}

/**
 * Check if user has a specific permission.
 */
export function hasPermission(role: UserRole, permission: keyof typeof ROLE_PERMISSIONS['admin']): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}

/**
 * Require specific roles — throws 403 response if not authorized.
 * Used in API routes.
 */
export async function requireRole(request: Request, allowedRoles: UserRole[]): Promise<UserContext> {
  const ctx = await getUserContext(request);
  if (!ctx) {
    throw new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!allowedRoles.includes(ctx.role)) {
    throw new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return ctx;
}

/**
 * Get district filter for queries.
 * Returns null if user can access all districts (admin/data_entry).
 * Returns string[] if user is scoped to specific districts.
 */
export function getDistrictFilter(ctx: UserContext): string[] | null {
  if (ctx.role === 'admin' || ctx.role === 'data_entry') {
    return null; // no filter — access all
  }
  return ctx.districts; // manager/telecaller get their assigned districts
}

/**
 * Log an action to the audit log.
 */
export async function logAudit(
  actorId: string,
  action: string,
  targetId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  if (actorId === 'legacy-admin') return; // skip for legacy CRM login
  try {
    const supabase = await createClient();
    await supabase.from('audit_log').insert({
      actor_id: actorId,
      action,
      target_id: targetId || null,
      details: details || {},
    });
  } catch (e) {
    console.error('Audit log failed:', e);
  }
}

export { ROLE_PERMISSIONS };
