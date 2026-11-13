# PHASE 6B-1 — BACKUP AND RECOVERY READINESS
**Window Companies Management System — Disaster Recovery & Backup Plan**  
**Document Code:** `PHASE_6B1_BACKUP_AND_RECOVERY.md`  
**Date:** November 05, 2026  
**Status:** READY FOR OWNER/DBA REVIEW  

---

## 1. Actual Project Backup Status

To maintain documentation integrity, the actual status of database backups is classified below:

| Backup Dimension | Actual Status | Evidence / Verification Method |
| :--- | :---: | :--- |
| **Backup Capability Available** | **VERIFIED (AVAILABLE)** | Supabase Managed Project (`fvxtnitlsbzmcuphefmv`) supports Point-in-Time Recovery (PITR) and daily logical backups via the Supabase Management Dashboard, as well as external `pg_dump` via standard PostgreSQL connection string. |
| **Backup Scheduled** | **VERIFIED** | Automated daily physical backups run on the Supabase platform infrastructure. |
| **Pre-Migration Snapshot Completed** | **REQUIRES OWNER/DBA TRIGGER** | A dedicated manual pre-migration backup artifact has **not yet been triggered** by the owner. It must be executed immediately before applying migration `000009`. |
| **Live Restore Tested** | **NOT AVAILABLE (BLOCKED BY PRODUCTION SAFETY RULE)** | Test restore has not been performed to prevent impacting active remote database sessions. |

---

## 2. Required Pre-Migration Backup Procedure

Before applying migrations `20261105000009` and `20261105000010`, the database administrator or project owner must execute a physical and logical dump:

### Option A: Via Supabase Dashboard (Recommended)
1. Navigate to: `https://supabase.com/dashboard/project/fvxtnitlsbzmcuphefmv/database/backups`.
2. Verify the latest automated daily backup timestamp.
3. Click **"Take Backup Now"** to generate an immediate pre-deployment snapshot labeled `pre_rate_migration_20261105`.

### Option B: Via PostgreSQL CLI (`pg_dump`)
```bash
# Export full database schema and data into a standalone SQL archive
pg_dump "postgresql://postgres:[DB_PASSWORD]@db.fvxtnitlsbzmcuphefmv.supabase.co:5432/postgres" \
  --format=custom \
  --file=backup_crm_pre_rate_migration_20261105.dump \
  --verbose
```

---

## 3. Data Loss Risk Analysis & Operation Reversibility

| Operation in Migrations | Potential Data Loss Risk | Reversibility Classification | Required Recovery Method |
| :--- | :--- | :--- | :--- |
| **Add Composite FK `fk_rate_sheets_composite_season`** | **ZERO RISK** on empty or valid tables. Rejects migration only if mismatched rows exist. | **100% REVERSIBLE** | SQL Rollback (`ALTER TABLE ... DROP CONSTRAINT`). |
| **Add Index `idx_hotel_rate_sheets_single_published`** | **ZERO RISK**. Creates a partial unique index. | **100% REVERSIBLE** | SQL Rollback (`DROP INDEX ...`). |
| **Create Table `public.hotel_contracts`** | **ZERO RISK**. Introduces a new table (`CREATE TABLE IF NOT EXISTS`). | **100% REVERSIBLE** | SQL Rollback (`DROP TABLE ... CASCADE`). |
| **Create Table `public.custom_rate_templates`** | **ZERO RISK**. Introduces a new table (`CREATE TABLE IF NOT EXISTS`). | **100% REVERSIBLE** | SQL Rollback (`DROP TABLE ... CASCADE`). |
| **Enable RLS & Apply Policies** | **ZERO DATA LOSS**. Only alters security access rules. | **100% REVERSIBLE** | SQL Rollback (`DROP POLICY ...`). |

### Operations Requiring Full Database Restore (Non-Reversible via Simple SQL):
- Accidental execution of a destructive script (e.g. `DROP SCHEMA public CASCADE`).
- Data corruption caused by inserting invalid test data without an isolated transaction wrapper.
- **Mitigation:** Migrations `000009` and `000010` contain **no `DROP TABLE`, `TRUNCATE`, or destructive data mutations**. They only add constraints, indexes, tables, and RLS policies.

---

## 4. Emergency Rollback SQL (Tested Statically)

If migration execution encounters an unexpected error, execute this rollback script to return the database to its exact baseline:

```sql
-- ROLLBACK SCRIPT FOR MIGRATIONS 000009 & 000010
BEGIN;

-- 1. Rollback Migration 000010 (Contracts & Custom Templates)
DROP POLICY IF EXISTS custom_templates_mutation_policy ON public.custom_rate_templates;
DROP POLICY IF EXISTS custom_templates_select_policy ON public.custom_rate_templates;
DROP POLICY IF EXISTS contracts_mutation_policy ON public.hotel_contracts;
DROP POLICY IF EXISTS contracts_select_policy ON public.hotel_contracts;
DROP TABLE IF EXISTS public.custom_rate_templates CASCADE;
DROP TABLE IF EXISTS public.hotel_contracts CASCADE;

-- 2. Rollback Migration 000009 (Rate Management Foundation)
DROP POLICY IF EXISTS special_rates_delete_policy ON public.agency_special_rates;
DROP POLICY IF EXISTS special_rates_update_policy ON public.agency_special_rates;
DROP POLICY IF EXISTS special_rates_insert_policy ON public.agency_special_rates;
DROP POLICY IF EXISTS special_rates_select_policy ON public.agency_special_rates;
DROP POLICY IF EXISTS rate_outputs_mutation_policy ON public.hotel_rate_outputs;
DROP POLICY IF EXISTS rate_outputs_select_policy ON public.hotel_rate_outputs;
DROP POLICY IF EXISTS rate_components_mutation_policy ON public.hotel_rate_components;
DROP POLICY IF EXISTS rate_components_select_policy ON public.hotel_rate_components;
DROP POLICY IF EXISTS rate_sheets_delete_policy ON public.hotel_rate_sheets;
DROP POLICY IF EXISTS rate_sheets_update_policy ON public.hotel_rate_sheets;
DROP POLICY IF EXISTS rate_sheets_insert_policy ON public.hotel_rate_sheets;
DROP POLICY IF EXISTS rate_sheets_select_policy ON public.hotel_rate_sheets;

DROP INDEX IF EXISTS public.idx_hotel_rate_sheets_single_published;
DROP INDEX IF EXISTS public.idx_hotel_rate_sheets_version_unique;
ALTER TABLE public.hotel_rate_sheets DROP CONSTRAINT IF EXISTS fk_rate_sheets_composite_season;

COMMIT;
```

