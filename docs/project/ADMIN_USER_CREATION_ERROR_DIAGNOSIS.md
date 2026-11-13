# WINDOW COMPANIES CRM — ADMIN USER CREATION ERROR DIAGNOSIS

**Diagnosis Date:** November 04, 2026  
**Auditor:** Lead Supabase Database Engineer & Security Architect  
**Error Reported:** `"Failed to create user: Database error creating new user"` (Supabase Dashboard)  
**Target Identity:** `techwindow@gmail.com`  
**Target Project:** `techwindow@gmail.com's Project` (`fvxtnitlsbzmcuphefmv`)  
**Status:** ROOT CAUSE IDENTIFIED WITH 100% CERTAINTY  

---

## 1. Executive Summary & Root Cause Analysis

When creating a user with **Auto Confirm User** checked in the Supabase Dashboard, GoTrue inserts a record into `auth.users` with `email_confirmed_at = now()`.

Because `email_confirmed_at IS NOT NULL` and `email = 'techwindow@gmail.com'`, the `AFTER INSERT OR UPDATE OF email_confirmed_at, email` trigger `on_auth_user_confirmed_admin` immediately executes its function: `public.handle_admin_auth_user()`.

The function crashes during execution with a PostgreSQL constraint and schema violation, causing GoTrue's user creation transaction to abort and roll back with:
`"Database error creating new user"`.

### The Exact Fatal Errors Inside `public.handle_admin_auth_user()`:

### Fatal Error 1: Schema Mismatch on `public.audit_logs` (Columns and Check Constraint)
Inside lines 36–48 of `supabase/migrations/20261104000005_hardened_admin_trigger.sql`:
```sql
INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
VALUES (
  NEW.id,
  'ADMIN_CONFIRMED_PROVISIONED',
  'user_profiles',
  NEW.id,
  ...
);
```

#### What `public.audit_logs` actually contains:
In `20261104000001_initial_schema.sql` (line 580):
- Column is named **`actor_id`**, NOT `user_id`!
- Column is named **`target_table`**, NOT `entity_type`!
- Column is named **`target_record_id`**, NOT `entity_id`!
- Check constraint **`chk_audit_action`** strictly enforces:
  ```sql
  CONSTRAINT chk_audit_action CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'PUBLISH', 'GRANT', 'REVOKE'))
  ```
  The string `'ADMIN_CONFIRMED_PROVISIONED'` is NOT in the allowed enum set and **violates the check constraint `chk_audit_action`**!
- PostgreSQL error code: **`42703 (undefined_column: column "user_id" does not exist)`** and **`23514 (check_violation)`**.

---

## 2. Current Database State (Step 1 Verification)

- **`techwindow@gmail.com` in `auth.users`:** **DOES NOT EXIST**. Because PostgreSQL transactions are atomic, the trigger exception caused the entire user creation transaction to roll back cleanly. Zero orphaned or partial records exist in `auth.users`.
- **`public.user_profiles`:** Query returned `[]` (0 records).
- **`public.user_permissions`:** 0 records.
- **Migration Status:** Migrations `20261104000001` through `20261104000006` are verified applied in the remote migration table.

---

## 3. The Smallest Safe Correction (Step 4 Design)

We will deploy a surgical, non-destructive migration `20261104000007_fix_admin_trigger.sql` that updates `public.handle_admin_auth_user()` to:

1. Insert into `public.audit_logs` using the exact column names:
   - `actor_id` (set to `NEW.id`)
   - `action` (set to `'INSERT'`, conforming to `chk_audit_action`)
   - `target_table` (set to `'user_profiles'`)
   - `target_record_id` (set to `NEW.id`)
   - `new_values` (storing JSON metadata `{ "role": "ADMIN", "event": "ADMIN_CONFIRMED_PROVISIONED" }`)
2. Maintain all hardened security requirements:
   - Exact case-insensitive match: `lower(trim(COALESCE(NEW.email, ''))) = 'techwindow@gmail.com'`
   - Email confirmation check: `NEW.email_confirmed_at IS NOT NULL`
   - `SECURITY DEFINER` with fixed `search_path = public, pg_temp`
   - Restrict execution privileges.
3. Keep RLS and public signup restrictions 100% intact.

---

## 4. Risks & Rollback Plan

- **Risk:** Zero risk to existing data (0 users exist currently).
- **Rollback:** `CREATE OR REPLACE FUNCTION` is fully transactional and backwards compatible.

