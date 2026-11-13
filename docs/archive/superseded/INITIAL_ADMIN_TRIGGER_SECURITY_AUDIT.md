# WINDOW COMPANIES CRM — INITIAL ADMIN TRIGGER & AUTH SECURITY AUDIT

**Audit Date:** November 04, 2026  
**Auditor:** Senior Security Architect & Supabase Database Auditor  
**Scope:** Migration `20261104000003_bootstrap_initial_admin.sql`, Migration `20261104000004_admin_provisioning_trigger.sql`, Remote Database Object Verification, and Auth Configuration  
**Target:** `techwindow@gmail.com's Project` (`fvxtnitlsbzmcuphefmv`)  
**Audit Mode:** STRICT READ-ONLY  

---

## 1. Executive Summary & Verdict

### Final Security Status:
**SAFE AFTER CORRECTIONS (DO NOT PROCEED WITH PUBLIC SIGNUP)**

The automated trigger `on_auth_user_created_admin` and function `public.handle_admin_auth_user()` are syntactically and structurally sound, but **a critical authentication configuration risk exists**:

> [!WARNING]
> **Public email signup is currently enabled on the Supabase project (`disable_signup: false`) and email confirmations are required (`mailer_autoconfirm: false`), while the trigger fires immediately on `AFTER INSERT ON auth.users` without checking `email_confirmed_at IS NOT NULL`.**
> 
> If anyone signs up via an open endpoint or public client using the target email `techwindow@gmail.com` before the owner confirms it, the unconfirmed account would immediately receive full Admin rights in `public.user_profiles` and all three system privileges.

---

## 2. Deployed SQL & Database Object Verification (Task 1)

Both migrations are confirmed applied in the remote migration registry:
- `20261104000003`: DO block targeting existing users (executed cleanly, found 0 users at execution time).
- `20261104000004`: Function `public.handle_admin_auth_user()` and Trigger `on_auth_user_created_admin` on `auth.users`.

### Deployed Function Definition:
```sql
CREATE OR REPLACE FUNCTION public.handle_admin_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.email = 'techwindow@gmail.com' THEN
    INSERT INTO public.user_profiles (id, full_name, role, is_active)
    VALUES (NEW.id, 'System Administrator', 'ADMIN', TRUE)
    ON CONFLICT (id) DO UPDATE
    SET role = 'ADMIN', is_active = TRUE;

    INSERT INTO public.user_permissions (user_id, permission_key, granted_by)
    VALUES 
      (NEW.id, 'CAN_MANAGE_RATES', NEW.id),
      (NEW.id, 'CAN_MANAGE_USERS', NEW.id),
      (NEW.id, 'CAN_CREATE_CHAT_GROUPS', NEW.id)
    ON CONFLICT (user_id, permission_key) DO NOTHING;

    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
    VALUES (
      NEW.id,
      'ADMIN_AUTO_PROVISIONED',
      'user_profiles',
      NEW.id,
      jsonb_build_object('role', 'ADMIN', 'email', NEW.email, 'is_active', true)
    );
  END IF;
  RETURN NEW;
END;
$$;
```

---

## 3. Admin Email Restriction Analysis (Task 2)

| Verification Item | Analysis / Finding | Risk Level |
|---|---|---|
| **Hardcoded Target Email** | Yes: specifically checks `NEW.email = 'techwindow@gmail.com'`. | **LOW** (Strictly scoped) |
| **Case-Sensitivity** | `NEW.email = 'techwindow@gmail.com'` is exact case-sensitive. If created as `Techwindow@gmail.com`, the trigger will NOT fire. | **MEDIUM** (Potential false negative) |
| **Privilege Escalation to Others** | No other email address can ever trigger Admin role or permissions through this code. | **NONE** |
| **Unconfirmed Account Risk** | The trigger checks only `NEW.email`, not `NEW.email_confirmed_at`. If created via unverified public signup, it grants Admin immediately. | **HIGH** |
| **Staff Promotion** | Normal Staff users created via Auth will not match `techwindow@gmail.com` and receive 0 records from this trigger. | **NONE** |

---

## 4. Trigger & Function Mechanics Audit (Task 3)

1. **Execution Timing:** `AFTER INSERT ON auth.users` for each row.
2. **Security Definer & Search Path:**
   - Explicitly configured with `SECURITY DEFINER`.
   - Hardened with `SET search_path = public, pg_temp` — completely immune to schema hijacking / search_path injection.
3. **Transaction Context:** Executes inside the user creation transaction. If profile creation fails, the user creation transaction rolls back safely.
4. **Idempotence:** Uses `ON CONFLICT (id) DO UPDATE` and `ON CONFLICT (user_id, permission_key) DO NOTHING`. Completely safe against re-runs.
5. **Audit Logging:** Inserts audit trail entry into `public.audit_logs`.

---

## 5. Public Signup & Auth Settings Inspection (Task 4)

A live inspection of the GoTrue Auth settings (`/auth/v1/settings`) confirmed:
- `external.email`: `true` (Email authentication is enabled).
- `disable_signup`: `false` (**Public signups are NOT disabled**).
- `mailer_autoconfirm`: `false` (Emails are not auto-confirmed by default).

### The Threat Model:
Because `disable_signup` is `false`, any anonymous client calling `/auth/v1/signup` with `techwindow@gmail.com` could initiate account creation. Even though they would not control the email inbox, the trigger would insert an active ADMIN profile in `public.user_profiles` tied to that UUID before confirmation.

---

## 6. Table RLS Coverage Matrix (All 26 Tables) (Task 5)

| # | Table Name | RLS Status | Policy Enforcement Status |
|---|---|---|---|
| 1 | `public.user_profiles` | **ENABLED** | 4 policies: Default-deny; active employee select; admin full; self-update non-escalation |
| 2 | `public.user_permissions` | **ENABLED** | 4 policies: Default-deny; active employee select; admin full management |
| 3 | `public.travel_agencies` | Migration 001 Default | Domain schema ready for Phase 3 RLS policies |
| 4 | `public.agency_markets` | Migration 001 Default | Domain schema ready for Phase 3 RLS policies |
| 5 | `public.agency_members` | Migration 001 Default | Domain schema ready for Phase 3 RLS policies |
| 6 | `public.hotels` | Migration 001 Default | Domain schema ready for Phase 3 RLS policies |
| 7 | `public.hotel_seasons` | Migration 001 Default | Domain schema ready for Phase 3 RLS policies |
| 8 | `public.hotel_rate_sheets` | Migration 001 Default | Domain schema ready for Phase 3 RLS policies |
| 9 | `public.hotel_rate_components` | Migration 001 Default | Domain schema ready for Phase 3 RLS policies |
| 10 | `public.hotel_rate_outputs` | Migration 001 Default | Domain schema ready for Phase 3 RLS policies |
| 11 | `public.agency_special_rates` | Migration 001 Default | Domain schema ready for Phase 3 RLS policies |
| 12 | `public.quotes` | Migration 001 Default | Domain schema ready for Phase 3 RLS policies |
| 13 | `public.quote_recipients` | Migration 001 Default | Domain schema ready for Phase 3 RLS policies |
| 14 | `public.quote_items` | Migration 001 Default | Domain schema ready for Phase 3 RLS policies |
| 15 | `public.quote_email_attempts` | Migration 001 Default | Domain schema ready for Phase 3 RLS policies |
| 16 | `public.sales_team_memberships`| Migration 001 Default | Domain schema ready for Phase 3 RLS policies |
| 17 | `public.notifications` | Migration 001 Default | Domain schema ready for Phase 3 RLS policies |
| 18 | `public.sales_activities` | Migration 001 Default | Domain schema ready for Phase 3 RLS policies |
| 19 | `public.sales_activity_attachments` | Migration 001 Default | Domain schema ready for Phase 3 RLS policies |
| 20 | `public.chat_groups` | Migration 001 Default | Domain schema ready for Phase 3 RLS policies |
| 21 | `public.chat_group_members` | Migration 001 Default | Domain schema ready for Phase 3 RLS policies |
| 22 | `public.chat_messages` | Migration 001 Default | Domain schema ready for Phase 3 RLS policies |
| 23 | `public.chat_message_attachments` | Migration 001 Default | Domain schema ready for Phase 3 RLS policies |
| 24 | `public.chat_message_mentions` | Migration 001 Default | Domain schema ready for Phase 3 RLS policies |
| 25 | `public.chat_read_receipts` | Migration 001 Default | Domain schema ready for Phase 3 RLS policies |
| 26 | `public.audit_logs` | Migration 001 Default | Domain schema ready for Phase 3 RLS policies |

---

## 7. Mandatory Safe Creation Protocol

To safely create the initial Admin account without risk:

1. **Do NOT use public signup endpoints.**
2. **Create the user directly inside the Supabase Dashboard**:
   - Navigate to: **Authentication $\rightarrow$ Users $\rightarrow$ Add User $\rightarrow$ Create User**.
   - Email: `techwindow@gmail.com` (lowercase).
   - Enter your password.
   - **Check "Auto Confirm User"** so the account is confirmed immediately upon creation by the project owner.
   - Click **Create User**.
3. **Disable Public Signup in Dashboard (Recommended):**
   - In Supabase Dashboard: **Authentication $\rightarrow$ Providers $\rightarrow$ Email**.
   - Toggle **"Allow new users to sign up"** to **OFF**.
   - This ensures all future accounts must be invited by an Administrator.

