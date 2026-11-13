# WINDOW COMPANIES CRM — OPEN BUSINESS DECISIONS: AGENCY MEMBER EMAIL UNIQUENESS

**Document Reference:** `docs/project/OPEN_BUSINESS_DECISIONS.md`  
**Classification:** Business Logic & Data Architecture  
**Date:** November 04, 2026  
**Status:** Open / Pending Business Stakeholder Sign-Off  

---

## 1. Decision Item: Scope of Agency Member Email Uniqueness

### Context
In the travel agency hierarchy:
`Travel Agency (Level 1) ➔ Agency Market (Level 2) ➔ Agency Member (Level 3)`

Agency members represent contact persons within travel agencies (e.g. `sarith@jetwing.lk`, `inquiries@jetwing.lk`).

### The Two Alternatives
1. **Option A: Global Email Uniqueness (Unique across ALL agencies)**
   - *Behavior:* An email address can only exist once across the entire CRM database.
   - *Risk:* In B2B travel operations, agencies occasionally share regional desk inboxes (e.g. `reservations@dmcgroup.com`), or external contractors/guides may represent multiple distinct travel desks. Enforcing a hard global unique constraint can cause valid contact creation and bulk Excel uploads to fail abruptly.

2. **Option B: Per-Agency Email Uniqueness (Unique per Agency or per Market)**
   - *Behavior:* An email address must be unique within an agency, but could appear in another agency if legitimate.
   - *Risk:* Potential for accidental duplicate entries if different spelling or casing is used.

### 2. Current Database State
- The PostgreSQL table `public.agency_members` has:
  - `CONSTRAINT chk_member_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')`
  - `CREATE INDEX idx_agency_members_lower_email ON public.agency_members (LOWER(email));`
- **There is NO hard global UNIQUE constraint on `email`.** This preserves operational flexibility.

### 3. Implementation Policy in Phase 3
To balance data integrity with operational reality without making unapproved assumptions:
1. **Pre-flight Duplicate Detection:**
   - Before saving a new member or updating an email, the CRM checks for existing records matching `LOWER(email)`.
2. **Contextual Duplicate Warning:**
   - If a match is detected:
     - The CRM displays a clear warning banner alerting the user: *"A member with this email already exists under [Agency Name] → [Market Name] ([Member Name])."*
     - No private or unauthorized data is revealed.
   - For an **exact duplicate within the same agency and market**, duplicate creation is blocked to avoid clutter.
   - For a cross-agency or cross-market duplicate, a non-blocking confirmation warning allows the operator to verify before proceeding, preventing silent data overwrite.
3. **Adaptability:**
   - If Window Companies management later confirms a hard global uniqueness policy, a single migration adding `CONSTRAINT uq_agency_member_global_email UNIQUE (email)` can be deployed without altering frontend service abstractions.

---

## 2. Decision Item: Hotel Season Date Overlaps & Granular Services Schema

### Context
In the Hotel & Season hierarchy:
`Hotels (Master Inventory) ➔ Hotel Seasons (Seasonal Periods) ➔ Hotel Rate Sheets (Versioned Pricing)`

### Open Business Decisions:
1. **Season Date Overlaps:**
   - *Behavior:* Can a single partner hotel have two seasons with overlapping date ranges (e.g., overlapping standard season and special festival promotion)?
   - *Current Database State:* The database enforces `chk_season_dates CHECK (date_to >= date_from)` and `uq_hotel_season UNIQUE (hotel_id, season_label)`. There is **NO database exclusion constraint** forbidding date overlaps.
   - *Phase 4 Policy:* In accordance with strict instructions not to invent restrictive business rules, overlapping dates are **allowed** in the database. The UI displays an informational non-blocking advisory note when dates overlap so operators are aware, but never blocks submission.

2. **Hotel Service Information Model:**
   - *Behavior:* Does Window Companies require a separate normalized `hotel_services` catalogue table (e.g. Wi-Fi, Pool, Spa, Airport Transfers, F&B) or should services remain tracked at the property level via operational flags / service types (`ONLINE`, `OFFLINE`, `BOTH`) and structured description notes until Excel rate cards are audited?
   - *Current Database State:* `public.hotels` contains `service_type VARCHAR(20) CHECK (service_type IN ('ONLINE', 'OFFLINE', 'BOTH'))`.
   - *Phase 4 Policy:* Services are captured cleanly via the confirmed `service_type` operational attribute alongside property notes/facilities metadata. We do NOT invent an unconfirmed fixed services table or arbitrary prices. If a dedicated catalog table is later requested by stakeholders, a separate non-destructive migration will be introduced.

