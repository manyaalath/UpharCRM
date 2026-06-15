# API Documentation
## Uphar Prakashan — Specimen Distribution CRM
### Tech Stack: Next.js App Router API Routes + Supabase

---

## Base URL

```
Production:  https://uphar-crm.vercel.app/api
Development: http://localhost:3000/api
```

All API routes are Next.js Route Handlers under `app/api/`.
Authentication uses Supabase Auth (JWT). Pass the Bearer token in every request.

---

## Authentication

### Headers (required on all protected routes)

```http
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

### POST `/api/auth/login`

Login with email and password.

**Request Body:**
```json
{
  "email": "operator@uphar.in",
  "password": "yourpassword"
}
```

**Response 200:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "v1.MJV...",
  "user": {
    "id": "uuid",
    "email": "operator@uphar.in",
    "role": "data_entry"
  }
}
```

**Response 401:**
```json
{ "error": "Invalid credentials" }
```

**Roles:** `data_entry` | `super_admin`

---

### POST `/api/auth/logout`

Invalidates the current session.

**Response 200:**
```json
{ "message": "Logged out successfully" }
```

---

### GET `/api/auth/me`

Returns the current authenticated user's profile and role.

**Response 200:**
```json
{
  "id": "uuid",
  "email": "admin@uphar.in",
  "role": "super_admin",
  "name": "Uphar Admin"
}
```

---

## Challans

### GET `/api/challans`

Fetch paginated list of challans. Data Entry and Super Admin can access.

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `page` | number | Page number (default: 1) |
| `limit` | number | Records per page (default: 20, max: 100) |
| `search` | string | Search across challan_no, teacher_name, institute_name, mobile_no |
| `district` | string | Filter by district name |
| `agent_name` | string | Filter by agent name |
| `from_date` | string | ISO date — filter from this date (inclusive) |
| `to_date` | string | ISO date — filter to this date (inclusive) |

**Example:**
```
GET /api/challans?page=1&limit=20&district=Bhagalpur&from_date=2026-01-01
```

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "challan_no": "501",
      "challan_date": "2026-02-07",
      "teacher_name": "Rajesh Kumar",
      "institute_name": "XYZ Public School",
      "address": "Kahalgaon, Bhagalpur",
      "district": "Bhagalpur",
      "pincode": "813204",
      "mobile_no": "9934000000",
      "specimens_given": ["Hindi Vyakaran", "English Reader", "Science"],
      "agent_name": "Agent A",
      "created_at": "2026-02-07T10:30:00Z",
      "updated_at": "2026-02-07T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 134,
    "total_pages": 7
  }
}
```

---

### POST `/api/challans`

Create a new challan record. Only `data_entry` and `super_admin` roles.

**Request Body:**
```json
{
  "challan_no": "502",
  "challan_date": "2026-02-08",
  "teacher_name": "Meena Sharma",
  "institute_name": "Sunrise Academy",
  "address": "Boring Road, Patna",
  "district": "Patna",
  "pincode": "800001",
  "mobile_no": "9876543210",
  "specimens_given": ["Hindi Vyakaran", "Math Practice"],
  "agent_name": "Agent B"
}
```

**Validation Rules:**
- `challan_no` — required, string, unique
- `challan_date` — required, ISO date string
- `teacher_name` — required, max 255 chars
- `institute_name` — required, max 255 chars
- `address` — required, max 500 chars
- `district` — required, max 100 chars
- `pincode` — required, exactly 6 digits
- `mobile_no` — required, exactly 10 digits
- `specimens_given` — required, non-empty array of strings
- `agent_name` — required, max 100 chars

**Response 201:**
```json
{
  "id": "uuid",
  "challan_no": "502",
  "message": "Challan created successfully"
}
```

**Response 409 (Duplicate Challan):**
```json
{ "error": "Challan number 502 already exists" }
```

**Response 422 (Validation Error):**
```json
{
  "error": "Validation failed",
  "fields": {
    "pincode": "Must be exactly 6 digits",
    "mobile_no": "Must be exactly 10 digits"
  }
}
```

---

### GET `/api/challans/:id`

Fetch a single challan by its UUID.

**Response 200:** Single challan object (same shape as list item above).

**Response 404:**
```json
{ "error": "Challan not found" }
```

---

### PUT `/api/challans/:id`

Update an existing challan. All fields are optional — only pass what changed.

**Request Body:** Same fields as POST, all optional.

**Response 200:**
```json
{
  "id": "uuid",
  "challan_no": "501",
  "message": "Challan updated successfully"
}
```

---

### GET `/api/challans/check-duplicate`

Check if a challan number already exists before saving (called on blur).

**Query Parameters:**
```
GET /api/challans/check-duplicate?challan_no=502
```

**Response 200:**
```json
{ "exists": false }
```

**Response 200 (duplicate found):**
```json
{
  "exists": true,
  "challan": {
    "id": "uuid",
    "institute_name": "XYZ School",
    "challan_date": "2026-02-07"
  }
}
```

---

## Leads

### GET `/api/leads`

Fetch all leads with filtering. Only `super_admin`.

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `page` | number | Page (default: 1) |
| `limit` | number | Per page (default: 20) |
| `search` | string | Search name, institute, mobile |
| `status` | string | One of: new, contacted, interested, followup_pending, converted, not_interested, closed |
| `district` | string | Filter by district |
| `agent_name` | string | Filter by agent |
| `from_date` | string | Lead created from date |
| `to_date` | string | Lead created to date |
| `overdue` | boolean | If true, return only leads where next_followup_date < today |

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "lead_id": "L0001",
      "challan_no": "501",
      "contact_person": "Rajesh Kumar",
      "institute_name": "XYZ Public School",
      "mobile_no": "9934000000",
      "district": "Bhagalpur",
      "status": "followup_pending",
      "last_contact_date": "2026-02-10",
      "next_followup_date": "2026-02-20",
      "remarks": "Interested in new edition",
      "agent_name": "Agent A",
      "created_at": "2026-02-07T10:30:00Z",
      "updated_at": "2026-02-10T14:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 312,
    "total_pages": 16
  }
}
```

---

### POST `/api/leads`

Manually create a lead (auto-creation happens via DB trigger on challan insert). Only `super_admin`.

**Request Body:**
```json
{
  "challan_no": "501",
  "contact_person": "Rajesh Kumar",
  "institute_name": "XYZ Public School",
  "mobile_no": "9934000000",
  "district": "Bhagalpur",
  "status": "new",
  "remarks": "First contact",
  "next_followup_date": "2026-02-20"
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "lead_id": "L0002",
  "message": "Lead created successfully"
}
```

---

### PUT `/api/leads/:id`

Update lead status, remarks, and follow-up date. Only `super_admin`.

**Request Body:**
```json
{
  "status": "interested",
  "last_contact_date": "2026-02-15",
  "next_followup_date": "2026-02-25",
  "remarks": "Confirmed interest in Hindi and English books"
}
```

**Response 200:**
```json
{ "id": "uuid", "message": "Lead updated successfully" }
```

---

### GET `/api/leads/:id`

Get single lead details. Only `super_admin`.

**Response 200:** Single lead object.

---

## Analytics (Super Admin Only)

### GET `/api/analytics/summary`

Dashboard KPI summary cards.

**Response 200:**
```json
{
  "total_challans": 1240,
  "total_institutions": 870,
  "total_leads": 312,
  "leads_pending_followup": 45,
  "leads_not_contacted": 120,
  "challans_this_month": 98
}
```

---

### GET `/api/analytics/district`

Challan distribution grouped by district.

**Query Parameters:**
```
GET /api/analytics/district?from_date=2026-01-01&to_date=2026-06-30
```

**Response 200:**
```json
{
  "data": [
    { "district": "Patna", "count": 312 },
    { "district": "Bhagalpur", "count": 201 },
    { "district": "Gaya", "count": 156 }
  ]
}
```

---

### GET `/api/analytics/monthly`

Monthly distribution trend (last 12 months).

**Response 200:**
```json
{
  "data": [
    { "month": "2026-01", "count": 88 },
    { "month": "2026-02", "count": 102 },
    { "month": "2026-03", "count": 115 }
  ]
}
```

---

### GET `/api/analytics/agents`

Agent-wise challan count and leads generated.

**Response 200:**
```json
{
  "data": [
    { "agent_name": "Agent A", "challan_count": 310, "lead_count": 89 },
    { "agent_name": "Agent B", "challan_count": 245, "lead_count": 72 }
  ]
}
```

---

### GET `/api/analytics/lead-status`

Lead status breakdown for pie chart.

**Response 200:**
```json
{
  "data": [
    { "status": "new", "count": 120 },
    { "status": "contacted", "count": 60 },
    { "status": "interested", "count": 45 },
    { "status": "followup_pending", "count": 45 },
    { "status": "converted", "count": 28 },
    { "status": "not_interested", "count": 10 },
    { "status": "closed", "count": 4 }
  ]
}
```

---

### GET `/api/analytics/specimens`

Most distributed specimen/book titles.

**Response 200:**
```json
{
  "data": [
    { "specimen": "Hindi Vyakaran", "count": 432 },
    { "specimen": "Science Explorer", "count": 388 },
    { "specimen": "English Reader", "count": 301 }
  ]
}
```

---

### GET `/api/analytics/repeat-institutions`

Institutions that appear in more than one challan.

**Response 200:**
```json
{
  "data": [
    {
      "institute_name": "XYZ Public School",
      "district": "Bhagalpur",
      "visit_count": 3,
      "last_visit": "2026-03-10",
      "lead_status": "interested"
    }
  ]
}
```

---

## Agents

### GET `/api/agents`

List all agent names (used for dropdowns). Both roles.

**Response 200:**
```json
{
  "data": [
    { "id": "uuid", "name": "Agent A" },
    { "id": "uuid", "name": "Agent B" }
  ]
}
```

---

### POST `/api/agents`

Add a new agent. Only `super_admin`.

**Request Body:**
```json
{ "name": "Agent C" }
```

**Response 201:**
```json
{ "id": "uuid", "name": "Agent C" }
```

---

### DELETE `/api/agents/:id`

Soft-delete an agent (marks inactive; existing challans retain name). Only `super_admin`.

**Response 200:**
```json
{ "message": "Agent deactivated" }
```

---

## Export

### GET `/api/export/challans`

Download all challans as CSV. Only `super_admin`.

**Query Parameters:** Same as `GET /api/challans` (all filters apply).

**Response:** `Content-Type: text/csv` file download.

```
Content-Disposition: attachment; filename="challans_2026-06-15.csv"
```

---

### GET `/api/export/leads`

Download all leads as CSV. Only `super_admin`.

**Response:** `Content-Type: text/csv` file download.

---

## Error Responses

All errors follow this structure:

```json
{
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE"
}
```

| HTTP Status | Code | Meaning |
|---|---|---|
| 400 | `BAD_REQUEST` | Malformed request |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Authenticated but not allowed |
| 404 | `NOT_FOUND` | Resource doesn't exist |
| 409 | `CONFLICT` | Duplicate resource (challan_no) |
| 422 | `VALIDATION_ERROR` | Failed field-level validation |
| 500 | `INTERNAL_ERROR` | Server error |

---

## Supabase Database Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Challans table
CREATE TABLE challans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challan_no      TEXT NOT NULL UNIQUE,
  challan_date    DATE NOT NULL,
  teacher_name    TEXT NOT NULL,
  institute_name  TEXT NOT NULL,
  address         TEXT NOT NULL,
  district        TEXT NOT NULL,
  pincode         CHAR(6) NOT NULL,
  mobile_no       CHAR(10) NOT NULL,
  specimens_given JSONB NOT NULL DEFAULT '[]',
  agent_name      TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Leads table
CREATE TABLE leads (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id             TEXT NOT NULL UNIQUE,
  challan_no          TEXT REFERENCES challans(challan_no),
  contact_person      TEXT NOT NULL,
  institute_name      TEXT NOT NULL,
  mobile_no           TEXT NOT NULL,
  district            TEXT NOT NULL,
  agent_name          TEXT,
  status              TEXT NOT NULL DEFAULT 'new'
                      CHECK (status IN ('new','contacted','interested',
                      'followup_pending','converted','not_interested','closed')),
  last_contact_date   DATE,
  next_followup_date  DATE,
  remarks             TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Agents table
CREATE TABLE agents (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL UNIQUE,
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create lead on challan insert
CREATE OR REPLACE FUNCTION create_lead_from_challan()
RETURNS TRIGGER AS $$
DECLARE
  next_lead_id TEXT;
BEGIN
  SELECT 'L' || LPAD(COUNT(*) + 1::TEXT, 4, '0')
  INTO next_lead_id FROM leads;

  INSERT INTO leads (lead_id, challan_no, contact_person, institute_name,
                     mobile_no, district, agent_name, status)
  VALUES (next_lead_id, NEW.challan_no, NEW.teacher_name, NEW.institute_name,
          NEW.mobile_no, NEW.district, NEW.agent_name, 'new');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_lead
AFTER INSERT ON challans
FOR EACH ROW EXECUTE FUNCTION create_lead_from_challan();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER challans_updated_at BEFORE UPDATE ON challans
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## Row-Level Security (Supabase RLS)

```sql
-- Enable RLS
ALTER TABLE challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- data_entry role: read + write challans and agents, no leads dashboard
CREATE POLICY "data_entry_challans" ON challans
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('data_entry', 'super_admin'));

-- super_admin only for leads
CREATE POLICY "super_admin_leads" ON leads
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'super_admin');
```

---

## Rate Limits (Vercel Hobby)

| Route | Limit |
|---|---|
| `/api/auth/*` | 10 req/min |
| `/api/challans` POST | 60 req/min |
| `/api/analytics/*` | 30 req/min |
| `/api/export/*` | 5 req/min |
