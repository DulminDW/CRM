# WINDOW COMPANIES CRM — CORE DATABASE DESIGN (MODULES 1–3)

**Document Version:** 1.0.0  
**Status Date:** November 02, 2026  
**Classification:** Internal Technical Architecture Specification  
**Primary Source of Truth:** `WINDOW_COMPANIES_CRM_COMPLETE_PROJECT_HANDOVER.md`  
**Phase State:** Phase 2A — Core Database Design Verification (Design Only / No Live Execution)

---

## 1. Executive Overview

This document specifies the core relational schema for **WINDOW COMPANIES CRM**, encompassing **Modules 1, 2, and 3** (7 of the 26 planned normalized tables). These core tables represent the fundamental master entities upon which all operational CRM features—rate sheets, special rates, quote snapshots, sales activities, internal communications, and audit trails—depend.

### Scope of Core Design
1. **Module 1: Employees & System Access**
   - `user_profiles` (Extends Supabase `auth.users` for company employees)
   - `user_permissions` (Granular capability flags assigned by Admin)
2. **Module 2: Travel Agency Hierarchy**
   - `travel_agencies` (Master travel agency records)
   - `agency_markets` (Regional market desks partitioned per agency)
   - `agency_members` (Contact profiles for agency personnel)
3. **Module 3: Hotel & Seasonal Calendar**
   - `hotels` (Partner hotel inventory)
   - `hotel_seasons` (Property-specific date periods and seasonal labels)

---

## 2. Table-by-Table Architectural Specification

### 2.1 `user_profiles` (Module 1 — Table 1)
- **Business Purpose:** Represents internal Window Companies employees (estimated 5 to 15 staff members). Extends Supabase's managed `auth.users` table with business profile fields.
- **Security Boundary:** **Internal staff only.** Agency members and external contacts **NEVER** receive accounts in `user_profiles` or `auth.users`.
- **Primary Key:** `id UUID` (Maps 1-to-1 to `auth.users.id`).
- **Columns:**
  - `id UUID PRIMARY KEY`: Matches authenticated employee UUID.
  - `full_name VARCHAR(255) NOT NULL`: Official employee display name.
  - `role VARCHAR(20) NOT NULL DEFAULT 'STAFF'`: Access tier (`ADMIN` or `STAFF`).
  - `is_active BOOLEAN NOT NULL DEFAULT TRUE`: Account activation status.
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`: Profile creation timestamp.
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`: Last update timestamp.
- **Integrity Constraints:**
  - `chk_user_profile_name_len`: `CHECK (char_length(full_name) >= 2)`
  - `chk_user_profile_role`: `CHECK (role IN ('ADMIN', 'STAFF'))`
- **Architectural Rationale (Why Not a Separate `roles` Table?):**
  Window Companies operates with a fixed, binary role hierarchy: `ADMIN` (administrative governance, user management, rate sheet publishing) and `STAFF` (quotations, contact management, sales activities). Because role permissions do not vary dynamically across dozens of custom groups, storing `role` as an enumerated string with strict check constraint simplifies schema complexity, avoids unnecessary joins on every authentication lookup, and is fully fortified by row-level security functions (`is_admin()`, `is_active_employee()`).

### 2.2 `user_permissions` (Module 1 — Table 2)
- **Business Purpose:** Isolates high-privilege operational capabilities that can be granted by an Admin to specific Staff members without elevating them to full system Administrators.
- **Key Capability:** `CAN_MANAGE_RATES` (enables modifying hotel rate sheets and base components).
- **Columns:**
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE`: Target employee.
  - `permission_key VARCHAR(50) NOT NULL`: Assigned permission flag.
  - `granted_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT`: Admin who granted the permission.
  - `granted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`: Grant timestamp.
- **Integrity Constraints:**
  - `uq_user_permission`: `UNIQUE (user_id, permission_key)`
  - `chk_permission_key`: `CHECK (permission_key IN ('CAN_MANAGE_RATES', 'CAN_MANAGE_USERS', 'CAN_CREATE_CHAT_GROUPS'))`
- **Privilege Escalation Prevention:**
  Staff cannot grant permissions to themselves or others. In RLS and database triggers, only users where `is_admin() = TRUE` can insert or delete from `user_permissions`. Foreign key `granted_by` prevents deleting an Admin profile while audit records exist (`ON DELETE RESTRICT`).

---

### 2.3 `travel_agencies` (Module 2 — Table 3)
- **Business Purpose:** Master directory of client Destination Management Companies (DMCs) and travel agencies (e.g., Jetwing Travels, Aitken Spence, Walkers Tours).
- **Columns:**
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `name VARCHAR(255) NOT NULL`: Official travel agency name.
  - `code VARCHAR(50)`: Optional business or account code.
  - `country VARCHAR(100)`: Country of headquarters/operation.
  - `city VARCHAR(100)`: Operating city.
  - `phone VARCHAR(50)`: Primary telephone number.
  - `email VARCHAR(255)`: Primary corporate email.
  - `status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'`: Operational status.
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
- **Integrity Constraints:**
  - `uq_agency_name`: `UNIQUE (name)` — Prevents duplicate agency profiles.
  - `chk_agency_name_len`: `CHECK (char_length(name) >= 2)`
  - `chk_agency_status`: `CHECK (status IN ('ACTIVE', 'INACTIVE'))`

---

### 2.4 `agency_markets` (Module 2 — Table 4)
- **Business Purpose:** Regional market desks operating within a specific agency (e.g., Indian Market, Europe Market, Belgium Market, Middle East Desk).
- **Relational Cardinality:** Many-to-one with `travel_agencies` (one agency has many markets).
- **Columns:**
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `agency_id UUID NOT NULL REFERENCES public.travel_agencies(id) ON DELETE RESTRICT`
  - `market_name VARCHAR(100) NOT NULL`: Name of regional market desk.
  - `description TEXT`: Internal notes regarding desk scope.
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
- **Integrity Constraints:**
  - `uq_agency_market`: `UNIQUE (agency_id, market_name)` — "Indian Market" can exist under Jetwing and under Aitken Spence, but cannot be duplicated within Jetwing.
  - `uq_agency_market_composite`: `UNIQUE (id, agency_id)` — **Crucial composite candidate key.** Allows child tables (`agency_members`, `quotes`, `sales_activities`) to bind `(market_id, agency_id)` directly to the same agency.
  - `chk_market_name_len`: `CHECK (char_length(market_name) >= 2)`

---

### 2.5 `agency_members` (Module 2 — Table 5)
- **Business Purpose:** Contact profiles for individual travel agency personnel (~1,000 Excel contacts; e.g., Sarith, Jana, Priya).
- **Relational Cardinality:** Belongs to one `travel_agencies` and one `agency_markets`.
- **Columns:**
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `agency_id UUID NOT NULL`
  - `market_id UUID NOT NULL`
  - `full_name VARCHAR(255) NOT NULL`: Contact full name.
  - `email VARCHAR(255) NOT NULL`: Direct contact email.
  - `phone VARCHAR(50)`: Mobile / desk phone number.
  - `position VARCHAR(100)`: Designation (e.g. Tour Executive, Market Lead).
  - `member_code VARCHAR(50)`: Optional agency staff identifier.
  - `status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'`: Contact status.
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
- **Integrity Constraints & Referential Hardening:**
  - `fk_agency_members_agency`: `FOREIGN KEY (agency_id) REFERENCES public.travel_agencies(id) ON DELETE RESTRICT`
  - `fk_agency_members_composite_market`: `FOREIGN KEY (market_id, agency_id) REFERENCES public.agency_markets(id, agency_id) ON DELETE RESTRICT`  
    *Guarantees a member cannot be created under Agency A while referencing a market belonging to Agency B.*
  - `uq_agency_member_composite`: `UNIQUE (id, agency_id)` — Supports downstream composite verification in sales activities.
  - `chk_member_name_len`: `CHECK (char_length(full_name) >= 2)`
  - `chk_member_email_format`: `CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')` — Protects email dispatch against invalid addresses and header injections.
  - `chk_member_status`: `CHECK (status IN ('ACTIVE', 'INACTIVE'))`
- **Performance Indexes:**
  - `idx_agency_members_lower_email`: `ON public.agency_members (LOWER(email))` — Supports fast case-insensitive duplicate warning lookups.
  - `idx_agency_members_agency_market`: `ON public.agency_members (agency_id, market_id)` — Accelerates filtered dropdowns in quotation wizards.

---

### 2.6 `hotels` (Module 3 — Table 6)
- **Business Purpose:** Partner hotels and resorts represented by Window Companies (Pvt) Ltd.
- **Confirmed Initial Inventory:**
  1. Randoli
  2. Beragala
  3. Horton Heights
  4. H.S.H. (*Preserved as confirmed abbreviation; legal name uninvented*)
- **Columns:**
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `hotel_name VARCHAR(255) NOT NULL`: Official hotel property name.
  - `hotel_code VARCHAR(50)`: Short property code.
  - `area VARCHAR(100)`: Geographic region (e.g., Kandy, Beragala, Nuwara Eliya).
  - `service_type VARCHAR(20) NOT NULL DEFAULT 'BOTH'`: Distribution channel type (`ONLINE`, `OFFLINE`, `BOTH`).
  - `status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'`: Partnership status.
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
- **Integrity Constraints:**
  - `uq_hotel_name`: `UNIQUE (hotel_name)` — Prevents registering duplicate hotel properties.
  - `chk_hotel_name_len`: `CHECK (char_length(hotel_name) >= 2)`
  - `chk_hotel_service_type`: `CHECK (service_type IN ('ONLINE', 'OFFLINE', 'BOTH'))`
  - `chk_hotel_status`: `CHECK (status IN ('ACTIVE', 'INACTIVE'))`

---

### 2.7 `hotel_seasons` (Module 3 — Table 7)
- **Business Purpose:** Seasonal pricing periods defined independently for each partner hotel (e.g., *2026 Summer*, *2026/27 Winter*, *2027 Summer*).
- **Relational Cardinality:** Many-to-one with `hotels` (one hotel has many seasons).
- **Columns:**
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE RESTRICT`
  - `season_label VARCHAR(100) NOT NULL`: Descriptive label.
  - `date_from DATE NOT NULL`: Season start date.
  - `date_to DATE NOT NULL`: Season end date.
  - `status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'`: Operational status (`ACTIVE`, `UPCOMING`, `EXPIRED`).
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
- **Integrity Constraints:**
  - `uq_hotel_season`: `UNIQUE (hotel_id, season_label)` — Prevents duplicate season labels for the same hotel.
  - `uq_hotel_season_composite`: `UNIQUE (id, hotel_id)` — **Crucial composite candidate key.** Allows downstream tables (`hotel_rate_sheets`, `agency_special_rates`, `quote_items`) to strictly guarantee that a rate sheet or quote item references a season belonging to the *same* hotel.
  - `chk_season_dates`: `CHECK (date_to >= date_from)` — Guarantees end date is equal to or after start date.
  - `chk_season_status`: `CHECK (status IN ('ACTIVE', 'UPCOMING', 'EXPIRED'))`

---

## 3. Relational Mapping & Constraint Architecture Matrix

| Parent Table | Candidate Key | Child Table | Foreign Key Column(s) | Composite Constraint Type | `ON DELETE` Action | Architectural Rationale |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| `user_profiles` | `id` | `user_permissions` | `user_id` | Single-column FK | `CASCADE` | User removal cleans up permission records. |
| `user_profiles` | `id` | `user_permissions` | `granted_by` | Single-column FK | `RESTRICT` | Cannot delete an Admin while permission audit trail exists. |
| `travel_agencies` | `id` | `agency_markets` | `agency_id` | Single-column FK | `RESTRICT` | Prevents accidental deletion of agency with active desks. |
| `travel_agencies` | `id` | `agency_members` | `agency_id` | Single-column FK | `RESTRICT` | Prevents deleting agency with contacts. |
| `agency_markets` | `(id, agency_id)` | `agency_members` | `(market_id, agency_id)` | **Composite FK** | `RESTRICT` | **Integrity Protection 1:** Guarantees contact belongs to market of the same agency. |
| `hotels` | `id` | `hotel_seasons` | `hotel_id` | Single-column FK | `RESTRICT` | Prevents deleting hotel with defined seasons. |
| `hotel_seasons` | `(id, hotel_id)` | `hotel_rate_sheets` | `(season_id, hotel_id)` | **Composite FK** | `RESTRICT` | **Integrity Protection 2:** Guarantees rate sheet references the hotel's own season. |
| `hotel_seasons` | `(id, hotel_id)` | `agency_special_rates` | `(season_id, hotel_id)` | **Composite FK** | `RESTRICT` | **Integrity Protection 3:** Guarantees special rate references the hotel's own season. |
| `hotel_seasons` | `(id, hotel_id)` | `quote_items` | `(season_id, hotel_id)` | **Composite FK** | `RESTRICT` | **Integrity Protection 4:** Guarantees quote line item preserves genuine hotel-season pairing. |
