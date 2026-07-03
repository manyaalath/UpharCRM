# UpharCRM — RBAC, Excel Import/Export & Duplicate Detection

Implementation plan for the three features specified in [todo.md](file:///c:/Users/Manya%20Lath/Documents/Uphar%20CRM/todo.md): Role-Based Access Control, Excel Import (bulk challan/lead entry), Duplicate Detection, and Excel Export.

## Current State Summary

The existing app is a **Next.js + Supabase + Tailwind** CRM with:
- **Two auth modes**: CRM admin (single shared password → `crm_auth` cookie) and Data Entry users (email/password → `de_auth` cookie via `data_entry_users` table)
- **Normalized schema** (v4): `locations`, `contacts`, `institutes`, `institute_contacts`, `leads`, `challans`, `challan_books`, `books`, `follow_ups`, `call_feedback`, `lead_activities`
- **RLS policies**: binary — either `data_entry`/`super_admin` can do everything, or not. No district scoping.
- **No role field on `data_entry_users`**: just `name, email, password_hash, status`
- **No district_assignments**: managers/telecallers aren't represented at all
- **No Excel import/export** anywhere
- Server-side Supabase client uses **service role key** (bypasses RLS), so effective access control is currently middleware + API-level only

---

## User Review Required

> [!IMPORTANT]
> **Auth model change**: The current app has two separate auth paths: CRM admin uses a single shared password, while DE users have individual email/password accounts. The spec requires 5 individual roles. I plan to **unify all users under the `data_entry_users` table** (renamed conceptually to `app_users`) with a `role` column. The CRM shared-password login will be replaced by individual admin logins. This means the `CRM_PASSWORD` env var becomes obsolete. **Is this acceptable?**

> [!IMPORTANT]  
> **Supabase RLS vs API-level enforcement**: The server uses the **service role key** which bypasses RLS entirely. Implementing true RLS would require switching to per-user Supabase auth (e.g. `supabase.auth.signUp`). That's a significant refactor. Instead, I'll enforce role + district scoping **at the API layer** (which is where all data access happens), and keep RLS as a secondary defense layer. The todo spec says "enforce at the database layer, not just UI" — the API layer IS server-side enforcement, and we can still add RLS policies. **Are you okay with API-level enforcement as the primary guard + RLS as defense-in-depth?**

> [!WARNING]
> **`xlsx` library choice**: The spec requires `.xlsx` export/import. I'll use the **SheetJS (`xlsx`)** npm package — it's the standard client/server Excel library for JS. This adds a dependency. Confirm this is acceptable.

## Open Questions

> [!IMPORTANT]
> **Lead Type field**: The import template requires a `Lead Type` column (Teacher / Retail Salesperson / Shopkeeper / Institution). The current schema has no `lead_type` field on leads or contacts. Should I add a `lead_type` column to the `leads` table?

> [!IMPORTANT]  
> **Alternate Phone**: The import template includes `Alternate Phone`. Current `contacts` table only has a single `mobile_no`. Should I add an `alt_mobile_no` column to `contacts`?

> [!NOTE]
> **Pincode-to-District**: The spec says "auto-fill district from pincode." The existing `locations` table maps pincode → district. For new pincodes not yet in the DB, should we use an external API, or just prompt for manual district entry? I'll default to **manual entry for unknown pincodes** (consistent with existing behavior).

---

## Proposed Changes

### Phase 1: Database Schema (Migration V7)

#### [NEW] [supabase_migration_v7_rbac_import.sql](file:///c:/Users/Manya%20Lath/Documents/Uphar%20CRM/supabase_migration_v7_rbac_import.sql)

**1a. Role expansion on `data_entry_users`:**
- Add `role` column: `TEXT NOT NULL DEFAULT 'data_entry' CHECK (role IN ('rep', 'data_entry', 'telecaller', 'manager', 'admin'))`
- Add `is_active` column: `BOOLEAN DEFAULT true` (for deactivation without deletion)

**1b. District assignments:**
```sql
CREATE TABLE district_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES data_entry_users(id) ON DELETE CASCADE,
  district TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, district)
);
```

**1c. Audit log:**
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID NOT NULL REFERENCES data_entry_users(id),
  action TEXT NOT NULL,
  target_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**1d. Lead type on leads:**
- Add `lead_type` column: `TEXT CHECK (lead_type IN ('teacher', 'retail_salesperson', 'shopkeeper', 'institution'))`

**1e. Alt phone on contacts:**
- Add `alt_mobile_no` column: `TEXT`

**1f. Import tracking:**
```sql
CREATE TABLE import_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES data_entry_users(id),
  filename TEXT NOT NULL,
  total_rows INT NOT NULL DEFAULT 0,
  rows_created INT NOT NULL DEFAULT 0,
  rows_merged INT NOT NULL DEFAULT 0,
  rows_skipped INT NOT NULL DEFAULT 0,
  rows_errored INT NOT NULL DEFAULT 0,
  details JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**1g. Updated RLS policies** for new roles and district scoping (defense-in-depth).

---

### Phase 2: Auth System Refactor

#### [MODIFY] [auth.ts](file:///c:/Users/Manya%20Lath/Documents/Uphar%20CRM/app/src/lib/auth.ts)
- Update `signCookie` to encode `userId:role` in the cookie payload (currently just `crm` or `de:{id}`)
- Add helper `getUserFromCookie(request)` that returns `{ id, role, districts[] }` 

#### [MODIFY] [middleware.ts](file:///c:/Users/Manya%20Lath/Documents/Uphar%20CRM/app/src/middleware.ts)
- Unify auth check: decode the single cookie, extract role
- Route-level role enforcement:
  - `/dashboard`, `/analytics` → block `data_entry`, `rep`
  - `/data-entry`, import → block `telecaller`, `rep`
  - `/users` (new) → `admin` only
  - All routes → block unauthenticated

#### [MODIFY] [route.ts (crm-login)](file:///c:/Users/Manya%20Lath/Documents/Uphar%20CRM/app/src/app/api/auth/crm-login/route.ts)
- Replace shared password with individual email/password login for all roles
- Return role + districts in cookie payload

#### [MODIFY] [route.ts (de-login)](file:///c:/Users/Manya%20Lath/Documents/Uphar%20CRM/app/src/app/api/auth/de-login/route.ts)
- Merge into unified login endpoint (or keep for backward compat and redirect)

#### [NEW] [route.ts (unified login)](file:///c:/Users/Manya%20Lath/Documents/Uphar%20CRM/app/src/app/api/auth/login/route.ts)
- Single login endpoint: email + password → validates against `data_entry_users`, returns role-based cookie

---

### Phase 3: API Layer — Role & District Enforcement

#### [NEW] [rbac.ts](file:///c:/Users/Manya%20Lath/Documents/Uphar%20CRM/app/src/lib/rbac.ts)
- `getUserContext(request)` → `{ userId, role, districts[] }` from cookie
- `requireRole(request, allowedRoles[])` → throws 403 if not authorized
- `getDistrictFilter(userCtx)` → returns district list for query scoping (admin = all, manager/telecaller = assigned)

#### [MODIFY] API routes:
- [route.ts (leads)](file:///c:/Users/Manya%20Lath/Documents/Uphar%20CRM/app/src/app/api/leads/route.ts) — add district scoping based on role
- [route.ts (challans)](file:///c:/Users/Manya%20Lath/Documents/Uphar%20CRM/app/src/app/api/challans/route.ts) — add district scoping, role check on POST
- [route.ts (analytics summary)](file:///c:/Users/Manya%20Lath/Documents/Uphar%20CRM/app/src/app/api/analytics/summary/route.ts) — scope to permitted districts
- All other analytics routes — add district scoping

#### [NEW] [route.ts (users API)](file:///c:/Users/Manya%20Lath/Documents/Uphar%20CRM/app/src/app/api/users/route.ts)
- CRUD for user management (admin only)
- GET: list users with roles/districts
- POST: create user with role + district assignments
- PATCH: update role, districts, is_active
- All mutations write to `audit_log`

---

### Phase 4: User Management UI (Admin only)

#### [NEW] [page.tsx (users)](file:///c:/Users/Manya%20Lath/Documents/Uphar%20CRM/app/src/app/(app)/users/page.tsx)
- Table of all users: name, email, role, assigned districts, active status
- Create User modal: name, email, password, role dropdown, district multi-select
- Edit User: change role, assign/unassign districts, deactivate
- Audit trail viewer (recent changes)

#### [MODIFY] [Sidebar.tsx](file:///c:/Users/Manya%20Lath/Documents/Uphar%20CRM/app/src/components/Sidebar.tsx)
- Add "User Management" nav item (visible only to `admin` role)
- Add "Import Data" nav item (visible to `data_entry` and `admin`)
- Conditionally show/hide nav items based on role (need to pass role context)

#### [MODIFY] [TopNav.tsx](file:///c:/Users/Manya%20Lath/Documents/Uphar%20CRM/app/src/components/TopNav.tsx)
- Show current user's name and role badge

---

### Phase 5: Excel Import Feature

#### [NEW] [route.ts (import API)](file:///c:/Users/Manya%20Lath/Documents/Uphar%20CRM/app/src/app/api/import/route.ts)
- POST: receives parsed rows from frontend, validates, returns categorized results (new / duplicate / error)
- POST `/api/import/commit`: commits approved rows in a transaction

#### [NEW] [page.tsx (import)](file:///c:/Users/Manya%20Lath/Documents/Uphar%20CRM/app/src/app/(app)/import/page.tsx)
- **Step 1**: Upload `.xlsx`/`.csv` file + download template button
- **Step 2**: Client-side parsing with SheetJS, column validation
- **Step 3**: Send to API for server-side validation (dedup, rep lookup, pincode check)
- **Step 4**: Review screen with three buckets:
  - ✅ New leads (green)
  - ⚠️ Possible duplicates (amber) — side-by-side comparison, action buttons: "Attach as new challan", "Create new lead", "Skip"
  - ❌ Errors (red) — specific error per row
- **Step 5**: Commit button (enabled only when all ⚠️/❌ resolved)
- **Step 6**: Summary screen with downloadable log

#### [NEW] [importValidator.ts](file:///c:/Users/Manya%20Lath/Documents/Uphar%20CRM/app/src/lib/importValidator.ts)
- Row-level validation: required fields, phone format (10-digit), rep lookup
- Within-file duplicate detection (phone number exact match)
- Cross-DB duplicate detection:
  - Exact: phone match → flag as ⚠️
  - Fuzzy: Levenshtein on name + same pincode/district → flag as ⚠️
- Returns structured validation results per row

#### [NEW] [template.ts (import template generator)](file:///c:/Users/Manya%20Lath/Documents/Uphar%20CRM/app/src/app/api/import/template/route.ts)
- Generates downloadable `.xlsx` template with:
  - Locked header row
  - Data validation dropdowns (Lead Type, Rep names from DB)
  - Example filled row

---

### Phase 6: Excel Export Feature

#### [NEW] [route.ts (export API)](file:///c:/Users/Manya%20Lath/Documents/Uphar%20CRM/app/src/app/api/export/route.ts)
- GET `/api/export/leads?district=X&agent=Y&date_start=...&date_end=...`
  - Enforces role-based district scoping
  - Returns `.xlsx` with header row matching import template (round-trip compatible)
- GET `/api/export/analytics?type=district|rep|books&date_start=...&date_end=...`
  - Formatted `.xlsx` with filter params in title row
  - Includes formatted number columns, proper date formatting
- GET `/api/export/import-log/:id`
  - Download import log as `.xlsx`

#### UI integration:
- Add "Export" button to [Leads page](file:///c:/Users/Manya%20Lath/Documents/Uphar%20CRM/app/src/app/(app)/leads/LeadsClient.tsx), [Records page](file:///c:/Users/Manya%20Lath/Documents/Uphar%20CRM/app/src/app/(app)/records), [Dashboard](file:///c:/Users/Manya%20Lath/Documents/Uphar%20CRM/app/src/app/(app)/dashboard/DashboardClient.tsx)
- Export uses current active filters
- Button hidden for roles without export access (`telecaller`, `rep`)

---

### Phase 7: Type Updates

#### [MODIFY] [types.ts](file:///c:/Users/Manya%20Lath/Documents/Uphar%20CRM/app/src/lib/types.ts)
- Add `UserRole` type: `'rep' | 'data_entry' | 'telecaller' | 'manager' | 'admin'`
- Add `AppUser` interface
- Add `AuditLogEntry` interface
- Add `ImportRow`, `ImportValidationResult`, `ImportSummary` interfaces
- Add `LeadType` type

#### [MODIFY] [database.types.ts](file:///c:/Users/Manya%20Lath/Documents/Uphar%20CRM/app/src/lib/database.types.ts)
- Add `district_assignments`, `audit_log`, `import_logs` table types
- Update `data_entry_users` to include `role` and `is_active`
- Update `leads` to include `lead_type`
- Update `contacts` to include `alt_mobile_no`

---

## Verification Plan

### Automated Tests
- Build check: `npm run build` in the `app` directory to verify no TypeScript errors
- SQL migration: run through Supabase SQL editor to verify schema changes apply cleanly

### Manual Verification
1. **RBAC**: Login as different roles and verify:
   - `telecaller` cannot access import or analytics routes
   - `manager` only sees assigned district data
   - `admin` can access everything including User Management
2. **Excel Import**: 
   - Download template, fill with test data, upload
   - Verify duplicate detection works (exact phone + fuzzy name)
   - Verify side-by-side comparison UI shows correct data
   - Verify commit creates correct leads/challans
   - Re-import same file → zero new records (idempotency)
3. **Excel Export**:
   - Export leads as manager → only assigned district data
   - Export → re-import round-trip → zero new leads
   - Analytics export opens correctly in Excel

---

## Implementation Order

1. **Database migration** (schema foundation)
2. **Auth refactor + RBAC lib** (security layer)
3. **Middleware + API enforcement** (all routes secured)
4. **Type updates** (TypeScript alignment)
5. **User Management UI** (admin can create roles)
6. **Excel Import** (core feature)
7. **Excel Export** (complementary feature)
8. **UI polish** (sidebar role-gating, export buttons, role badges)
9. **Build verification**
