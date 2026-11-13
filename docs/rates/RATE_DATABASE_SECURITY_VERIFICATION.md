# PHASE 6B — DATABASE-LEVEL SECURITY VERIFICATION REPORT

**Project:** WINDOW COMPANIES MANAGEMENT SYSTEM / CRM  
**Date:** November 05, 2026  
**Audited Target:** PostgreSQL Schema, RLS Policies, Security Functions, and Migration `000011`  
**Git Branch:** `development` (HEAD commit: `03b39f9`)  
**Database Reference:** `techwindow@gmail.com's Project` (`fvxtnitlsbzmcuphefmv`)  
**Classification:** Database & RLS Security Audit  

---

## 1. Executive Summary & Audit Mandate

In strict accordance with Phase 6B safety directives:
- **No migrations were executed or deployed** (migrations `000009`, `000010`, and `000011` remain draft specifications).
- **No production records were inserted, modified, or deleted.**
- **No real company users were created or deleted.**
- **Primary Admin (`techwindow@gmail.com`) permissions were left completely untouched.**
- **No service-role secrets or credentials were exposed or committed.**
- **Zero emails were sent.**

This audit provides an independent evaluation of database-level actors, RLS immutability guarantees, rate calculation setup permissions, `SECURITY DEFINER` functions, and service-role containment.

---

## 2. Audit Log Actor Identity & Spoofing Vulnerability Analysis

### 2.1 Can a Staff user insert an audit record using another user's `actor_id`?
- **Finding:** **POTENTIAL VULNERABILITY IN CURRENT POLICY DEFINITION.**
- **Classification:** **Verified by source inspection.**
- **Detailed Analysis:**
  - In `20261104000006_domain_rls_policies.sql`, the active INSERT policy on `public.audit_logs` is:
    ```sql
    DROP POLICY IF EXISTS audit_logs_insert_system ON public.audit_logs;
    CREATE POLICY audit_logs_insert_system ON public.audit_logs
      FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
    ```
  - **The Vulnerability:** The `WITH CHECK (auth.uid() IS NOT NULL)` clause only checks that *some* authenticated user is logged in. It does **not** assert `actor_id = auth.uid()`.
  - While foreign key `actor_id REFERENCES public.user_profiles(id)` guarantees that `actor_id` exists in the database, a malicious authenticated staff member issuing a direct PostgREST API request could supply an arbitrary valid user UUID (e.g. the Admin's UUID) in `actor_id`.
  - **Remediation Recommendation for Future Migration:**
    Harden the `audit_logs_insert_system` policy or add a PostgreSQL `BEFORE INSERT` trigger to automatically set `actor_id = auth.uid()` regardless of what the client sends:
    ```sql
    CREATE POLICY audit_logs_insert_hardened ON public.audit_logs
      FOR INSERT TO authenticated
      WITH CHECK (actor_id = auth.uid() AND auth.uid() IS NOT NULL);
    ```

### 2.2 Is `actor_id` derived from `auth.uid()` at database/server level?
- **Finding:** **Currently client-supplied, but verifiable via auth context.**
- **Classification:** **Verified by source inspection.**
- **Details:** The frontend service `adminActivityService.ts` passes `user.id` obtained from the client-side session (`useAuth()`). While standard UI behavior is safe, database-level derivation (via trigger `DEFAULT auth.uid()`) is strongly recommended before production launch.

### 2.3 Can a user forge `actor_name` or display name in the payload?
- **Finding:** **YES, within JSONB metadata payloads.**
- **Classification:** **Verified by source inspection.**
- **Details:** The `actor_name` is stored in the `new_values` JSONB column. A direct PostgREST caller could put any string into `new_values->'actor_name'`. However, `actor_id` remains a foreign key to `user_profiles(id)`. When the Admin audits logs, joining against `public.user_profiles` directly eliminates any client-supplied name forgery.

### 2.4 Can an unauthenticated user insert audit records?
- **Finding:** **NO. STRICTLY REJECTED.**
- **Classification:** **Verified by database test & source inspection.**
- **Evidence:** Anonymous requests lack a valid JWT (`auth.uid() IS NULL`). The policy `audit_logs_insert_system` enforces `WITH CHECK (auth.uid() IS NOT NULL)`, causing PostgreSQL to reject unauthenticated inserts with error `42501 (RLS policy violation)`.

---

## 3. Audit Log Immutability & Modification Denial

### 3.1 Can a user update or delete existing audit records?
- **Finding:** **ABSOLUTELY DENIED. FULL APPEND-ONLY IMMUTABILITY.**
- **Classification:** **Verified by source inspection.**
- **Evidence:**
  - Table `public.audit_logs` has Row Level Security enabled: `ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;`.
  - In PostgreSQL RLS, if an action (`UPDATE`, `DELETE`) has **no matching policy**, all rows are default-denied.
  - In `20261104000006_domain_rls_policies.sql`, lines 351–352 state:
    ```sql
    -- UPDATE and DELETE policies are intentionally omitted for audit_logs (append-only)
    ```
  - Therefore, **neither ordinary Staff nor Admins** can update or delete rows in `public.audit_logs` through client or PostgREST APIs. Any attempt fails with 0 rows affected or permission denied.

### 3.2 Actor Category Capabilities Matrix

| Actor Category | SELECT audit_logs | INSERT audit_logs | UPDATE audit_logs | DELETE audit_logs |
| :--- | :---: | :---: | :---: | :---: |
| **Anonymous / Public** | DENIED | DENIED | DENIED | DENIED |
| **Authenticated Staff** | DENIED (`is_admin()` required) | ALLOWED (`auth.uid() IS NOT NULL`) | DENIED (No policy) | DENIED (No policy) |
| **System Admin** | ALLOWED (`audit_logs_select_admin`) | ALLOWED | DENIED (No policy) | DENIED (No policy) |
| **Database Owner / Superuser / Service-Role** | ALLOWED (Bypasses RLS) | ALLOWED (Bypasses RLS) | ALLOWED (Bypasses RLS) | ALLOWED (Bypasses RLS) |

### 3.3 Can any database function or trigger modify existing audit records?
- **Finding:** **NO.**
- **Classification:** **Verified by source inspection.**
- **Evidence:** Inspection of all trigger functions (`handle_admin_auth_user`, `validate_hotel_season_dates`) confirms that no trigger or function in the schema issues `UPDATE` or `DELETE` statements on `public.audit_logs`. The table is treated strictly as an immutable append-only sink.

---

## 4. Calculation Setup Security & Permissions Review

### 4.1 Permission Restriction on Setups (`rate_calculation_setups`)
- **Finding:** **Gated strictly by `public.can_manage_rates()`.**
- **Classification:** **Verified by source inspection.**
- **Evidence:** In draft migration `20261105000011_rate_calculation_setups_and_audit.sql`:
  ```sql
  CREATE POLICY rate_calc_setups_mutation_policy ON public.rate_calculation_setups
      FOR ALL TO authenticated
      USING (public.can_manage_rates())
      WITH CHECK (public.can_manage_rates());
  ```
  - Staff without `CAN_MANAGE_RATES` receive permission denied on `INSERT`, `UPDATE`, and `DELETE`.
  - Bypassing the UI via direct PostgREST API calls is **blocked at the database engine level**.

### 4.2 Setup Ownership & Creator Forgery
- **Finding:** **POTENTIAL VULNERABILITY IN DRAFT MIGRATION 000011.**
- **Classification:** **Verified by source inspection.**
- **The Issue:** `created_by UUID NOT NULL REFERENCES public.user_profiles(id)` does not have a `CHECK (created_by = auth.uid())` constraint. A user with `CAN_MANAGE_RATES` could technically supply another staff member's UUID as `created_by`.
- **Recommended Remediation in Migration 000011:**
  Update the draft mutation policy to strictly bind `created_by`:
  ```sql
  CREATE POLICY rate_calc_setups_mutation_policy ON public.rate_calculation_setups
      FOR ALL TO authenticated
      USING (public.can_manage_rates())
      WITH CHECK (public.can_manage_rates() AND created_by = auth.uid());
  ```

---

## 5. Security Function Review (`SECURITY DEFINER`)

Every `SECURITY DEFINER` function in the project was audited against the PostgreSQL Security Hardening Guidelines:

| Function Name | Owner | Language | `search_path` | `STABLE` / Volatile | RLS Bypass Risk | Audit Finding |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `public.is_active_employee()` | `postgres` | `sql` | `public, pg_temp` | `STABLE` | None | **SECURE** |
| `public.is_admin()` | `postgres` | `sql` | `public, pg_temp` | `STABLE` | None | **SECURE** |
| `public.can_manage_rates()` | `postgres` | `sql` | `public, pg_temp` | `STABLE` | None | **SECURE** |
| `public.handle_admin_auth_user()` | `postgres` | `plpgsql` | `public, pg_temp` | Volatile (Trigger) | None | **SECURE** |

### Hardening Analysis:
1. **Search Path Fixation:** All four functions explicitly include `SET search_path = public, pg_temp;`. This prevents search path hijacking attacks where an adversary creates malicious functions or operators in a temporary schema.
2. **Execute Permissions:** Functions are accessible to the `authenticated` role solely for RLS condition evaluation. They execute single targeted SELECT queries and cannot be manipulated to alter state or elevate privileges arbitrarily.

---

## 6. Service-Role Exposure Review

- **Inspection Target:** Entire source repository (`src/`, `.env*`, `supabase/`).
- **Classification:** **Verified by source inspection.**
- **Findings:**
  - **Zero service-role keys are exposed in frontend client code.**
  - `src/lib/supabase.ts` uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY`).
  - `.env.example` explicitly warns developers against placing `SUPABASE_SERVICE_ROLE_KEY` in frontend environment variables.
  - The service-role key is designated exclusively for isolated backend runtime environments (Supabase Edge Functions / serverless webhooks) and is not present anywhere in client bundles.

---

## 7. Actual Tests Executed & Classification

| Test Description | Execution Method | Result | Classification |
| :--- | :--- | :---: | :--- |
| Audit log RLS policy review | Static SQL & Policy inspection | Immutability confirmed (No UPDATE/DELETE) | **Verified by source inspection** |
| Unauthenticated access rejection | Static SQL review & Phase 5 PostgREST probe check | Rejected with HTTP 401 / 42501 | **Verified by database test** |
| `SECURITY DEFINER` search_path audit | Static SQL inspection across migrations 2 & 7 | Fixed to `public, pg_temp` | **Verified by source inspection** |
| Calculation setup mutation policy check | Static inspection of draft migration 000011 | Gated by `can_manage_rates()` | **Verified by source inspection** |
| Service-role string search | Regex scan across entire `src/` codebase | 0 occurrences found | **Verified by source inspection** |
| Dedicated staff account live permission test | End-to-end browser login as non-admin | Awaiting owner creation of staff account | **BLOCKED** |

---

## 8. Summary of Risks & Remediation Recommendations (For Future Migration)

Before deploying migration `000011` to the live database:
1. **Remediation 1 (Actor Spoofing Guard):** Add a `BEFORE INSERT` trigger on `public.audit_logs` to automatically enforce `NEW.actor_id := auth.uid();`, guaranteeing that no user can insert an audit record on behalf of someone else.
2. **Remediation 2 (Setup Creator Guard):** Add `created_by = auth.uid()` to the `WITH CHECK` clause of `rate_calc_setups_mutation_policy` in migration 000011.
3. **Staff Test Provisioning:** Request the owner to create a test staff account in the Supabase Dashboard to convert the single **BLOCKED** test into an active live test.

---

## 9. Current Status & Git Integrity
- **Current Git Branch:** `development`
- **Latest Commit Hash:** `03b39f9`
- **Working Tree:** Clean (All code intact; documentation files in `docs/` remain untracked on disk per user rules).
- **No migrations deployed. No production data modified.**

