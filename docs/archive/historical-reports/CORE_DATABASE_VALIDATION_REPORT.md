# WINDOW COMPANIES CRM — CORE DATABASE VALIDATION & STATIC INTEGRITY REPORT

**Document Version:** 1.0.0  
**Status Date:** November 02, 2026  
**Auditor:** Senior PostgreSQL Database Architect & Software Project Auditor  
**Phase State:** Phase 2A — Static Architecture Review (Design Only / Zero Live Database Execution)

---

## 1. Executive Summary

This report delivers the results of an exhaustive static inspection and validation pass on the **Core Database Design** of **WINDOW COMPANIES CRM**, covering **Modules 1, 2, and 3** (Tables 1 through 7).

### Safety Boundary Affirmation
- **Live Database Connection:** None performed.
- **SQL Execution / Migrations:** Zero executed.
- **Auth / RLS Activation:** Zero live activation (design-only specifications).
- **Draft SQL Preservation:** `001_initial_schema_DRAFT.sql` validated via Node.js static AST/token analysis.

---

## 2. Table-by-Table Inspection & Verification Matrix

| Checklist Item | Table Name | Status | Key Columns & Constraints Verified | Delete Rule | Referential Integrity Verified |
| :--- | :--- | :---: | :--- | :---: | :---: |
| **1. Users & Roles** | `user_profiles` | **COMPLETED** | `id UUID PK`, `full_name`, `role ('ADMIN','STAFF')`, `is_active`, `chk_user_profile_name_len`, `chk_user_profile_role` | N/A | Maps to Supabase `auth.users(id)`. External agency members strictly prohibited. |
| **1. Users & Roles (Perms)** | `user_permissions` | **COMPLETED** | `user_id FK`, `permission_key ('CAN_MANAGE_RATES',...)`, `granted_by FK`, `uq_user_permission` | `CASCADE` (user) / `RESTRICT` (grantor) | Admin self-privilege escalation prevented. Rate management permission isolated. |
| **2. Agencies** | `travel_agencies` | **COMPLETED** | `id UUID PK`, `name UK`, `code`, `country`, `city`, `phone`, `email`, `status ('ACTIVE','INACTIVE')` | `RESTRICT` | Primary entity. Master duplicate prevention via `UNIQUE (name)`. |
| **3. Markets** | `agency_markets` | **COMPLETED** | `agency_id FK`, `market_name`, `uq_agency_market (agency_id, market_name)`, `uq_agency_market_composite (id, agency_id)` | `RESTRICT` | Duplicate market names allowed across different agencies, barred within the same agency. |
| **4. Members** | `agency_members` | **COMPLETED** | `agency_id FK`, `market_id`, `(market_id, agency_id) Composite FK`, `uq_agency_member_composite (id, agency_id)`, `email regex check` | `RESTRICT` | **Composite Foreign Key:** Guarantees member cannot link to Agency A while selecting Agency B's market. Lowercase email index created for deduplication. |
| **5. Hotels** | `hotels` | **COMPLETED** | `hotel_name UK`, `hotel_code`, `area`, `service_type ('ONLINE','OFFLINE','BOTH')`, `status ('ACTIVE','INACTIVE')` | `RESTRICT` | Unique hotel names. Known hotels supported: Randoli, Beragala, Horton Heights, H.S.H. (abbreviation unexpanded). |
| **6. Seasons** | `hotel_seasons` | **COMPLETED** | `hotel_id FK`, `season_label`, `date_from`, `date_to`, `uq_hotel_season (hotel_id, season_label)`, `uq_hotel_season_composite (id, hotel_id)`, `date_to >= date_from` | `RESTRICT` | Seasons configured per hotel. Dates vary per property. Composite unique key supports downstream composite rate sheet references. |
| **7. Relationships & Constraints** | All 7 Core Tables | **COMPLETED** | 50 total FK relationships parsed across 26 tables. Zero orphaned references. `ON DELETE RESTRICT` protects historical data. | As Table | 100% static consistency between core and downstream tables (Modules 4–9). |

---

## 3. Detailed Verification of Crucial Business Rules

### 3.1 Agency Contact vs. Employee Isolation (Task 1 & Task 4)
- **Verified:** `user_profiles` is reserved strictly for internal staff (5–15 employees).
- **Verified:** Agency contacts (~1,000 Excel contacts) reside exclusively in `agency_members`. No login columns, no passwords, and no Supabase Auth connections exist in `agency_members`.

### 3.2 Cross-Agency Market Isolation (Task 3 & Task 4)
- **Problem Prevented:** In a standard single-column FK model, an agency member could be assigned to `agency_id = Jetwing` while selecting `market_id = Indian Market (belonging to Aitken Spence)`.
- **Solution Verified:** 
  1. `agency_markets` defines a composite unique key: `CONSTRAINT uq_agency_market_composite UNIQUE (id, agency_id)`.
  2. `agency_members` enforces a composite foreign key: `CONSTRAINT fk_agency_members_composite_market FOREIGN KEY (market_id, agency_id) REFERENCES public.agency_markets(id, agency_id) ON DELETE RESTRICT`.
  3. This completely prevents cross-agency market assignment at the database engine level.

### 3.3 Hotel-Season Integrity & Multi-Property Calendars (Task 5 & Task 6)
- **Problem Prevented:** Rate sheets, special rates, or quote items could inadvertently attach Hotel A to a season belonging to Hotel B.
- **Solution Verified:**
  1. `hotel_seasons` defines a composite unique key: `CONSTRAINT uq_hotel_season_composite UNIQUE (id, hotel_id)`.
  2. Downstream tables (`hotel_rate_sheets`, `agency_special_rates`, `quote_items`) reference `(season_id, hotel_id) REFERENCES public.hotel_seasons(id, hotel_id) ON DELETE RESTRICT`.
  3. Season dates enforce `CHECK (date_to >= date_from)`. Overlapping season restrictions are intentionally omitted at the DB level pending company confirmation of whether sub-seasons (e.g. Peak periods inside Summer) exist.

### 3.4 Rate Management Permission Isolation (Task 1)
- **Requirement:** Admin has full rights; Staff has standard CRM access; rate editing is independently granted by Admin.
- **Solution Verified:**
  1. Stored in `user_permissions` under `permission_key = 'CAN_MANAGE_RATES'`.
  2. Guarded by PostgreSQL helper function `can_manage_rates(user_uuid)` which returns `TRUE` if user is `ADMIN` or holds an active `CAN_MANAGE_RATES` permission grant.

---

## 4. Static Code & Schema Validation Results

Static checks were performed against `001_initial_schema_DRAFT.sql`:
1. **Table Count:** Exactly 26 tables defined in `001_initial_schema_DRAFT.sql`.
2. **Core Tables Count:** Exactly 7 tables (`user_profiles`, `user_permissions`, `travel_agencies`, `agency_markets`, `agency_members`, `hotels`, `hotel_seasons`).
3. **Foreign Keys Parsed:** 50 foreign key constraints across the schema. All target tables and column signatures exist.
4. **Parenthesis / DDL Balance:** Clean match, zero unbalanced blocks.
5. **Notice on PostgreSQL Parser:**
   > *Static regex and AST token checks verify that all SQL statements, constraints, types, and references are structurally consistent. However, static analysis is NOT an execution test against a live PostgreSQL 15/16 engine. Live execution must only be performed after project-owner authorization of Phase 2B.*

---

## 5. Remaining Business Questions & Decisions Needed

The following core business questions remain open and do not block design, but require project-owner confirmation before Phase 2B:
1. **Agency Member Email Uniqueness:** Should `agency_members.email` be globally unique, unique per agency, or non-unique (to permit shared desk emails like `reservations@jetwing.lk`)? *Current design uses non-unique email with a lowercase index for soft warnings.*
2. **Member Code Format:** Is `member_code` generated by the CRM or imported from client agency records?
3. **Full Name of H.S.H.:** What is the full legal property name of H.S.H.? *Current design stores 'H.S.H.' as confirmed on whiteboard.*
4. **Overlapping Seasons:** Can a hotel have overlapping promotional or peak sub-seasons? *Current design permits overlapping dates, enforcing only `date_to >= date_from`.*
