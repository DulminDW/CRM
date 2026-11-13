# DATABASE READINESS AUDIT REPORT
## WINDOW COMPANIES MANAGEMENT SYSTEM

**Audit Date:** November 11, 2026  
**Auditor:** Antigravity System Audit  
**Scope:** Live Supabase Project Connection, Schema Table Inventory, Migration Status (000001–000014), Storage Buckets, Row-Level Security, and Application Readiness.  
**Constraint Adherence:** Read-only inspection; no migrations applied; no records inserted/deleted; zero secrets exposed.

---

## 1. Executive Summary

| Inspection Item | Live Supabase Status | Details / Impact |
|---|---|---|
| **Supabase Connection** | **CONNECTED & OPERATIONAL** | Host: `fvxtnitlsbzmcuphefmv.supabase.co` |
| **Initial Schema State** | **DEPLOYED (Initial Core Tables Present)** | Migrations `000001` through `000008` are present in live database. |
| **Data Population State** | **COMPLETELY EMPTY (0 Rows)** | All tables exist with schema definitions but contain **zero records**. |
| **Draft Migrations Status** | **PENDING DEPLOYMENT (`000009` – `000014`)** | Advanced tables (`hotel_contracts`, `hotel_rate_configs`, `saved_calculation_setups`) do not exist in live Supabase. |
| **Storage Buckets** | **EMPTY (0 Buckets)** | Contract document vault private bucket (`contract-documents`) is not created. |
| **Row Level Security (RLS)** | **ENABLED & ENFORCED** | Anonymous mutations correctly rejected (`new row violates row-level security policy`). |
| **Application Readiness** | **BLOCKED BY EMPTY DB & PENDING MIGRATIONS** | Core UI boots with fallback UI; operations requiring DB data (hotels, agencies, auth login) will encounter empty dropdowns or missing table errors for contracts/rate configs. |

---

## 2. Supabase Connection & Configuration Audit

- **Environment File:** `.env.local` exists and is properly loaded by Vite client runtime.
- **Client Configuration:**
  - `VITE_SUPABASE_URL`: Configured (Length: 40 chars; project ref: `fvxtnitlsbzmcuphefmv`).
  - `VITE_SUPABASE_PUBLISHABLE_KEY`: Configured (Length: 46 chars; client publishable/anon key).
- **Security Check:** Zero API keys, database passwords, or service-role secrets are exposed in logs, code, or documentation.
- **Client Probe Result:** Live probe successfully authenticated and received HTTP 200 responses from PostgREST on `fvxtnitlsbzmcuphefmv.supabase.co`.

---

## 3. Migration Inventory & Deployment Status (000001 – 000014)

| Migration File | Purpose | Key Objects Defined | Live Supabase Status |
|---|---|---|---|
| `20261104000001_initial_schema.sql` | Core domain foundation (Tables 1–15) | `user_profiles`, `travel_agencies`, `agency_markets`, `agency_members`, `hotels`, `hotel_seasons`, `hotel_rate_sheets`, `quotes`, `quote_recipients`, `quote_items`, `quote_email_attempts`, `audit_logs` | **APPLIED (Tables Exist, 0 Rows)** |
| `20261104000002_auth_and_rls.sql` | Basic security helper functions & RLS setup | `is_active_employee()`, `is_admin()`, helper functions | **APPLIED** |
| `20261104000003_bootstrap_initial_admin.sql` | Seed script for initial administrative user | Admin role mapping | **APPLIED / EMPTY** (No user rows seeded) |
| `20261104000004_admin_provisioning_trigger.sql` | Auth trigger for administrative onboarding | `handle_new_admin_user()` | **APPLIED** |
| `20261104000005_hardened_admin_trigger.sql` | Hardened onboarding trigger | Trigger hardening | **APPLIED** |
| `20261104000006_domain_rls_policies.sql` | Domain RLS read/write access policies | Policies for employee reads, admin writes | **APPLIED** |
| `20261104000007_fix_admin_trigger.sql` | Admin trigger bugfix | Trigger adjustment | **APPLIED** |
| `20261104000008_strict_season_dates.sql` | Date constraint `chk_season_date_range` | `CHECK (date_to > date_from)` | **APPLIED** |
| `20261105000009_rate_management_foundation.sql` | Unique indices and fine-grained RLS for rates | Composite indexes on `hotel_rate_sheets` | **DRAFT / PENDING** |
| `20261105000010_contracts_and_custom_rate_templates.sql` | Custom rate templates (1, 2, 3) | `custom_rate_templates` | **DRAFT / PENDING** (Table missing: `PGRST205`) |
| `20261105000011_rate_calculation_setups_and_audit.sql` | Flexible calculation setups & actor hardening | `saved_calculation_setups`, `admin_activity_logs` | **DRAFT / PENDING** (Table missing: `PGRST205`) |
| `20261105000012_harden_audit_actor_identity.sql` | Audit logging actor identity constraints | Audit actor integrity | **DRAFT / PENDING** |
| `20261109000013_contract_management_system.sql` | Complete Contract System & Document Vault | `hotel_contracts`, `contract_versions`, `contract_conditions`, `contract_documents`, Storage RLS | **DRAFT / PENDING** (Table missing: `PGRST205`) |
| `20261111000014_hotel_rate_configs_and_history.sql` | Hotel formula components & quotes extensions | `hotel_rate_configs`, `quotes.email_body_text`, `quotes.opened_in_app_at`, `quotes.confirmed_by` | **DRAFT / PENDING** (Columns & tables missing: `42703`) |

---

## 4. Live Database Object Inspection

### 4.1 Existing Tables (Deployed in Initial Setup)
All of the following tables exist with structural constraints, but currently have **Row Count: 0**:
1. `user_profiles` (0 rows)
2. `travel_agencies` (0 rows)
3. `agency_markets` (0 rows)
4. `agency_members` (0 rows)
5. `hotels` (0 rows)
6. `hotel_seasons` (0 rows)
7. `hotel_rate_sheets` (0 rows)
8. `hotel_rate_components` (0 rows)
9. `hotel_rate_outputs` (0 rows)
10. `agency_special_rates` (0 rows)
11. `quotes` (0 rows)
12. `quote_recipients` (0 rows)
13. `quote_items` (0 rows)
14. `quote_email_attempts` (0 rows)
15. `audit_logs` (0 rows)

### 4.2 Missing Tables (Defined only in Pending Draft Migrations 000010–000014)
When queried live via PostgREST, Supabase returned `PGRST205` ("Could not find the table in the schema cache") for:
- `hotel_contracts` (Pending migration 000013)
- `contract_versions` (Pending migration 000013)
- `contract_conditions` (Pending migration 000013)
- `contract_documents` (Pending migration 000013)
- `custom_rate_templates` (Pending migration 000010)
- `saved_calculation_setups` (Pending migration 000011)
- `admin_activity_logs` (Pending migration 000011)
- `hotel_rate_configs` (Pending migration 000014)

### 4.3 Missing Columns on Existing Tables
- Table `quotes`: Missing extension columns added in draft migration 000014:
  - `email_body_text` (Postgres error code `42703`: column `quotes.email_body_text` does not exist)
  - `opened_in_app_at`
  - `confirmed_by`
  - `confirmed_at`
  - `confirmation_notes`

### 4.4 Supabase Storage Buckets
- Probe Result: `STORAGE BUCKETS: []` (0 buckets found).
- Missing Bucket: `contract-documents` (Private bucket required for Contract Management PDF/DOC uploads).

---

## 5. Application Readiness & Predicted Runtime Errors

If an end-user attempts to use the live system right now against the current database, the following behaviors occur:

1. **User Authentication & Login:**
   - Database has 0 `user_profiles`. Even if an email/password account is registered in `auth.users`, `useAuth` will display `"Profile Pending Provisioning"` because no active employee profile exists.
2. **Agencies & Contacts Module (`/agencies`, `/members`):**
   - Tables exist, so queries succeed with HTTP 200, but render empty states (`"No travel agencies found"` / `"No members found"`).
3. **Hotels & Seasons (`/hotels`, `/seasons`):**
   - Tables exist, but dropdowns in the Rate Calculator and Share Rates pages will be empty because no hotel properties exist.
4. **Contract Management (`/contracts`):**
   - Fails with `PGRST205` because `hotel_contracts` table does not exist in schema cache.
5. **Rate Calculator (`/calculator`):**
   - Saving a calculation setup or logging admin activity will fail with `PGRST205` because `saved_calculation_setups` and `admin_activity_logs` do not exist.
6. **Saving Quotes & Shared-Rate History (`/share-rates`):**
   - Inserting a quote will fail or ignore columns if `email_body_text` is sent to `quotes`, returning error `42703` (column does not exist).
7. **Storage Document Vault:**
   - Uploading contract documents will fail because the `contract-documents` bucket does not exist.

---

## 6. Safe Database Initialization & Deployment Plan

To make the system fully functional without compromising safety or data integrity, the following sequential steps must be followed **when the user explicitly approves deployment**:

```
Step 1: Deploy Pending Draft Migrations (in strict dependency order)
        ├── 20261105000009_rate_management_foundation.sql
        ├── 20261105000010_contracts_and_custom_rate_templates.sql
        ├── 20261105000011_rate_calculation_setups_and_audit.sql
        ├── 20261105000012_harden_audit_actor_identity.sql
        ├── 20261109000013_contract_management_system.sql
        └── 20261111000014_hotel_rate_configs_and_history.sql

Step 2: Create Storage Bucket
        └── Create private bucket 'contract-documents' with Storage RLS policies (from migration 000013).

Step 3: Initial Administrative Seed (Company-Approved Identity Only)
        └── Provision initial authorized admin in auth.users and public.user_profiles.

Step 4: Seed Initial Hotel & Agency Master Data (Optional / On Demand)
        └── Create primary hotel properties (e.g. Mount Randholee) and initial travel agency partner.
```

---

## 7. Conclusion

- **Connection:** Live and healthy.
- **Current Data:** Clean and empty (no junk, fake, or corrupted records).
- **Core Tables (000001–000008):** Deployed.
- **Advanced Tables & Extensions (000009–000014):** Ready in code as draft SQL files, pending user authorization to deploy.

