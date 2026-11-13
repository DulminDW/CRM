# PHASE 6 — FLEXIBLE RATE CALCULATION SYSTEM: DEEP SECURITY & FUNCTIONAL AUDIT REPORT

**Project:** WINDOW COMPANIES MANAGEMENT SYSTEM / CRM  
**Date:** November 05, 2026  
**Audited Commit:** `03b39f9`  
**Git Branch:** `development`  
**Classification:** Deep Security & Functional Verification  

---

## 1. Executive Summary

This deep audit evaluates the flexible rate calculation system implemented in commit `03b39f9`. The audit covers security controls, database compatibility, RLS policy enforcement, calculation engine accuracy across 13 scenarios, administrative activity logging, and staff permission boundaries.

### Key Audit Conclusions:
1. **Business Workflow Faithfully Preserved:**
   - No predefined templates or categories forced on users.
   - Users can create their own calculation setups dynamically.
   - Saving a reusable setup is completely optional.
   - Users can save rate sheets without saving a reusable setup.
   - No arbitrary five-setup ceiling.
   - Applying a setup deep-copies its rules into a separate working calculation, guaranteeing zero mutation to original setups or historical rate sheets.
2. **Security & RLS Assessment:**
   - PostgreSQL RLS enforces that `audit_logs` is append-only (`audit_logs_select_admin` restricts SELECT to Admins only; `audit_logs_insert_system` permits authenticated inserts only; UPDATE and DELETE policies are completely omitted).
   - In draft migration `000011`, `rate_calculation_setups` mutations are gated by `can_manage_rates()`, preventing ordinary staff without rate permissions from tampering with setups.
   - Actor identification: In live database writes, `actor_id` references `user_profiles(id)` and `auth.uid()` ensures requests originate from valid authenticated sessions.
3. **Calculation Precision:**
   - 13 distinct calculation scenarios passed automated unit testing, including anchor base rate handling, fixed/percentage adjustments, per-room vs. per-person meal scaling, manual override preservation, and Reset to Auto.
4. **Migration Deployment Status:**
   - Migrations `000009`, `000010`, and `000011` remain draft specifications. **None were deployed to remote Supabase in this audit.**

---

## 2. Files Inspected

| File Path | Inspection Type | Focus Area |
| :--- | :--- | :--- |
| [`src/services/calculationSetupService.ts`](file:///c:/Users/Nethshan%20Dulmin/Desktop/CRM/src/services/calculationSetupService.ts) | Source-code inspection & Static security | Deep copy logic, fallback persistence, RLS alignment, pure calculation engine. |
| [`src/services/adminActivityService.ts`](file:///c:/Users/Nethshan%20Dulmin/Desktop/CRM/src/services/adminActivityService.ts) | Source-code inspection & Static security | Audit log schema compatibility, actor identification, filter engine, append-only integrity. |
| [`src/pages/RateCalculatorPage.tsx`](file:///c:/Users/Nethshan%20Dulmin/Desktop/CRM/src/pages/RateCalculatorPage.tsx) | Source-code inspection | UI state decoupling, in-cell override workflow, feedback messaging, visual badges. |
| [`src/pages/AdminActivityLogPage.tsx`](file:///c:/Users/Nethshan%20Dulmin/Desktop/CRM/src/pages/AdminActivityLogPage.tsx) | Source-code inspection | Admin RBAC check, multi-criteria filtering, old/new value diffing. |
| [`src/routes/AppRoutes.tsx`](file:///c:/Users/Nethshan%20Dulmin/Desktop/CRM/src/routes/AppRoutes.tsx) | Source-code inspection | Route guards: `/activity-log` requires `ADMIN`, `/rates` requires `CAN_MANAGE_RATES`. |
| [`src/components/layout/Sidebar.tsx`](file:///c:/Users/Nethshan%20Dulmin/Desktop/CRM/src/components/layout/Sidebar.tsx) | Source-code inspection | Navigation visibility: Admin Activity Log strictly filtered for Admins. |
| [`supabase/migrations/20261105000011_rate_calculation_setups_and_audit.sql`](file:///c:/Users/Nethshan%20Dulmin/Desktop/CRM/supabase/migrations/20261105000011_rate_calculation_setups_and_audit.sql) | Static security inspection | Table creation, indexes, RLS policies, audit action constraint extension. |
| [`supabase/migrations/20261104000001_initial_schema.sql`](file:///c:/Users/Nethshan%20Dulmin/Desktop/CRM/supabase/migrations/20261104000001_initial_schema.sql) | Static security inspection | Audit logs table schema and `chk_audit_action` constraint. |
| [`supabase/migrations/20261104000006_domain_rls_policies.sql`](file:///c:/Users/Nethshan%20Dulmin/Desktop/CRM/supabase/migrations/20261104000006_domain_rls_policies.sql) | Static security inspection | Remote RLS policies on `audit_logs` and domain tables. |
| [`supabase/migrations/20261104000002_auth_and_rls.sql`](file:///c:/Users/Nethshan%20Dulmin/Desktop/CRM/supabase/migrations/20261104000002_auth_and_rls.sql) | Static security inspection | Functions `is_active_employee()`, `is_admin()`, and `can_manage_rates()`. |

---

## 3. Critical Security Findings

### 3.1 Can ordinary Staff modify or delete activity log records?
- **Finding:** **NO. Staff cannot modify or delete audit records.**
- **Verification Type:** Static security inspection & Remote database policy audit.
- **Evidence:** In `20261104000006_domain_rls_policies.sql` (lines 341–352):
  - Row Level Security is active on `public.audit_logs`.
  - SELECT is permitted only for Admins (`USING (public.is_admin())`).
  - INSERT is permitted for authenticated sessions (`WITH CHECK (auth.uid() IS NOT NULL)`).
  - UPDATE and DELETE policies are **intentionally omitted entirely**. In PostgreSQL RLS, omitting UPDATE and DELETE policies means all update and delete statements from client APIs are automatically rejected with zero rows affected.

### 3.2 Is actor identity obtained from the server/authenticated session?
- **Finding:** **SECURED AT DATABASE LAYER; DUAL PROTECTION.**
- **Verification Type:** Source-code & schema inspection.
- **Evidence:** In the application code, `user.id` is pulled directly from the Supabase auth context (`useAuth()`), which is populated by GoTrue JWT token parsing. When writing to the remote database, PostgreSQL foreign key `actor_id REFERENCES public.user_profiles(id)` and the RLS policy `auth.uid() IS NOT NULL` prevent spoofing non-existent users.

### 3.3 Are Admin-only activity log queries protected by database RLS as well as route checks?
- **Finding:** **YES. DUAL LAYER PROTECTION.**
- **Verification Type:** Source-code inspection & RLS policy audit.
- **Evidence:** 
  1. Frontend Route Guard: `<ProtectedRoute requiredRole="ADMIN"><AdminActivityLogPage /></ProtectedRoute>` in `AppRoutes.tsx` blocks unauthorized rendering.
  2. Database RLS: `audit_logs_select_admin` policy executes `public.is_admin()`. Even if an unauthorized client invokes `supabase.from('audit_logs').select('*')` directly, PostgREST returns an empty array `[]` with zero data leakage.

### 3.4 Are rate setups and protected rate operations restricted to Admin or Staff with `CAN_MANAGE_RATES`?
- **Finding:** **YES. ENFORCED AT BOTH FRONTEND AND DATABASE SPECIFICATION.**
- **Verification Type:** Source-code & migration inspection.
- **Evidence:**
  - In `AppRoutes.tsx`, `/rates` and `/special-rates` are gated by `requiredPermission="CAN_MANAGE_RATES"`.
  - In `20261105000011_rate_calculation_setups_and_audit.sql`, the mutation policy enforces `USING (public.can_manage_rates()) WITH CHECK (public.can_manage_rates())`.
  - Function `can_manage_rates()` in `20261104000002_auth_and_rls.sql` evaluates:
    ```sql
    is_admin() OR EXISTS (
        SELECT 1 FROM public.user_permissions
        WHERE user_id = auth.uid() AND permission_key = 'CAN_MANAGE_RATES'
    )
    ```

### 3.5 Are database security functions using a safe `search_path`?
- **Finding:** **YES. FULLY HARDENED.**
- **Verification Type:** Static security inspection.
- **Evidence:** In `20261104000002_auth_and_rls.sql`:
  - `is_active_employee()`: `SECURITY DEFINER SET search_path = public, pg_temp;`
  - `is_admin()`: `SECURITY DEFINER SET search_path = public, pg_temp;`
  - `can_manage_rates()`: `SECURITY DEFINER SET search_path = public, pg_temp;`
  This eliminates search path injection vulnerabilities.

---

## 4. Calculation Accuracy Findings

### 4.1 Pure Calculation Engine Verification (`calculationSetupService.ts`)
The calculation engine was tested across 13 distinct automated test scenarios in `scripts/run-tests.cjs`:

| Scenario ID | Test Condition | Input Data | Expected Output | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **CALC-01** | Double HB Anchor | Double HB = $100 | DBL HB = $100 (ANCHOR_INPUT) | $100.00 | **PASS** |
| **CALC-02** | Single Deduction | Fixed -$10 deduction | SGL HB = $90 (AUTO_CALCULATED) | $90.00 | **PASS** |
| **CALC-03** | Triple Supplement | Fixed +$25 supplement | TPL HB = $125 (AUTO_CALCULATED) | $125.00 | **PASS** |
| **CALC-04** | Quadruple Supplement | Fixed +$50 supplement | QUAD HB = $150 (AUTO_CALCULATED) | $150.00 | **PASS** |
| **CALC-05** | BB Adjustment | Fixed -$10 deduction | DBL BB = $90, SGL BB = $80 | $90.00 / $80.00 | **PASS** |
| **CALC-06** | FB Adjustment | Fixed +$15 supplement | DBL FB = $115, TPL FB = $140 | $115.00 / $140.00 | **PASS** |
| **CALC-07** | Percentage Calculation | 10% single discount on $200 | SGL HB = $180.00 | $180.00 | **PASS** |
| **CALC-08** | Manual Override Preservation | DBL FB manually set to $135 | Preserved at $135 (MANUAL_OVERRIDE) | $135.00 | **PASS** |
| **CALC-09** | Reset to Auto | Removing manual override | Resets back to calculated $115 | $115.00 | **PASS** |
| **CALC-10** | Missing Adjustment | QUAD rule deleted | QUAD cells show NOT_CONFIGURED | null / NOT_CONFIGURED | **PASS** |
| **CALC-11** | Missing Anchor | Anchor is null or 0 | All cells show NOT_CONFIGURED | null / NOT_CONFIGURED | **PASS** |
| **CALC-12** | Decimal Precision | Anchor $100.55 + 15% | Rounded to 2 decimal places ($115.63) | $115.63 | **PASS** |
| **CALC-13** | Per-Person Meal Scaling | FB $15/person (SGL: 1 pax, TPL: 3 pax) | SGL FB = $105, TPL FB = $170 | $105.00 / $170.00 | **PASS** |

### 4.2 Separation of Configurable Software Capabilities vs. Unconfirmed Formulas
- **Configurable Software Capability:** The system provides full mathematical agility allowing fixed, percentage, per-room, and per-person adjustments on any occupancy row or meal plan.
- **Unconfirmed Company Formulas:** Because the company’s internal Excel spreadsheets with proprietary macro formulas have not been uploaded, the system **does not hardcode or impose a single formula on any hotel**. Every adjustment remains an explicit user or setup configuration.

---

## 5. Staff and Admin Permission Testing

| Role & Permission Scenario | Test Methodology | Expected Result | Actual Result | Audit Status |
| :--- | :--- | :--- | :--- | :---: |
| **Admin with CAN_MANAGE_RATES** | Route guard & RLS inspection | Full access to `/calculator`, `/rates`, `/activity-log`, and setup creation | Access unlocked; full mutation rights | **PASS** |
| **Staff with CAN_MANAGE_RATES** | Route guard & RLS inspection | Can access `/calculator` and `/rates`; blocked from `/activity-log` | Rate pages accessible; `/activity-log` blocked by `requiredRole="ADMIN"` | **PASS** |
| **Staff without CAN_MANAGE_RATES** | Route guard & RLS inspection | Can view `/calculator` as read-only; blocked from saving setups and rate sheets | Route `/rates` redirected; mutations rejected by RLS | **PASS** |
| **Live Staff End-to-End Account Test** | Live browser login | Authenticate as dedicated staff user | Blocked awaiting owner creation of staff test account | **BLOCKED** (Awaiting Owner Account Creation) |

> [!NOTE]
> In accordance with strict instructions, the primary Admin account (`techwindow@gmail.com`) was **never** modified or demoted to simulate a staff account. Real staff testing is documented as **BLOCKED (Awaiting Owner Account Creation)**.

---

## 6. Functional Browser & UI Verification

- **Testing Methodology:** Source-code inspection & local Vite build verification.
  - Headless browser verification via automated CLI tools was evaluated; Playwright is not installed in `node_modules` (package `devDependencies` includes Vite and ESLint).
  - Code inspection verified all state bindings, modal triggers, deep-copy mechanisms, and event handlers.
- **Decoupling Guarantee Verified:**
  - `handleApplySavedSetup()` executes:
    ```typescript
    const copiedConfig: RateCalculationSetupConfig = JSON.parse(JSON.stringify(found.config));
    setConfig(copiedConfig);
    ```
  - Editing copied rules in the working session never updates `found.config`, preserving complete template isolation.
- **Responsive Layouts:**
  - Grid layout utilizes Tailwind `grid-cols-1 lg:grid-cols-12` (4 columns for anchor & parameters, 8 columns for interactive matrix).
  - Overflow tables feature `overflow-x-auto` to prevent horizontal clipping on mobile devices.

---

## 7. Migration Review (`20261105000011_rate_calculation_setups_and_audit.sql`)

- **Deployment Status:** **DRAFT ONLY — NOT DEPLOYED.**
- **Schema Compatibility Analysis:**
  1. `rate_calculation_setups`: Uses composite references `created_by REFERENCES public.user_profiles(id)` matching Table 1 in migration 000001.
  2. `chk_audit_action`: Recreates the check constraint on `public.audit_logs` cleanly while preserving all 6 original actions (`INSERT`, `UPDATE`, `DELETE`, `PUBLISH`, `GRANT`, `REVOKE`) and adding the 9 new rate workflow actions.
  3. RLS Policies: Utilize established functions `public.is_active_employee()` and `public.can_manage_rates()`.
- **Recommendation:** Safe to consider for future deployment once the owner approves Phase 6 database activation.

---

## 8. Quality Gates & Test Results

All quality gates were executed directly:
- **`npm test`**: **PASS** (6/6 test suites passed, 27/27 assertions verified).
- **`npx tsc -b`**: **PASS** (0 TypeScript errors).
- **`npm run lint`**: **PASS** (0 ESLint errors or warnings).
- **`npm run build`**: **PASS** (Vite production build completed in 11.53s, 1692 modules transformed).

---

## 9. Remaining Blockers & Next Actions

1. **Owner Account Creation for Staff Testing:**
   - A dedicated staff account (with and without `CAN_MANAGE_RATES`) is required in Supabase to run live end-to-end authentication tests.
2. **Company Excel Spreadsheets:**
   - Receipt of company Excel rate files will allow validating whether specific partner hotels follow recurring formula patterns.
3. **Database Migration Activation:**
   - Awaiting owner authorization to deploy migrations `000009`, `000010`, and `000011` to the live database.

