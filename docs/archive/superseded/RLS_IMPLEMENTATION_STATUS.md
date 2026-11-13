# WINDOW COMPANIES CRM — ROW LEVEL SECURITY (RLS) IMPLEMENTATION STATUS

**Review Date:** November 04, 2026  
**Auditor:** Senior Supabase Developer & Security Auditor  
**Project:** WINDOW COMPANIES CRM  
**Company:** Window Companies (Pvt) Ltd  
**Current Status:** **DRAFT SPECIFICATION COMPLETED — STRICTLY NOT YET EXECUTED**

---

## 1. Status Overview

Row Level Security (RLS) for the Window Companies CRM has been compiled into an authoritative draft script:
- [`docs/database/002_auth_rls_DRAFT.sql`](file:///c:/Users/Nethshan%20Dulmin/Desktop/CRM/docs/database/002_auth_rls_DRAFT.sql)

In accordance with strict security rules, **no SQL commands or policies have been executed against any live Supabase instance.**

| Security Domain | Design Status | Live DB Status |
| :--- | :---: | :---: |
| **Default-Deny Model across all 26 Tables** | COMPLETED | NOT STARTED (Awaiting Migration) |
| **SECURITY DEFINER Helper Functions** | COMPLETED | NOT STARTED (Awaiting Migration) |
| **Function Execution Revocation from PUBLIC** | COMPLETED | NOT STARTED (Awaiting Migration) |
| **Employee Profile Access (`user_profiles`)** | COMPLETED | NOT STARTED (Awaiting Migration) |
| **Self-Promotion Prevention (`role` update guard)** | COMPLETED | NOT STARTED (Awaiting Migration) |
| **Permission Writes Restriction (`user_permissions`)** | COMPLETED | NOT STARTED (Awaiting Migration) |
| **Rate Management Isolation (`CAN_MANAGE_RATES`)** | COMPLETED | NOT STARTED (Awaiting Migration) |
| **Audit Logs Immutability (Append-only)** | COMPLETED | NOT STARTED (Awaiting Migration) |

---

## 2. Security Mechanisms in the Draft SQL

### 2.1 Hardened SECURITY DEFINER Helper Functions
To prevent recursion errors and search-path hijacking attacks, each helper function explicitly defines:
1. `SET search_path = public, pg_temp` — guarantees execution within known schemas.
2. `STABLE` execution characteristics.
3. Explicit `auth.uid() IS NULL` guards that immediately return `FALSE` for unauthenticated or anonymous calls.
4. `REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC` and `GRANT EXECUTE ... TO authenticated`.

### 2.2 Table-Level Anti-Tampering Controls
- **`user_profiles` Update Policy:**
  Regular employees can update their own personal contact details (`full_name`), but the `WITH CHECK` expression enforces that `role` and `is_active` must match their existing values in the database. Only an authenticated Admin can alter an employee's role or activate/deactivate an account.
- **`user_permissions` Modification:**
  Restricted exclusively to `public.is_admin()`. Staff cannot grant permissions to themselves or peer team members.
- **`hotel_rate_sheets` & `agency_special_rates`:**
  Write privileges are restricted to `public.can_manage_rates()` (Admins or Staff with explicit permission).

---

## 3. Execution Requirements & Prerequisite Sequence

Before running `docs/database/002_auth_rls_DRAFT.sql`:

1. **Step 1:** Execute `docs/database/001_initial_schema_DRAFT.sql` to establish the 26 relational tables, composite foreign keys, and indexes.
2. **Step 2:** Seed the initial administrator user profile into `user_profiles` with `role = 'ADMIN'`.
3. **Step 3:** Execute `docs/database/002_auth_rls_DRAFT.sql` in the Supabase SQL editor.
4. **Step 4:** Perform read/write role-boundary tests with test Admin and Staff accounts.

