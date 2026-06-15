# Product Requirements Document (PRD)

## 1. Product Overview

This product is a digital workflow system for managing specimen distribution records for a publishing/company field-sales team. The system is designed for a low-tech field force and a centralized office data-entry team, with a super-admin CRM dashboard for analysis and decision-making.

The workflow starts with a **manual challan form** filled by the field agent, continues with **digital data entry** by an office operator, and ends with a **CRM dashboard** used only by the super admin to analyze leads, follow-ups, book distribution patterns, and sales opportunities.

---

## 2. Problem Statement

Currently, specimen distribution is recorded on paper forms. This creates several issues:

- Manual records are difficult to search, sort, and analyze.
- Lead follow-up is inconsistent.
- Agent performance and distribution trends are not visible in real time.
- Data is scattered and not standardized.
- Future sales and marketing opportunities are missed because the records are not structured digitally.

---

## 3. Goals

### Primary Goals

- Convert paper challan data into structured digital records.
- Make it easy for non-tech-savvy agents to continue using manual forms.
- Provide a simple digital data-entry page for office staff.
- Build a CRM dashboard for super-admin analysis.
- Generate usable leads for follow-up and future sales.

### Secondary Goals

- Track specimen distribution by school/shop, teacher/shopkeeper, district, and agent.
- Identify repeat prospects and high-potential institutions.
- Help the company understand distribution patterns and demand trends.

---

## 4. Users and Roles

### 4.1 Field Agent

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
- Ensure data completeness and correctness.
- Save records into the database.

**Needs:**
- Fast and simple data-entry screen.
- Ability to search and re-open records.
- Validation to reduce mistakes.

### 4.3 Super Admin

The only user who accesses the CRM dashboard.

**Responsibilities:**
- View all data.
- Analyze leads, patterns, and agent performance.
- Review follow-up opportunities.
- Export or filter reports.

**Needs:**
- Dashboard, filters, charts, lead lists, and analytics.
- Secure access with strong permissions.

---

## 5. User Workflow

### Step 1: Manual Form Filling

The field agent fills the paper challan form with:

- Challan No.
- Date
- Teacher / Shopkeeper Name
- Institute / School / Shop Name
- Address
- District
- Pincode
- Mobile Number
- Specimens Given
- Agent Name

### Step 2: Form Submission to Office

The agent submits the completed form to the data-entry person.

### Step 3: Digital Data Entry

The office operator opens the digital data-entry page and enters the challan details into the system.

### Step 4: Record Saved in Database

The system stores the entry in structured form so it can later be searched, filtered, and analyzed.

### Step 5: CRM Analysis

The super admin uses the dashboard to:

- Review all records.
- Identify leads.
- Track follow-up requirements.
- Analyze distribution patterns.
- Monitor agent activity.

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
- District
- Pincode
- Mobile Number
- Specimens Given
- Agent Name

#### Expected Behaviors
- Mandatory field validation.
- Duplicate challan number warning.
- Search existing records before creating a new one.
- Save and edit record functionality.
- Lightweight and easy-to-use interface.

### 6.2 Record Management

The system should allow the office team to:

- Create a new challan record.
- Edit an existing challan record.
- Search by challan number, name, institute, mobile number, district, or agent.
- Filter records by date range, agent, district, institute type, and specimen title.

### 6.3 CRM Dashboard

The dashboard should be accessible only by the super admin.

#### Dashboard Views
- Total challans entered
- Total institutions covered
- Total leads generated
- Leads not contacted yet
- Follow-up pending leads
- Agent-wise distribution count
- District-wise distribution count
- Book/specimen-wise distribution count
- Repeat institution records

#### Dashboard Functions
- Search and filter leads.
- View lead history.
- Segment leads by district, agent, institution type, and date.
- Export data to Excel/CSV.
- View analytics charts and summary cards.

### 6.4 Lead Management

The system should convert every relevant record into a potential lead.

#### Lead Data to Capture
- Institution / shop name
- Contact person name
- Mobile number
- Address
- District
- Specimens received
- Date of first contact
- Follow-up status
- Notes / remarks
- Next action date

#### Lead Status Options
- New
- Contacted
- Interested
- Follow-up Pending
- Converted
- Not Interested
- Closed

### 6.5 Authentication and Access Control

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
| district | String | Yes | Bhagalpur |
| pincode | String | Yes | 813204 |
| mobile_no | String | Yes | 9934xxxxxx |
| specimens_given | Text / JSON | Yes | Hindi, English, Science |
| agent_name | String | Yes | Agent A |
| created_at | DateTime | Yes | Auto |
| updated_at | DateTime | Yes | Auto |

### 7.2 Lead Record

| Field | Type | Required | Example |
|---|---|---:|---|
| lead_id | String | Yes | L0001 |
| challan_no | String | Yes | 501 |
| contact_person | String | Yes | Rajesh Kumar |
| institute_name | String | Yes | XYZ Public School |
| mobile_no | String | Yes | 9934xxxxxx |
| district | String | Yes | Bhagalpur |
| status | Enum | Yes | Follow-up Pending |
| last_contact_date | Date | No | 2026-02-10 |
| next_followup_date | Date | No | 2026-02-20 |
| remarks | Text | No | Interested in new edition |

---

## 8. Reporting and Analytics Requirements

The super admin dashboard should support the following reports:

- Total specimen distributions by month.
- Institution-wise distribution history.
- Agent productivity report.
- District-wise coverage report.
- Lead conversion report.
- Repeat visit report.
- Pending follow-up report.
- Most distributed specimen/book report.
- Institutions not contacted after specimen distribution.

Suggested charts:

- Bar chart for district-wise counts
- Line chart for monthly trends
- Pie chart for lead status breakdown
- Table view for actionable leads

---

## 9. Suggested MVP Scope

### MVP Includes
- Digital data-entry page
- Database storage
- Search and filter records
- Super-admin dashboard
- Lead status tracking
- Basic analytics and export

### MVP Excludes
- Mobile app for agents
- OCR scanning of handwritten forms
- Automated call or WhatsApp reminders
- Advanced AI lead scoring
- Full accounting or billing module

---

## 10. Non-Functional Requirements

### Usability
- Very simple interface for office operators.
- Minimal number of clicks.
- Suitable for low training effort.

### Performance
- Fast data entry and search.
- Dashboard should load quickly even with a large number of records.

### Security
- Role-based login.
- Super-admin access only for analytics.
- Secure data storage and backups.

### Reliability
- Data should not be lost on refresh or session timeout.
- Daily backup of records.

### Scalability
- System should support future growth across many agents, districts, and institutions.

---

## 11. Recommendation for Technology Approach

For this use case, the system should start with a **simple database-backed web application**, not just Excel.

### Recommended Approach
- **Front end:** simple web-based data-entry page
- **Database:** structured database or spreadsheet-like backend
- **Dashboard:** admin analytics panel

### Practical Path
1. Start with a lightweight system that is easy to build and maintain.
2. Keep the agent workflow fully manual.
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

## 12. Assumptions

- Agents will continue using manual challan forms.
- Data entry will be handled by office staff.
- The super admin will be the only dashboard user.
- Every challan will be assigned a unique challan number.
- The organization wants both operational tracking and marketing analysis.

---

## 13. Success Metrics

The product can be considered successful if:

- All challans are converted into digital records.
- Search time for any record is reduced significantly.
- Follow-up leads are visible and actionable.
- Super admin can analyze district-wise and agent-wise performance.
- Repeat contacts and future opportunities increase.
- The company is able to use specimen data for sales growth.

---

## 14. Future Enhancements

After the MVP is stable, the following can be added:

- Mobile app for data-entry staff
- OCR or scanning support for paper challans
- Automated reminders for follow-ups
- WhatsApp integration
- Call log tracking
- Teacher/institute history page
- Sales conversion tracking
- Agent performance leaderboard
- Map-based coverage analysis
- AI-based lead scoring

---

## 15. Open Questions

- Should specimen names be stored as a fixed dropdown list or free text?
- Will there be one challan per institution or multiple entries per challan?
- Do you want separate records for school, coaching, and shop, or one unified institute type?
- Should follow-up be handled inside this system or linked to a separate sales CRM later?

---

## 16. Final Product Definition

This product is a **specimen distribution CRM system** that converts handwritten challan forms into structured digital records and provides a super-admin dashboard for lead generation, follow-up planning, and sales analysis.

The system is designed to be practical for non-tech-savvy agents while still producing high-quality data for business decisions.

