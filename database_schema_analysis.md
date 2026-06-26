# Database Schema Analysis & ER Diagram

Here is a detailed breakdown and entity-relationship diagram of the newly refactored 5NF database schema, along with an architectural analysis.

## Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    locations ||--o{ institutes : "location_id (SET NULL)"
    locations {
        UUID id PK
        TEXT pincode UK
        TEXT district
        TEXT state
    }

    institutes ||--o{ institute_contacts : "institute_id (CASCADE)"
    institutes {
        UUID id PK
        TEXT name
        TEXT address_line
        TEXT village_town
        TEXT locality
        UUID location_id FK
    }

    contacts ||--o{ institute_contacts : "contact_id (CASCADE)"
    contacts {
        UUID id PK
        TEXT name
        TEXT mobile_no UK
    }

    institute_contacts ||--o{ leads : "institute_contact_id (CASCADE)"
    institute_contacts {
        UUID id PK
        UUID institute_id FK
        UUID contact_id FK
        TEXT role
    }

    agents ||--o{ leads : "agent_id (SET NULL)"
    agents ||--o{ challans : "agent_id (SET NULL)"
    agents ||--o{ follow_ups : "agent_id (SET NULL)"
    agents ||--o{ call_feedback : "agent_id (SET NULL)"
    agents {
        UUID id PK
        TEXT name UK
        BOOLEAN is_active
    }

    leads ||--o{ challans : "lead_id (CASCADE)"
    leads ||--o{ follow_ups : "lead_id (CASCADE)"
    leads ||--o{ lead_activities : "lead_id (CASCADE)"
    leads ||--o{ call_feedback : "lead_id (CASCADE)"
    leads {
        UUID id PK
        TEXT lead_seq_id UK
        UUID institute_contact_id FK
        UUID agent_id FK
        TEXT status
        DATE last_contact_date
        DATE next_followup_date
    }

    challans ||--o{ challan_books : "challan_id (CASCADE)"
    challans ||--o{ follow_ups : "challan_id (CASCADE)"
    challans {
        UUID id PK
        TEXT challan_no UK
        DATE challan_date
        UUID lead_id FK
        UUID agent_id FK
    }

    books ||--o{ challan_books : "book_id (CASCADE)"
    books {
        UUID id PK
        TEXT title UK
    }

    challan_books {
        UUID challan_id PK,FK
        UUID book_id PK,FK
        INT quantity
    }

    follow_ups {
        UUID id PK
        UUID lead_id FK
        UUID challan_id FK
        UUID agent_id FK
        DATE followup_date
        TEXT status
    }

    lead_activities {
        UUID id PK
        UUID lead_id FK
        TEXT activity_type
        TEXT description
        JSONB metadata
    }

    call_feedback {
        UUID id PK
        UUID lead_id FK
        UUID agent_id FK
        TEXT call_outcome
        TEXT suggestions
        TEXT complaints
    }
```

## Relationship & Integrity Verification

> [!TIP]
> **Cascade Rules are Perfectly Defined:** All core relationships gracefully handle data deletion without leaving orphans.
> - Deleting a `lead` cascades to `challans`, `follow_ups`, `lead_activities`, and `call_feedback`.
> - Deleting a `contact` or `institute` cascades to the junction table `institute_contacts`, which then cascades to `leads`.
> - If an `agent` or `location` is deleted, it gracefully `SET NULL` so historical data is retained.

### Dependency Graph
The schema forms a strict Directed Acyclic Graph (DAG) with **no circular dependencies**:
`locations` & `contacts` ➡️ `institutes` ➡️ `institute_contacts` ➡️ `leads` ➡️ `challans`, `follow_ups`, `activities`.

## Optimization Opportunities

While the normalization is mathematically sound (up to 5NF), there are a few areas for optimization in the real world:

### 1. Missing Indexes
The following indexes should be added to speed up dashboard queries filtering by representative:
- `CREATE INDEX idx_leads_agent ON leads(agent_id);`
- `CREATE INDEX idx_follow_ups_agent ON follow_ups(agent_id);`

### 2. Redundant Indexes
- `idx_institute_contacts_inst` on `institute_contacts(institute_id)` is **redundant**. The `UNIQUE(institute_id, contact_id)` constraint automatically creates a composite B-Tree index, which inherently optimizes lookups for the first column (`institute_id`). You can safely drop `idx_institute_contacts_inst`.

### 3. Redundant / Obsolete Fields
- **`call_feedback.created_by (TEXT)`**: This is leftover from the denormalized schema. Since we now properly link to `agents` via `agent_id UUID`, the `created_by` text field can be safely dropped to simplify the table.
- **`follow_ups.challan_id`**: Currently, a follow-up points to both a `lead_id` and optionally a `challan_id`. Since a challan fundamentally belongs to a lead, this is slightly denormalized, but heavily advantageous for application logic (knowing exactly which delivery prompted the follow-up) so it should remain.

### 4. Normalization vs Convenience (Data Entry)
Because we are in 5NF, writing a single "Challan" from the frontend requires sequentially writing to 7 tables. If insert performance ever becomes an issue under heavy load, you could implement a PostgreSQL `RPC` (Remote Procedure Call) function to handle the entire insertion transaction atomically in a single network trip instead of chaining them via the Next.js API.
