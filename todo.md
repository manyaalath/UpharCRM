# UpharCRM — Feature Spec: Role-Based Access, Excel Import/Export, Duplicate Validation

**Status:** Ready for implementation
**Audience:** Antigravity (build agent)
**Scope:** This spec covers three features only. Do not modify existing challan, follow-up, or dashboard logic except where explicitly noted as a dependency.

---

## 0. Context (read before building)

UpharCRM is a back-office CRM for a publishing house's field sales process:

- Reps visit teachers / retail salespeople / shopkeepers, pitch books, leave specimens, and fill a **paper** challan.
- A **data entry operator** enters that paper challan into the CRM (or currently, into Excel — this is the gap this spec addresses).
- A **telecaller/marketing person** works a daily follow-up queue calling leads.
- **Managers/admin** view district- and rep-wise analytics.

The CRM's goal is relationship-building (getting teachers/shopkeepers to recommend/stock the books), not order conversion. Keep that framing in mind for any status/label fields touched by this work — do not introduce "converted" as a success state.

---

## 1. Role-Based Access Control (RBAC)

### 1.1 Roles

Implement exactly these four roles. Store on the `agents` (or `users`) table as a `role` enum column.

| Role | Who | Scope |
|---|---|---|
| `rep` | Field sales rep | Read-only view of their own submitted challans/leads. No edit access (they don't use the app directly today, but may in future — build the scope now, expose UI later). |
| `data_entry` | Back-office operator | Create/edit leads and challans. Access to Excel import tool. No access to analytics or WhatsApp campaign tools. |
| `telecaller` | Marketing/follow-up person | Access to "Today's Queue," lead detail view, call outcome logging, reschedule. Read-only on challan/book data. No access to Excel import/export or user management. |
| `manager` | District/regional manager | All `telecaller` + `data_entry` permissions, scoped to their assigned district(s). Access to district-level analytics. Cannot manage other managers or global settings. |
| `admin` | Client HQ / publisher | Full access: all districts, all reps, user management, Excel import/export, analytics, WhatsApp campaign config. |

*(Table above lists 5 rows for clarity — `rep` is included for schema completeness even though it's low-priority for UI work.)*

### 1.2 Requirements

- **Enforce at the database layer, not just UI.** If using Supabase, implement Row Level Security (RLS) policies per table (`leads`, `challans`, `follow_ups`, `districts`) keyed to `role` and, for `manager`, to a `manager_districts` join table. UI-only hiding is not acceptable — a `manager` or `telecaller` must not be able to fetch another district's data via direct API call.
- Add a `district_assignments` table: `agent_id`, `district_id` — supports a manager or telecaller covering multiple districts.
- Login/session must carry `role` and (for `manager`/`telecaller`) `assigned_districts` in the auth token/claims, not just in a client-side store.
- Add an admin-only **User Management** screen: list users, assign role, assign districts, deactivate user. No self-service role changes.
- **Audit log**: record `who` changed `what role/district assignment` and `when`, in a simple `audit_log` table (`actor_id`, `action`, `target_id`, `timestamp`, `details`). This is important for a client handing off admin duties over time.

### 1.3 Acceptance criteria

- [ ] Logging in as `telecaller` and hitting the leads-list API for a district not assigned to them returns 403/empty, not data.
- [ ] `data_entry` role cannot see the analytics dashboard route (redirect or 403).
- [ ] `manager` sees only their assigned district(s) in every dashboard, filter dropdown, and export.
- [ ] Admin can create a user, assign role + district(s), and deactivate a user without touching the database directly.
- [ ] Role/district changes are visible in `audit_log`.

---

## 2. Excel Import (bulk challan/lead entry)

### 2.1 Why

Data entry currently happens partly in Excel. This feature must let the operator upload that Excel file directly instead of re-typing into the CRM UI, since re-typing is the actual bottleneck today.

### 2.2 Template

Provide a **downloadable template** (`.xlsx`) with these columns (adjust names to match actual schema field names):

| Column | Required | Notes |
|---|---|---|
| Lead Name | Yes | Teacher / shop / institution name |
| Lead Type | Yes | Teacher / Retail Salesperson / Shopkeeper / Institution — dropdown-validated in template |
| Phone Number | Yes | Used as primary dedup key — see Section 3 |
| Alternate Phone | No | |
| Pincode | Yes | Drives district/area auto-fill |
| District | Auto-filled from pincode if possible, else required manually | |
| School/Shop/Institution Name | Conditional | Required if Lead Type = Teacher/Institution/Shopkeeper |
| Rep Name / Rep ID | Yes | Must match an existing active rep — validate against `agents` table |
| Visit Date | Yes | Date of paper challan |
| Book Titles Given (Specimens) | Yes | Comma-separated or one row per book — decide based on current challan schema; recommend one row per book-line for cleaner import, with a `challan_group_id` generated on import to tie multi-book challans together |
| Quantity | Yes | Per book line |
| Remarks | No | Free text from rep's paper challan |

Template should have a locked header row, data validation dropdowns (Lead Type, Rep) where the tool supports it, and one example filled row.

### 2.3 Import flow

1. Operator uploads `.xlsx`/`.csv` on the **Import Leads** screen (data_entry and admin roles only).
2. System parses and runs validation (Section 3) **before** any data is written.
3. Show a **review screen** with three buckets, before committing anything:
 - ✅ **New leads** — will be created.
 - ⚠️ **Possible duplicates** — matched against existing leads (see Section 3.2), operator must resolve each one (Merge into existing / Create as new anyway / Skip row).
 - ❌ **Errors** — missing required field, invalid rep ID, invalid pincode, etc. Shown with the specific error per row, not just "row 14 failed."
4. Operator resolves all ⚠️ and ❌ rows (or explicitly skips them) before the **Commit Import** button is enabled.
5. On commit, run inserts in a transaction where possible — partial-failure imports should not leave the DB in an inconsistent state.
6. Show an import summary: rows created, rows merged into existing leads, rows skipped, with a downloadable log (see 4.3).

### 2.4 Acceptance criteria

- [ ] Uploading the provided template with valid data creates leads + challans correctly, with follow-up auto-generated per existing follow-up logic.
- [ ] Uploading a file missing a required column shows a clear error before any parsing of rows.
- [ ] Uploading 500+ rows completes without timing out (test with a realistic large file; if synchronous processing is too slow, queue it as a background job with a progress indicator).
- [ ] No lead is written to the database until the operator has resolved all flagged duplicates/errors or explicitly chosen to skip them.

---

## 3. Duplicate Detection / Import Validation

This is the most important part of this spec — bad dedup logic will silently corrupt analytics (rep performance, district performance) by inflating lead counts.

### 3.1 Matching strategy

Duplicate check runs both **within the uploaded file** (two rows in the same import matching each other) and **against existing database leads**. Use a tiered match:

1. **Exact match**: same phone number (normalized — strip spaces/dashes/country code variants) → near-certain duplicate.
2. **Fuzzy match**: same/similar name (allow for minor spelling variation — e.g. Levenshtein distance or similar) + same pincode/district → likely duplicate, flag for review, do not auto-merge.
3. **No match** → treat as new lead.

**Never auto-merge.** Matches always route to the review screen (Section 2.3) for a human decision. This mirrors the existing product principle already noted in the project's own todo.md — do not silently combine records.

### 3.2 What "duplicate" means in this business — important distinction

A returning teacher who gets a **second specimen visit** is not a duplicate lead — it's a new challan against an existing lead. The import tool must distinguish:

- **Same lead, new visit/specimen** → correct action: attach new challan/book-lines to the *existing* lead record, do not create a second lead row.
- **Genuinely different person who happens to share a name or district** → correct action: create as new, operator confirms.
- **Accidental duplicate row** (same visit entered twice, e.g. once by rep's paper trail and once already keyed into the site directly) → correct action: skip / discard.

The review screen (2.3) must present enough context per flagged match for the operator to tell these apart — show: matched lead's name, phone, last visit date, last challan's books, and district, side-by-side with the imported row.

### 3.3 Validation rules (reject or flag before import)

| Check | Action |
|---|---|
| Missing required field (name, phone, lead type, rep, visit date) | ❌ Error — block row |
| Invalid phone format (not 10-digit Indian mobile, or malformed) | ❌ Error — block row |
| Rep ID/name not found in active reps | ❌ Error — block row |
| Pincode not resolvable | ⚠️ Warning — allow row, require manual district selection |
| Phone number exact match to existing lead | ⚠️ Duplicate — route to review |
| Name + district fuzzy match, different phone | ⚠️ Possible duplicate — route to review |
| Duplicate row within the same uploaded file | ⚠️ Duplicate — route to review, resolve before either row commits |

### 3.4 Acceptance criteria

- [ ] Importing a file with two rows sharing an identical phone number flags both for review, does not silently create two leads.
- [ ] Importing a specimen visit for an already-existing lead (matched by phone) offers "attach as new challan to existing lead" as the default suggested action, not "create new lead."
- [ ] Fuzzy name matches (e.g. "Ramesh Kumar" vs "Ramesh Kumaar") with matching pincode are flagged, not silently merged and not silently duplicated.
- [ ] After import, running the same file again does not create duplicate leads (idempotency check via phone-match).

---

## 4. Excel Export

### 4.1 What must be exportable

- **Leads/Challans**: filtered by district, rep, date range, lead type — respecting the requesting user's role scope (a `manager` can only export their own district's data, `admin` can export all).
- **Analytics summaries**: books distributed (by title/district/rep/date range), rep performance, district performance — as a formatted `.xlsx`, not raw CSV dump, since this will go into management review decks.
- **Import log** (from Section 2.4): rows created / merged / skipped / errored, for the operator's own record-keeping and to debug a bad import after the fact.

### 4.2 Format requirements

- `.xlsx` with a header row, consistent column naming with the import template (so export → edit → re-import round-trips cleanly).
- Respect role-based scope on export exactly as on view — no exporting data outside the user's permitted districts.
- For analytics exports, include the filter parameters used (district, date range) in a header/title row of the sheet, so an exported file is self-describing when it's forwarded around over email/WhatsApp (which it will be).

### 4.3 Acceptance criteria

- [ ] `manager` exporting leads only gets rows from their assigned district(s), verified by attempting export as a manager scoped to one district.
- [ ] Export → re-import of the same file (unmodified) creates zero new leads (all rows match existing leads via phone number).
- [ ] Analytics export opens correctly in Excel/Google Sheets with correct number formatting (no text-formatted numbers, no broken date columns).

---

