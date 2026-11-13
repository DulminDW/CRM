# RATE DEPLOYMENT CHECKLIST & MIGRATION EXECUTION PLAN
**Window Companies Management System — Production Deployment Plan**  
**Document Code:** `RATE_DEPLOYMENT_CHECKLIST.md`  
**Date:** November 05, 2026  
**Status:** READY FOR OWNER APPROVAL (DO NOT EXECUTE WITHOUT AUTHORIZATION)  

---

## 1. Deployment Overview & Staging Order

This plan outlines the sequential, non-destructive deployment procedure for bringing Rate Management and Contract Management tables live on the Supabase PostgreSQL production instance (`fvxtnitlsbzmcuphefmv`).

```
                    DEPLOYMENT SEQUENCE
                            │
   STEP 1: Full Remote Database Schema & Data Backup
                            │
   STEP 2: Pre-Flight Constraint & Prerequisite Check
                            │
   STEP 3: Execute 20261105000009_rate_management_foundation.sql
                            │
   STEP 4: Verify Rate Sheet Constraints & Partial Indexes
                            │
   STEP 5: Execute 20261105000010_contracts_and_custom_rate_templates.sql
                            │
   STEP 6: Verify Contracts & Custom Templates RLS Policies
                            │
   STEP 7: Post-Deployment Smoke Test (Authenticated CRUD)
```

---

## 2. Pre-Deployment Checklist (Before Executing SQL)

- [ ] **Owner Authorization:** Obtain explicit written instruction to apply pending migrations to production database.
- [ ] **Full Database Backup:**
  - Execute PostgreSQL pg_dump / Supabase dashboard point-in-time backup.
  - Verify backup artifact size and table inventories.
- [ ] **Verify Migration Order:**
  - `20261104000001_initial_schema.sql` (Already applied)
  - `20261104000002_auth_and_rls.sql` (Already applied)
  - `20261104000006_domain_rls_policies.sql` (Already applied)
  - `20261104000008_strict_season_dates.sql` (Already applied)
  - `20261105000009_rate_management_foundation.sql` (Next in sequence)
  - `20261105000010_contracts_and_custom_rate_templates.sql` (Subsequent)
- [ ] **Verify Prerequisite Constraints:**
  - Check that `uq_hotel_season_composite` exists on `public.hotel_seasons(id, hotel_id)`.
  - Check that `public.is_active_employee()`, `public.is_admin()`, and `public.can_manage_rates()` functions exist in `public`.

---

## 3. Migration Execution Steps

### Step 3.1: Run Migration `20261105000009_rate_management_foundation.sql`
- **Execution Method:** Supabase SQL Editor or Supabase CLI (`supabase db push`).
- **Expected Result:**
  - Assertions pass cleanly.
  - `fk_rate_sheets_composite_season` added to `hotel_rate_sheets`.
  - Version increment and single-published partial indexes created.
  - RLS enabled on rate tables with authenticated policies applied.

### Step 3.2: Run Migration `20261105000010_contracts_and_custom_rate_templates.sql`
- **Execution Method:** Supabase SQL Editor or Supabase CLI.
- **Expected Result:**
  - Table `public.hotel_contracts` created with composite FK.
  - Table `public.custom_rate_templates` created with composite FK and slot checks.
  - RLS enabled and authenticated policies applied.

---

## 4. Post-Deployment Verification & Smoke Testing

- [ ] **Schema Check:** Query `information_schema.tables` and confirm `hotel_contracts` and `custom_rate_templates` are present.
- [ ] **Foreign Key Check:** Attempt to insert an invalid composite pairing `(season_id, hotel_id)` where the season belongs to a different hotel. Verify that PostgreSQL immediately rejects the transaction with a foreign key violation.
- [ ] **Single Published Sheet Check:** Attempt to insert two rows with `status = 'PUBLISHED'` for the same `(hotel_id, season_id)`. Verify rejection via `idx_hotel_rate_sheets_single_published`.
- [ ] **Custom Slot Check:** Attempt to insert a row into `custom_rate_templates` with `slot_label = 'Custom 4'`. Verify rejection via `chk_custom_rate_slot`.
- [ ] **Frontend Verification:**
  - Log in as Admin. Navigate to `/rates`. Verify Contracts, Custom Templates, and Rate Sheets load without console errors.
  - Navigate to `/share-rates`. Verify dropdowns for Hotel, Season, Contract, and Custom Templates bind live data.

---

## 5. Rollback & Contingency Plan

If unexpected constraint collisions or failures occur during deployment:

1. **Rollback Migration 000010:**
   ```sql
   DROP TABLE IF EXISTS public.custom_rate_templates CASCADE;
   DROP TABLE IF EXISTS public.hotel_contracts CASCADE;
   ```
2. **Rollback Migration 000009:**
   ```sql
   ALTER TABLE public.hotel_rate_sheets DROP CONSTRAINT IF EXISTS fk_rate_sheets_composite_season;
   DROP INDEX IF EXISTS public.idx_hotel_rate_sheets_version_unique;
   DROP INDEX IF EXISTS public.idx_hotel_rate_sheets_single_published;
   ```
3. **Restore Database:** If data truncation or corruption occurs, restore from the pre-deployment pg_dump backup taken in Step 2.

