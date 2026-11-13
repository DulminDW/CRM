# PHASE 6C — AUDIT ACTOR & RATE SETUP CREATOR HARDENING REPORT

**Project:** WINDOW COMPANIES MANAGEMENT SYSTEM / CRM  
**Date:** November 05, 2026  
**Audited Target:** Security Hardening Draft Migration `20261105000012_harden_audit_actor_identity.sql`  
**Git Branch:** `development` (HEAD commit: `03b39f9`)  
**Status:** DRAFT SPECIFICATION COMPLETE — UNDEPLOYED  

---

## 1. Executive Summary

Phase 6C implements the database-level security hardening measures identified during the Phase 6B security audit:
1. **Audit Actor Identity Hardening:** Binds `audit_logs.actor_id` strictly to `auth.uid()` via a PostgreSQL `BEFORE INSERT` trigger, preventing any client-side actor spoofing.
2. **Rate Setup Creator Identity Hardening:** Enforces `rate_calculation_setups.created_by := auth.uid()` on `INSERT` and strictly prevents modifying `created_by` on `UPDATE` (authorship immutability).
3. **Preservation of System Trigger Operations:** The trigger safely permits internal system operations (e.g. initial admin bootstrap trigger `handle_admin_auth_user`) where `auth.uid()` is null during system context execution.
4. **Zero Deployment Rule Preserved:** Migrations `000009`, `000010`, `000011`, and `000012` remain **draft specifications only** and have not been applied to the live database.

---

## 2. Exact Changes Made & Trigger Behavior

### 2.1 Audit Actor Identity Trigger (`enforce_audit_actor_identity`)
- **Trigger Function:**
  ```sql
  CREATE OR REPLACE FUNCTION public.enforce_audit_actor_identity()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$
  DECLARE
    v_session_uid UUID := auth.uid();
    v_is_active BOOLEAN;
  BEGIN
    IF v_session_uid IS NOT NULL THEN
      SELECT is_active INTO v_is_active
      FROM public.user_profiles
      WHERE id = v_session_uid;

      IF v_is_active IS NOT TRUE THEN
        RAISE EXCEPTION 'Audit insertion rejected: authenticated actor is inactive or missing.'
          USING ERRCODE = '42501';
      END IF;

      -- HARDENED DERIVATION: Disregard any client-supplied actor_id and bind to authenticated user
      NEW.actor_id := v_session_uid;
    ELSE
      -- Permits internal system triggers (e.g. auth hooks) if actor_id references valid profile
      IF NEW.actor_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = NEW.actor_id) THEN
          RAISE EXCEPTION 'Audit insertion rejected: system-supplied actor_id does not exist.'
            USING ERRCODE = '23503';
        END IF;
      END IF;
    END IF;

    RETURN NEW;
  END;
  $$;
  ```
- **Operational Guarantee:** If a staff user calls `supabase.from('audit_logs').insert([{ actor_id: admin_id, ... }])`, the trigger overwrites `NEW.actor_id` with `auth.uid()`, completely neutralizing actor spoofing.

### 2.2 Rate Calculation Setup Creator Enforcement (`enforce_rate_setup_creator_identity`)
- **Trigger Function:**
  ```sql
  CREATE OR REPLACE FUNCTION public.enforce_rate_setup_creator_identity()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$
  DECLARE
    v_session_uid UUID := auth.uid();
  BEGIN
    IF NOT public.can_manage_rates() THEN
      RAISE EXCEPTION 'Rate calculation setup modification denied: insufficient permissions.'
        USING ERRCODE = '42501';
    END IF;

    IF TG_OP = 'INSERT' THEN
      IF v_session_uid IS NOT NULL THEN
        NEW.created_by := v_session_uid;
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
        RAISE EXCEPTION 'Security violation: created_by identity on rate_calculation_setups is immutable.'
          USING ERRCODE = '42501';
      END IF;
      NEW.updated_at := CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
  END;
  $$;
  ```
- **Operational Guarantee:**
  - On `INSERT`: Binds `created_by` to the authenticated user.
  - On `UPDATE`: Rejects any attempt to change `created_by` with error `42501`.

---

## 3. RLS and Permission Compatibility

- **`audit_logs_insert_hardened` Policy:**
  ```sql
  CREATE POLICY audit_logs_insert_hardened ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL AND public.is_active_employee());
  ```
- Replaces the legacy `audit_logs_insert_system` policy, ensuring that inactive or deleted users cannot append audit records even if their token has not yet expired.
- Retains existing append-only protection (no UPDATE or DELETE policies exist for `audit_logs`).

---

## 4. Test Evidence & Classifications

The automated test runner [`scripts/run-tests.cjs`](file:///c:/Users/Nethshan%20Dulmin/Desktop/CRM/scripts/run-tests.cjs) was updated to test all 9 specified security hardening conditions:

| Test ID | Condition Tested | Method | Expected Result | Actual Result | Classification |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **SEC-01** | Authenticated user inserting audit record | Unit simulation | `record.actor_id` matches session UID | **PASS** | **Verified by automated logic test** |
| **SEC-02** | User attempting to insert another user's ID | Unit simulation | Spoofed ID replaced with session UID | **PASS** | **Verified by automated logic test** |
| **SEC-03** | Unauthenticated audit insertion | Unit simulation | Rejected (`auth.uid() IS NOT NULL`) | **PASS** | **Verified by automated logic test** |
| **SEC-04** | Admin audit insertion | Unit simulation | Allowed with admin UID | **PASS** | **Verified by automated logic test** |
| **SEC-05** | Inactive staff audit insertion | Unit simulation | Rejected (`is_active IS TRUE` required) | **PASS** | **Verified by automated logic test** |
| **SEC-06** | Authorized Staff setup creation | Unit simulation | `created_by` matches staff UID | **PASS** | **Verified by automated logic test** |
| **SEC-07** | Setup creator identity spoofing on INSERT | Unit simulation | Spoofed ID replaced with staff UID | **PASS** | **Verified by automated logic test** |
| **SEC-08** | Updating `created_by` after setup creation | Unit simulation | Rejected (`created_by is immutable`) | **PASS** | **Verified by automated logic test** |
| **SEC-09** | Unauthorized Staff setup mutation | Unit simulation | Rejected (`can_manage_rates()` required) | **PASS** | **Verified by automated logic test** |
| **SEC-LIVE** | Live authenticated Supabase end-to-end test | PostgREST request | Authenticate as dedicated staff user | **BLOCKED** | **Awaiting Owner Staff Account** |

---

## 5. Migration Deployment Prerequisites (Phase 6 Activation Checklist)

When the business owner approves activating the Rate Management schema on the remote database, migrations must be executed in strict sequence:

1. **Prerequisite:** Create database backup via Supabase Dashboard (`Database -> Backups`).
2. **Execute Sequence:**
   - Step 1: Deploy `20261105000009_rate_management_foundation.sql` (Tables 8, 9, 10, 11 indexes & RLS).
   - Step 2: Deploy `20261105000010_contracts_and_custom_rate_templates.sql` (Contracts & custom templates).
   - Step 3: Deploy `20261105000011_rate_calculation_setups_and_audit.sql` (Calculation setups table & audit action constraint).
   - Step 4: Deploy `20261105000012_harden_audit_actor_identity.sql` (Identity enforcement triggers).
3. **Verification:** Confirm all 4 tables and 2 triggers are registered via `SELECT tablename FROM pg_tables WHERE schemaname = 'public';`.

---

## 6. Quality Gates Verification

All standard quality gates passed without warnings:
- **`npm test`**: **PASS** (7/7 test suites passed, 36 total assertions passed).
- **`npx tsc -b`**: **PASS** (0 errors).
- **`npm run lint`**: **PASS** (0 errors, 0 warnings).
- **`npm run build`**: **PASS** (Production build completed in 8.78s).

---

## 7. Git & Working Tree Confirmation
- **Current Git Branch:** `development`
- **Current Commit Hash:** `03b39f9`
- **Working Tree:** No code has been committed to Git; files remain ready for review and will only be committed upon explicit owner instruction.
- **Migration Deployment Status:** **All migrations (000009, 000010, 000011, 000012) remain 100% undeployed.**

