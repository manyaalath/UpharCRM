The frontend for Follow-ups already exists.

Implement the backend.

Workflow:

Whenever a challan is saved:

↓

Determine Lead

↓

Create Follow-up

↓

Follow-up Date = Entry Date + 15 days

↓

Status = Pending

Database:

Create Followup table if not already present.

Fields:

id

lead_id

challan_id

assigned_rep

created_date

due_date

status

remarks

completed_date

The Dashboard Follow-up tab should display:

Due Today

Upcoming (7 days)

Overdue

Completed

The dedicated Follow-up page should also display the same records.

Implement:

Complete Follow-up

Reschedule

Mark Overdue automatically

No dummy data.

Everything should come from Supabase.

Acceptance Criteria:

Insert new challan.

Verify follow-up automatically appears.

Verify due date = +15 days.

Verify dashboard counts update.
PHASE 3 - Duplicate Lead Detection
Implement Duplicate Lead Detection.

Business Rule:

One Contact = One Lead.

Duplicate detection priority:

1 Mobile Number

2 Teacher Name

3 Institute

4 District

5 Village/Town

When Save Record is clicked:

Search existing leads.

If probable duplicate found:

Show Modal:

Possible Existing Lead Found

Existing Lead Details

Phone

Teacher

Institute

Representative

Buttons:

Attach to Existing Lead

Create New Lead Anyway

Never auto merge.

If Attach:

Increase visit count.

Attach challan.

Update lead history.

If New:

Create new lead.

Acceptance Criteria:

Same phone entered twice.

Popup appears.

Operator chooses action.

Database behaves correctly.
PHASE 4 - Fix Search & Filters
Implement working search and filtering.

Leads Page

Search:

Teacher

Institute

Phone

Representative

Filters:

District

Status

Representative

Date Range

Records Page

Search:

Challan Number

Teacher

Institute

Phone

Filters:

District

Representative

Date

Book

Export should export filtered data only.

All filtering should happen server-side.

No frontend fake filtering.

Acceptance Criteria:

Every filter changes the result immediately.
PHASE 5 - Books Analytics Backend
Complete Books Analytics.

Currently UI exists.

Backend missing.

Connect Books Dashboard to database.

Create aggregation queries.

Dashboard should show:

Most Distributed Books

Book Name

Times Distributed

Unique Leads

Repeat Distribution

Charts:

Top Books

Least Distributed Books

Distribution Trend

Representative-wise Books

District-wise Books

Everything should calculate live.

Acceptance Criteria:

Entering challan updates books dashboard instantly.
PHASE 6 - Lead Timeline & CRM
Implement Lead Timeline.

Each Lead should contain chronological activity.

Example:

Specimen Distributed

↓

Follow-up Created

↓

Call Made

↓

Suggestion Added

↓

Complaint Added

↓

Second Visit

↓

Additional Specimen

Timeline should be visible on Lead Details page.

Each activity should have:

Date

Representative

Action

Remarks

No activities should overwrite previous history.
PHASE 7 - Pincode Auto Fill
Improve Data Entry UX.

When user enters Pincode:

Automatically lookup location.

Fill:

State

District

Village/Town (if available)

Allow manual editing.

If API cannot determine Village:

Leave editable.

Recommended APIs:

PostalPincode.in

India Post API

Acceptance Criteria:

Entering 800004

Automatically fills

State

District

User only enters village if required.
PHASE 8 - Dashboard Polish
Improve Dashboard UX.

1 Clicking KPI card opens related page.

Leads

↓

Leads Page

Books

↓

Books Dashboard

District

↓

District Analytics

Followups

↓

Followup Page

Representative

↓

Representative Report

Improve Empty States.

Instead of blank charts display:

"No Data Available Yet"

with illustration.

Improve Representative Performance.

Replace plain score with progress indicator.

Improve Dashboard responsiveness.

Optimize loading speed.

No unnecessary API calls.
AFTER ALL PHASES

Finally ask Antigravity:

Perform a complete production readiness audit.

Check:

Database schema consistency

Foreign key integrity

Supabase RLS

Query performance

Unused APIs

Duplicate queries

Loading speed

Caching

Error handling

Null handling

Search performance

Pagination

Mobile responsiveness

Accessibility

Return a report of:

Critical Issues

Medium Issues

Minor Issues

Suggested Optimizations

Do not modify functionality during the audit.