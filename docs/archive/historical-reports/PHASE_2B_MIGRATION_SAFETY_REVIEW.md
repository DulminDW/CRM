# WINDOW COMPANIES CRM — PHASE 2B DATABASE MIGRATION SAFETY REVIEW

**Document Version:** 1.0.0  
**Date:** November 04, 2026  
**Auditor:** Senior React, TypeScript, Node.js & Supabase Database Engineer  
**Classification:** Internal Technical Architecture & Database Security Audit  
**Target Database:** Supabase PostgreSQL (Window Companies CRM)  
**Execution State:** REVIEW ONLY — ZERO SQL EXECUTED  

---

## 1. Executive Summary

A comprehensive safety, dependency, and security review was conducted across all existing database schemas, draft migrations, and RLS specifications:
- `docs/database/001_initial_schema_DRAFT.sql`
- `docs/database/002_auth_rls_DRAFT.sql`
- `docs/database/003_phase2b_auth_and_schema.sql`
- `docs/database/DATABASE_ARCHITECTURE.md`
- `docs/database/DATABASE_SECURITY_RLS_DESIGN.md`
- `docs/project/ADMIN_BOOTSTRAP_GUIDE.md`
- `docs/project/RLS_DEPLOYMENT_GUIDE.md`

### Migration Verdicts at a Glance:
| Migration Script | Description | Safety Status | Recommendation |
|---|---|---|---|
| **`001_initial_schema_DRAFT.sql`** | Master 26-table schema | **SAFE AFTER CORRECTIONS** | Add explicit foreign key `user_profiles.id -> auth.users(id)` and UUID extension; do NOT run without correction. |
| **`002_auth_rls_DRAFT.sql`** | Full 26-table RLS Draft | **DO NOT APPLY** | Superseded by consolidated script; running both causes duplicate function/policy collisions. |
| **`003_phase2b_auth_and_schema.sql`** | Auth & Permissions RLS Draft | **SAFE TO APPLY (After 001)** | Safe, idempotent, non-destructive, and hardened. Run only after 001 is applied. |

---

## 2. File-by-File Dependency & Collision Analysis

### 2.1 File Relationship & Overlap Matrix
- **`001_initial_schema_DRAFT.sql`:**
  - Creates the 26 normalized domain tables across 9 modules (`user_profiles`, `user_permissions`, `travel_agencies`, `agency_markets`, `agency_members`, `hotels`, `hotel_seasons`, `hotel_rate_sheets`, `agency_special_rates`, `quotes`, etc.).
  - Defines composite foreign keys, unique constraints, check constraints, and performance indexes.
  - **Does NOT** enable RLS on any table.
  - In `user_profiles`, lines 27–37 define `id UUID PRIMARY KEY`, with a comment stating `-- In Supabase, this matches auth.users(id)`, but it **omits the explicit foreign key constraint clause**: `REFERENCES auth.users(id) ON DELETE RESTRICT`.
- **`002_auth_rls_DRAFT.sql`:**
  - Contains RLS activation (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) across all 26 tables.
  - Defines the 3 helper functions: `is_active_employee()`, `is_admin()`, and `can_manage_rates()`.
  - Defines RLS policies for `user_profiles`, `user_permissions`, `hotel_rate_sheets`, `agency_special_rates`, and `audit_logs`.
  - **Collision Warning:** Does not use `DROP POLICY IF EXISTS`. If executed after `003` (or if executed twice), PostgreSQL will raise `ERROR: policy "..." already exists`.
- **`003_phase2b_auth_and_schema.sql`:**
  - Creates extension `uuid-ossp` and `pgcrypto`.
  - Creates necessary enum types (`user_role`, `permission_key`, `rate_tier`, `quote_status`, etc.) via `IF NOT EXISTS` DO blocks.
  - Defines `user_profiles` with `REFERENCES auth.users(id) ON DELETE RESTRICT`.
  - Defines `user_permissions` with foreign keys to `user_profiles`.
  - Installs the 3 hardened `SECURITY DEFINER` functions with fixed `search_path`.
  - Uses `DROP POLICY IF EXISTS` before creating policies on `user_profiles` and `user_permissions`, making it completely idempotent and re-runnable.

### 2.2 Duplication & Overlap Findings
1. **Executing both `002` and `003`:**  
   `003` contains the auth table RLS policies from `002`. Running `002` after `003` will fail due to duplicate policy names on `user_profiles` and `user_permissions`. **`002_auth_rls_DRAFT.sql` should be archived/retired as superseded.**
2. **Table Creation Overlap (`001` vs `003`):**  
   Both files attempt `CREATE TABLE IF NOT EXISTS public.user_profiles` and `public.user_permissions`.
   - `001` creates `role VARCHAR(20) CHECK (role IN ('ADMIN', 'STAFF'))`.
   - `003` creates `role public.user_role`.
   - If `001` runs first, `user_profiles.role` will be `VARCHAR(20)`. When `003` runs, `CREATE TABLE IF NOT EXISTS` will see `user_profiles` already exists and will skip creation. This means `role` remains `VARCHAR(20)`. The TypeScript frontend works identically with either, but Postgres type consistency is cleaner if aligned.

---

## 3. Authentication Schema & Profile Safety Review

### 3.1 Relationship Between `auth.users` and `public.user_profiles`
- In `001_initial_schema_DRAFT.sql`: Line 28 has `id UUID PRIMARY KEY`. It lacks an explicit `REFERENCES auth.users(id)` constraint.
  - **Risk:** Without an explicit foreign key to `auth.users(id)`, orphaned user profile UUIDs could be inserted that do not correspond to any valid Supabase Auth user.
  - **Correction:** Must add `REFERENCES auth.users(id) ON DELETE RESTRICT`.
- In `003_phase2b_auth_and_schema.sql`: Line 62 explicitly specifies `id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT`. This is correct and safe.

### 3.2 Privilege Escalation & Self-Modification Checks
- **Can Staff promote themselves to ADMIN?**  
  **NO.** Prevented by `user_profiles_update_policy` in both `002` and `003`:
  ```sql
  WITH CHECK (
    public.is_admin() OR (
      id = auth.uid() AND
      role = (SELECT role FROM public.user_profiles WHERE id = auth.uid()) AND
      is_active = (SELECT is_active FROM public.user_profiles WHERE id = auth.uid())
    )
  );
  ```
  If a non-admin attempts to update `role` or `is_active`, the `WITH CHECK` expression evaluates to false, causing PostgreSQL to reject the update.
- **Can Staff grant themselves permissions (e.g. `CAN_MANAGE_RATES`)?**  
  **NO.** `user_permissions_insert_admin_only`, `user_permissions_update_admin_only`, and `user_permissions_delete_admin_only` enforce `WITH CHECK (public.is_admin())` and `USING (public.is_admin())`.
- **Are deactivated employees blocked at the database level?**  
  **YES.** Helper functions `is_active_employee()`, `is_admin()`, and `can_manage_rates()` explicitly enforce `WHERE id = auth.uid() AND is_active = TRUE`. If `is_active` is false, all functions return `FALSE`, denying SELECT/INSERT/UPDATE across all protected tables.

---

## 4. Row Level Security (RLS) Policy Analysis

### Policy Specification Matrix (Core Auth & Permissions):

| Target Table | Action | Policy Name | Permitted Roles | Policy Enforcement Rule |
|---|---|---|---|---|
| `user_profiles` | **SELECT** | `user_profiles_select_active_employees` | Active Staff, Active Admin | `USING (public.is_active_employee())` — Unauthenticated/inactive get 0 rows. |
| `user_profiles` | **INSERT** | `user_profiles_insert_admin_only` | Active Admin Only | `WITH CHECK (public.is_admin())` — Staff cannot provision accounts. |
| `user_profiles` | **UPDATE** | `user_profiles_update_policy` | Self (name only) or Admin (all) | `USING (is_admin() OR id = auth.uid())` + `WITH CHECK` (blocks role/status edit by non-admin). |
| `user_profiles` | **DELETE** | `user_profiles_delete_admin_only` | Active Admin Only | `USING (public.is_admin())` — Staff cannot delete profiles. |
| `user_permissions` | **SELECT** | `user_permissions_select_active_employees` | Active Staff, Active Admin | `USING (public.is_active_employee())` — Needed to inspect permissions. |
| `user_permissions` | **INSERT** | `user_permissions_insert_admin_only` | Active Admin Only | `WITH CHECK (public.is_admin())` — Staff cannot grant permissions. |
| `user_permissions` | **UPDATE** | `user_permissions_update_admin_only` | Active Admin Only | `USING (is_admin()) WITH CHECK (is_admin())` |
| `user_permissions` | **DELETE** | `user_permissions_delete_admin_only` | Active Admin Only | `USING (public.is_admin())` |

### 4.1 Evaluation of `SECURITY DEFINER` Functions
1. **Search Path Hijacking:**  
   All 3 helper functions explicitly declare `SET search_path = public, pg_temp`. This neutralizes schema hijacking vulnerabilities.
2. **RLS Recursion Check:**  
   Inside `is_active_employee()` and `is_admin()`, a direct `SELECT 1 FROM public.user_profiles` is executed. Because the functions are `SECURITY DEFINER`, they execute with the permissions of the function owner (`postgres`), bypassing RLS during the internal check. This **prevents infinite recursion loops**.
3. **NULL `auth.uid()` Handling:**  
   All helper functions begin with `CASE WHEN auth.uid() IS NULL THEN FALSE ... END;`. This cleanly handles unauthenticated callers without database exceptions.
4. **Execution Grants:**  
   Default execution privileges on functions are revoked from `PUBLIC` via `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;` and explicitly granted only to `authenticated`. Anonymous users cannot execute them.

---

## 5. SQL Execution Safety Audit

### Checklist:
- **`DROP TABLE` statements:** None present.
- **`TRUNCATE` statements:** None present.
- **Destructive `ALTER` statements:** None present. All ALTERs are non-destructive (`ENABLE ROW LEVEL SECURITY`, `ALTER DEFAULT PRIVILEGES`).
- **Unsafe `DELETE` or `UPDATE` statements:** None present.
- **Unsafe policy replacements:** `003` uses `DROP POLICY IF EXISTS ... ON ...; CREATE POLICY ...` which is completely safe and re-executable.
- **Referential Integrity:** All foreign keys on core parent tables (`travel_agencies`, `hotels`, `hotel_seasons`) enforce `ON DELETE RESTRICT`, preventing accidental cascaded data destruction of client data.
- **Missing Indexes:** `001` defines 12 explicit indexes covering all primary search and foreign key pathways (`idx_agency_members_lower_email`, `idx_rate_sheets_lookup`, `idx_quotes_agency`, etc.).

---

## 6. Required Corrections Before Applying to Live Supabase

### Correction 1: Foreign Key to `auth.users` in `001_initial_schema_DRAFT.sql`
In `001_initial_schema_DRAFT.sql`, lines 27–37:
```sql
-- Current:
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY,
...

-- Required Correction:
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
...
```

### Correction 2: Extension Provisioning
Ensure `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";` and `CREATE EXTENSION IF NOT EXISTS "pgcrypto";` are executed at the very top of `001_initial_schema_DRAFT.sql`. (In `001`, lines 17–18 are commented out).

### Correction 3: Retire `002_auth_rls_DRAFT.sql`
Do **not** execute `002_auth_rls_DRAFT.sql`. Its auth RLS policies are integrated into `003_phase2b_auth_and_schema.sql` with `DROP POLICY IF EXISTS` safety. Running `002` would cause syntax errors and policy name collisions.

---

## 7. Recommended Safe Execution Sequence

Once approved, execute in this exact sequence via the **Supabase Dashboard SQL Editor**:

1. **Step 1 (Master Schema):**
   - Apply corrected `001_initial_schema_DRAFT.sql` (with `REFERENCES auth.users(id)` and UUID extensions enabled).
   - This creates all 26 tables, composite foreign keys, and indexes.
2. **Step 2 (Phase 2B Auth & RLS):**
   - Apply `003_phase2b_auth_and_schema.sql`.
   - This enables RLS on `user_profiles` and `user_permissions`, installs the hardened helper functions, and applies default-deny access policies.
3. **Step 3 (Bootstrap Admin Account):**
   - Follow `docs/project/ADMIN_BOOTSTRAP_GUIDE.md`:
     - Create employee user in Supabase Auth UI (**Authentication** $\rightarrow$ **Users**).
     - Copy the User UUID.
     - Execute the parameterized INSERT in SQL Editor to register the initial `ADMIN` profile in `public.user_profiles`.
4. **Step 4 (Verification):**
   - Test login at `http://localhost:5173/login`.
   - Verify active session, profile loading, and route access.

---

## 8. Status & Next Actions

- [x] **Safety Review Completed**
- [ ] **Project Owner Approval of Corrections**
- [ ] **Manual Execution in Supabase SQL Editor**
- [ ] **Admin Account Bootstrap**

**STOP:** Awaiting project-owner review and approval before any remote SQL execution.

