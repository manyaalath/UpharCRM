# Product Requirements Document (PRD)

## 1. Product Overview

**Uphar CRM** is a **Specimen Distribution CRM and Market Feedback Intelligence Platform** designed for managing specimen distribution records for a publishing company's field team. The system supports a low-tech field force using manual challan forms and a centralized office data-entry team, with a super-admin CRM dashboard for analysis and decision-making.

The platform is focused on:

- Lead management (one contact = one lead)
- Follow-up management
- Market feedback collection
- District-wise demand analysis
- Book-wise demand analysis
- Representative performance monitoring
- Relationship tracking through repeat contact intelligence

The workflow starts with a **manual challan form** filled by the field representative, continues with **digital data entry** by an office operator, and ends with a **CRM dashboard** used only by the super admin to analyze leads, follow-ups, book distribution patterns, and market feedback.

---

## 2. Problem Statement

Currently, specimen distribution is recorded on paper forms. This creates several issues:

- Manual records are difficult to search, sort, and analyze.
- Lead follow-up is inconsistent.
- Representative performance and distribution trends are not visible in real time.
- Data is scattered and not standardized.
- Market feedback and relationship intelligence are lost because the records are not structured digitally.

---

## 3. Goals

### Primary Goals

- Convert paper challan data into structured digital records.
- Make it easy for non-tech-savvy representatives to continue using manual forms.
- Provide a simple digital data-entry page for office staff.
- Build a CRM dashboard for super-admin analysis.
- Generate and manage leads with one contact = one lead model.
- Automate follow-up task creation on new challan entries.
- Collect and analyze market feedback.

### Secondary Goals

- Track specimen distribution by school/shop, teacher/shopkeeper, district, village/town, and representative.
- Identify repeat prospects and high-potential institutions.
- Help the company understand distribution patterns and demand trends.
- Provide district-wise and book-wise demand intelligence.

---

## 4. Users and Roles

### 4.1 Field Representative

A field representative who fills the paper challan manually.

**Responsibilities:**
- Fill the challan form with required details.
- Submit the completed form to the office data-entry team.

**Needs:**
- No digital interaction required.
- A form that is easy to fill and consistent.

### 4.2 Data Entry Operator

An office user who manually enters challan data into the system.

**Responsibilities:**
- Enter challan details from the paper form into the digital system.
- Verify duplicate contacts when prompted by the system.
- Decide whether to attach a challan to an existing lead or create a new lead.
- Ensure data completeness and correctness.
- Save records into the database.

**Needs:**
- Fast and simple data-entry screen.
- Duplicate contact detection with verification modal.
- Ability to search and re-open records.
- Validation to reduce mistakes.

### 4.3 Super Admin

The only user who accesses the CRM dashboard.

**Responsibilities:**
- View all data.
- Analyze leads, patterns, and representative performance.
- Review follow-up opportunities.
- Monitor market feedback and call outcomes.
- Export or filter reports.

**Needs:**
- Dashboard with sectioned views, filters, charts, lead lists, and analytics.
- Secure access with strong permissions.

---

## 5. User Workflow

### Step 1: Manual Form Filling

The field representative fills the paper challan form with:

- Challan No.
- Date
- Teacher / Shopkeeper Name
- Institute / School / Shop Name
- Address
- Village / Town
- Locality
- District
- Pincode
- Mobile Number
- Specimens Given (selected from Books Master)
- Representative Name

### Step 2: Form Submission to Office

The representative submits the completed form to the data-entry person.

### Step 3: Digital Data Entry with Duplicate Detection

The office operator opens the digital data-entry page and enters the challan details into the system.

**Duplicate Contact Detection:**
When entering a new challan, the system checks for existing leads using:
- **Primary:** Mobile Number
- **Secondary:** Teacher/Shopkeeper Name, Institute Name, District, Village/Town

If a matching lead is found:
- The system displays a verification modal: **"Possible Existing Lead Found"**
- Operator can choose:
  - **Attach challan to existing lead** — The new challan is linked to the existing lead
  - **Create new lead anyway** — A new lead record is created

The system does NOT automatically merge records without user confirmation.

### Step 4: Follow-up Auto-Creation

When a new lead is created OR a new challan is attached to an existing lead, the system automatically creates a follow-up task with a default date of **15 days after entry**.

### Step 5: Record Saved in Database

The system stores the entry in structured form so it can later be searched, filtered, and analyzed.

### Step 6: CRM Analysis

The super admin uses the dashboard to:

- Review all records.
- Manage leads and follow-ups.
- Track market feedback and call outcomes.
- Analyze distribution patterns.
- Monitor representative performance.

---

## 6. Core Functional Requirements

### 6.1 Data Entry Module

A digital form for office staff to enter challan data.

#### Required Fields
- Challan No.
- Date
- Teacher Name / Shopkeeper Name
- Institute Name / School Name / Shop Name
- Address
- Village / Town
- Locality
- District
- Pincode
- Mobile Number
- Specimens Given (selected from Books Master)
- Representative Name

#### Expected Behaviors
- Mandatory field validation.
- Duplicate challan number warning.
- **Duplicate contact detection** with verification modal before saving.
- Search existing records before creating a new one.
- Save and edit record functionality.
- Lightweight and easy-to-use interface.

### 6.2 Record Management

The system should allow the office team to:

- Create a new challan record.
- Edit an existing challan record.
- Search by challan number, name, institute, mobile number, district, village/town, or representative.
- Filter records by date range, representative, district, institute type, and book title.

### 6.3 Lead Management (Redesigned)

**Core principle: One Contact = One Lead.**

A lead is uniquely identified primarily by:
- **Mobile Number** (primary identifier)

Secondary identifiers:
- Teacher / Shopkeeper Name
- Institute Name
- District
- Village / Town

#### Lead Data to Capture
- Lead ID
- Contact person name
- Institute / shop name
- Mobile number
- Address
- Village / Town
- Locality
- District
- Pincode
- Books/specimens received (aggregated from all linked challans)
- Date of first contact
- Follow-up status
- Suggestions / Complaints
- Remarks
- Next action date
- Linked challan numbers

#### Lead Status Options
- New
- Contacted
- Interested
- Follow-up Pending
- Not Interested
- Closed

**Removed statuses:**
- ~~Converted~~ (not applicable — this is not a sales pipeline)

### 6.4 Follow-Up Management Module

Whenever:
- A new lead is created, OR
- A new challan is attached to an existing lead

The system automatically creates a follow-up task.

**Default follow-up date:** 15 days after entry.

**Follow-up Status:**
- Pending
- Completed
- Overdue
- Rescheduled

### 6.5 Lead Activity Timeline

Each lead maintains a complete activity history, visible from lead details.

Example timeline events:
- Specimen distributed
- Follow-up created
- Call completed
- Suggestion received
- Complaint received
- Additional specimen distributed

### 6.6 Call Feedback System

Structured feedback module for recording call outcomes.

**Call Outcome Options:**
- Not Reachable
- Busy
- Call Back Later
- Interested
- Not Interested
- Wants More Specimens

**Removed outcomes:**
- ~~Meeting Required~~
- ~~Order Expected~~
- ~~Converted~~

**Additional fields:**
- Suggestions / Complaints
- Remarks

**Purpose:** Market feedback collection rather than sales pipeline management.

### 6.7 Books Master

Centralized book/specimen registry.

**Fields:**
- Book ID
- Book Name
- Book Code

**Do NOT add:** Subject, Class, or Category hierarchy.

**Used for:**
- Book-wise analytics
- Distribution tracking
- Demand tracking
- Specimen selection during data entry

### 6.8 Duplicate Contact Detection (Critical Requirement)

**Mandatory feature.**

System detects likely duplicate contacts using:
- **Primary:** Mobile Number
- **Secondary:** Contact Name, Institute Name, District, Village/Town

**Before saving:** Display "Possible Existing Lead Found" modal.

**Allow operator to decide:**
- Attach to Existing Lead
- Create New Lead

### 6.9 Authentication and Access Control

#### Roles
- Data Entry User
- Super Admin

#### Permissions
- Data Entry User: can create, edit, and search records.
- Super Admin: full access to dashboard, analytics, exports, and user management.

---

## 7. Data Model

### 7.1 Challan Record

| Field | Type | Required | Example |
|---|---|---:|---|
| challan_no | String | Yes | 501 |
| challan_date | Date | Yes | 2026-02-07 |
| teacher_name | String | Yes | Rajesh Kumar |
| institute_name | String | Yes | XYZ Public School |
| address | Text | Yes | Kahalgaon, Bhagalpur |
| village_town | String | No | Kahalgaon |
| locality | String | No | Main Bazar |
| district | String | Yes | Bhagalpur |
| pincode | String | Yes | 813204 |
| mobile_no | String | Yes | 9934xxxxxx |
| specimens_given | Text / JSON | Yes | ["BK001 - Hindi Vyakaran", "BK002 - English Reader"] |
| representative_name | String | Yes | Rep A |
| lead_id | UUID (FK) | No | References leads table |
| created_at | DateTime | Yes | Auto |
| updated_at | DateTime | Yes | Auto |

### 7.2 Lead Record

| Field | Type | Required | Example |
|---|---|---:|---|
| lead_id | String | Yes | L0001 |
| contact_person | String | Yes | Rajesh Kumar |
| institute_name | String | Yes | XYZ Public School |
| mobile_no | String | Yes | 9934xxxxxx |
| address | Text | No | Kahalgaon |
| village_town | String | No | Kahalgaon |
| locality | String | No | Main Bazar |
| district | String | Yes | Bhagalpur |
| pincode | String | No | 813204 |
| representative_name | String | No | Rep A |
| status | Enum | Yes | Follow-up Pending |
| last_contact_date | Date | No | 2026-02-10 |
| next_followup_date | Date | No | 2026-02-20 |
| suggestions | Text | No | Wants more Hindi books |
| complaints | Text | No | Late delivery |
| remarks | Text | No | Interested in new edition |
| created_at | DateTime | Yes | Auto |
| updated_at | DateTime | Yes | Auto |

### 7.3 Follow-Up Record

| Field | Type | Required | Example |
|---|---|---:|---|
| id | UUID | Yes | Auto |
| lead_id | UUID (FK) | Yes | References leads table |
| challan_no | String | No | 501 |
| followup_date | Date | Yes | 2026-02-22 |
| status | Enum | Yes | Pending |
| remarks | Text | No | First follow-up |
| created_at | DateTime | Yes | Auto |
| updated_at | DateTime | Yes | Auto |

### 7.4 Lead Activity Record

| Field | Type | Required | Example |
|---|---|---:|---|
| id | UUID | Yes | Auto |
| lead_id | UUID (FK) | Yes | References leads table |
| activity_type | String | Yes | specimen_distributed |
| description | Text | Yes | Distributed Hindi Vyakaran |
| metadata | JSONB | No | {"challan_no": "501"} |
| created_at | DateTime | Yes | Auto |

### 7.5 Call Feedback Record

| Field | Type | Required | Example |
|---|---|---:|---|
| id | UUID | Yes | Auto |
| lead_id | UUID (FK) | Yes | References leads table |
| call_outcome | Enum | Yes | Interested |
| suggestions | Text | No | Wants Science books |
| complaints | Text | No | - |
| remarks | Text | No | Will place order next month |
| created_by | String | No | Admin |
| created_at | DateTime | Yes | Auto |

### 7.6 Books Master

| Field | Type | Required | Example |
|---|---|---:|---|
| id | UUID | Yes | Auto |
| book_name | String | Yes | Hindi Vyakaran |
| book_code | String | No | BK001 |
| is_active | Boolean | Yes | true |
| created_at | DateTime | Yes | Auto |

### 7.7 Representatives Table

| Field | Type | Required | Example |
|---|---|---:|---|
| id | UUID | Yes | Auto |
| name | String | Yes | Rahul Sharma (North) |
| is_active | Boolean | Yes | true |
| created_at | DateTime | Yes | Auto |

---

## 8. Dashboard Design

The dashboard is a **single combined dashboard** with sections/tabs.

Do NOT create multiple separate dashboards.

### Section A — Overview

**KPI Cards:**
- Total Challans
- Total Unique Leads (labelled as "Leads")
- Pending Follow-Ups
- Books Distributed
- Districts Covered

**Removed:**
- ~~Converted Leads~~
- ~~Revenue KPIs~~
- ~~Sales KPIs~~

### Section B — District Analysis

- District-wise distribution chart
- District-wise lead count
- District-wise follow-up count

**Purpose:** Geographical coverage analysis.

### Section C — Book Analysis

- Most Distributed Books
- Book-wise Distribution
- Book-wise Demand
- Repeat Distribution by Book

**Removed:**
- ~~Subject Analysis~~

### Section D — Representative Performance

- Total Challans
- Total Leads Handled
- Interested Leads
- Follow-Ups Completed
- Performance Score

**Removed:**
- ~~Conversion Rate~~
- ~~Converted Leads~~
- ~~Sales Performance Metrics~~

**Performance Score based on:**
- Challans Submitted
- Interested Leads Generated
- Data Quality

### Section E — Follow-Up Queue

- Due Today
- Overdue
- Upcoming Follow-Ups

**Purpose:** Actionable work queue for admin team.

### Section F — Lead Intelligence

- Most Frequently Visited Institutions
- Most Frequently Visited Teachers/Shopkeepers
- Lead Categories (Hot/Warm/Cold) based on relationship (visits + interest)

**Removed:**
- ~~Duplicate Lead Dashboard~~
- ~~Lead Scoring based on sales probability~~

**Purpose:** Relationship intelligence rather than sales forecasting.

### Dashboard Data Accuracy Requirement (Critical)

All dashboard metrics must be calculated from **live database records**.

Dashboard must NOT use:
- Static values
- Cached sample data
- Seeded demo data

Dashboard counts should update immediately after new challan entry.

---

## 9. Reporting and Analytics Requirements

The super admin dashboard should support the following reports:

- Total specimen distributions by month.
- Institution-wise distribution history.
- Representative productivity report.
- District-wise coverage report.
- Book-wise distribution and demand report.
- Repeat visit report.
- Pending follow-up report.
- Most distributed book report.
- Institutions not contacted after specimen distribution.

**Removed:**
- ~~Subject-wise Analysis~~
- ~~Conversion Analysis~~
- ~~Sales Funnel Analysis~~
- ~~Lead Conversion Report~~

**Keep:**
- District-wise Analysis
- Book-wise Analysis
- Representative-wise Analysis
- Monthly Trend Analysis

Suggested charts:

- Bar chart for district-wise counts
- Line chart for monthly trends
- Pie chart for lead status breakdown
- Table view for actionable leads

---

## 10. Representative Performance Reports

Representative report should include:

- Challans Submitted
- Leads Created
- Interested Leads
- Follow-Ups Completed
- Pending Follow-Ups
- Performance Score

**Do NOT include:**
- ~~Conversion %~~
- ~~Revenue Generated~~
- ~~Orders Converted~~

---

## 11. Suggested MVP Scope

### MVP Includes
- Digital data-entry page with duplicate contact detection
- Database storage
- Search and filter records
- Super-admin dashboard with sectioned views
- Lead management (one contact = one lead model)
- Follow-up management module with auto-creation
- Lead activity timeline
- Call feedback system
- Books master
- Representative management
- Basic analytics and export

### MVP Excludes
- Mobile app for representatives
- WhatsApp integration (future enhancement)
- Advanced AI lead scoring
- Full accounting or billing module
- OCR scanning or image processing
- Map View / GIS features / Route planning

---

## 12. Non-Functional Requirements

### Usability
- Very simple interface for office operators.
- Minimal number of clicks.
- Suitable for low training effort.

### Performance
- Fast data entry and search.
- Dashboard should load quickly even with a large number of records.
- All dashboard metrics from live database — no static/cached data.

### Security
- Role-based login.
- Super-admin access only for analytics.
- Secure data storage and backups.

### Reliability
- Data should not be lost on refresh or session timeout.
- Daily backup of records.

### Scalability
- System should support future growth across many representatives, districts, and institutions.

---

## 13. Recommendation for Technology Approach

For this use case, the system should start with a **simple database-backed web application**, not just Excel.

### Recommended Approach
- **Front end:** simple web-based data-entry page
- **Database:** structured database or spreadsheet-like backend
- **Dashboard:** admin analytics panel

### Practical Path
1. Start with a lightweight system that is easy to build and maintain.
2. Keep the representative workflow fully manual.
3. Let office staff digitize the data.
4. Build the CRM dashboard on top of the same database.

### Why not only Excel?
- Excel becomes hard to manage as data grows.
- Multi-user access is limited.
- Search, filtering, validation, and dashboarding are weaker.

### Why not heavy software first?
- Cost and complexity will be higher.
- Your team needs a simpler workflow first.

---

## 14. Assumptions

- Representatives will continue using manual challan forms.
- Data entry will be handled by office staff.
- The super admin will be the only dashboard user.
- Every challan will be assigned a unique challan number.
- The organization wants both operational tracking and market feedback intelligence.
- One contact (identified by mobile number) = one lead in the system.

---

## 15. Success Metrics

The product can be considered successful if:

- All challans are converted into digital records.
- Search time for any record is reduced significantly.
- Follow-up leads are visible and actionable.
- Super admin can analyze district-wise and representative-wise performance.
- Repeat contacts and future opportunities increase.
- Market feedback is captured systematically.
- The company is able to use specimen data for demand analysis and relationship intelligence.

---

## 16. Future Enhancements

After the MVP is stable, the following can be added:

- Mobile app for data-entry staff
- WhatsApp Integration
  - Thank-you message after specimen distribution
  - Follow-up reminder messages
  - Feedback collection messages
- Automated reminders for follow-ups
- Teacher/institute history page
- Representative performance leaderboard

**Explicitly removed from scope:**
- OCR scanning / Image processing
- Map View / GIS features / Route planning
- Subject analytics
- Conversion analytics
- Revenue analytics
- Sales pipeline forecasting
- AI-based lead scoring

---

## 17. Open Questions

- Should follow-up be reschedulable unlimited times or capped?
- What weightage for each metric in the Representative Performance Score formula?
- Should Lead Categories (Hot/Warm/Cold) be auto-calculated or manually assigned?

---

## 18. Final Product Definition

This product is a **Specimen Distribution CRM and Market Feedback Intelligence Platform** that converts handwritten challan forms into structured digital records and provides a super-admin dashboard for lead management, follow-up management, market feedback collection, district-wise demand analysis, book-wise demand analysis, representative performance monitoring, and relationship tracking through repeat contact intelligence.

The system is designed to be practical for non-tech-savvy representatives while still producing high-quality data for business decisions.
