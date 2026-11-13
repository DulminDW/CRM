# RATE DATABASE MIGRATION SAFETY AUDIT REPORT
**Window Companies Management System — Technical & Security Audit**  
**Audit Date:** November 05, 2026  
**Auditor / Roles:** Principal Database Architect, PostgreSQL Security Engineer & Systems Analyst  
**Target Migrations Audited:**
1. `supabase/migrations/20261105000009_rate_management_foundation.sql`
2. `supabase/migrations/20261105000010_contracts_and_custom_rate_templates.sql`
**Classification:** Pre-Deployment Technical & Security Verification  

---

## 1. Executive Summary & Audit Verdict

This audit performs a strict, zero-trust pre-deployment inspection of the pending Rate Management and Contract Management database migrations (`000009` and `000010`).

### Final Audit Recommendation: **GO (CONDITIONAL ON PRE-FLIGHT CHECKLIST)**
> [!IMPORTANT]
> The architectural design, referential integrity constraints, composite foreign keys, and Row Level Security (RLS) policies are **technically sound, hardened, and safe for execution**.
> 
> However, deployment **MUST NOT** proceed until:
> 1. Explicit owner/stakeholder authorization is obtained.
> 2. The pre-flight prerequisite verification in Migration `000009` (presence of `uq_hotel_season_composite`) is verified against the live schema.
> 3. An advisory index on foreign keys is scheduled to optimize PostgREST cascade joins.

---

## 2. Migration-by-Migration Structural Verification

### 2.1 Migration `20261105000009_rate_management_foundation.sql`

| Audit Criteria | Finding / Implementation in File | Safety Rating |
| :--- | :--- | :---: |
| **Prerequisite Assertion** | Contains a pre-flight anonymous PL/pgSQL block asserting `uq_hotel_season_composite` on `public.hotel_seasons`. Aborts immediately if missing. | **SAFE** |
| **Composite FK Integrity** | Adds `fk_rate_sheets_composite_season` linking `(season_id, hotel_id)` to `public.hotel_seasons(id, hotel_id) ON DELETE RESTRICT`. Prevents assigning a season from Hotel B to a rate sheet for Hotel A. | **SAFE** |
| **Version Increment Uniqueness** | `idx_hotel_rate_sheets_version_unique` on `(hotel_id, season_id, version_number)`. Guarantees rate version sequencing cannot collide. | **SAFE** |
| **Single Published Sheet Guarantee** | Partial unique index `idx_hotel_rate_sheets_single_published` on `(hotel_id, season_id) WHERE (status = 'PUBLISHED')`. Mathematically guarantees only **one** rate sheet is active/published per hotel/season. | **SAFE** |
| **RLS Policy Coverage** | Enables RLS on `hotel_rate_sheets`, `hotel_rate_components`, `hotel_rate_outputs`, and `agency_special_rates`. Explicit `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies defined for each. | **SAFE** |
| **Immutability of Archived Rates** | Update policy on `hotel_rate_sheets` enforces `status != 'ARCHIVED'`. Prevents historical published/archived pricing from being mutated. | **SAFE** |
| **Least-Privilege Deletion** | Delete on `hotel_rate_sheets` is strictly restricted to `public.is_admin() AND status = 'DRAFT'`. Published rates can never be deleted, only archived. | **SAFE** |

---

### 2.2 Migration `20261105000010_contracts_and_custom_rate_templates.sql`

| Audit Criteria | Finding / Implementation in File | Safety Rating |
| :--- | :--- | :---: |
| **Contract Table Creation** | Creates `public.hotel_contracts` with UUID primary key, contract reference, validity dates, status, and currency. | **SAFE** |
| **Contract Composite FK** | Enforces `CONSTRAINT fk_contracts_composite_season FOREIGN KEY (season_id, hotel_id) REFERENCES public.hotel_seasons(id, hotel_id) ON DELETE RESTRICT`. Guarantees contractual season scoping. | **SAFE** |
| **Contract Uniqueness** | Unique constraint `uq_contract_reference` prevents duplicate commercial agreements. | **SAFE** |
| **Contract Date Validation** | Check constraint `chk_contract_dates CHECK (valid_to >= valid_from)` strictly prevents inverted validity dates at the database level. | **SAFE** |
| **Custom Templates Table** | Creates `public.custom_rate_templates` with composite FK `(season_id, hotel_id)` and check constraints enforcing `slot_label IN ('Custom 1', 'Custom 2', 'Custom 3')` and `rate_amount >= 0`. | **SAFE** |
| **Contract RLS Policies** | RLS enabled. Read access granted to `is_active_employee()`; mutations restricted to `can_manage_rates()`. | **SAFE** |
| **Custom Templates RLS** | RLS enabled. Read access granted to `is_active_employee()`; mutations restricted to `can_manage_rates()`. | **SAFE** |

---

## 3. Contract and Rate Separation Guarantees

| Separation Dimension | Implementation Mechanism | Verification Result |
| :--- | :--- | :---: |
| **A. Yearly Contracts vs. Colour Rates** | Stored in completely separate tables: `hotel_contracts` vs. `hotel_rate_sheets` / `hotel_rate_outputs`. No field or record overlap. | **VERIFIED** |
| **B. Mutual Exclusivity of Red / Green / Yellow** | Handled via UI radio-group state (`'RED' \| 'GREEN' \| 'YELLOW'`) and line item snapshot storing exactly one `rate_category`. Only one color is quoted per line item. | **VERIFIED** |
| **C. Custom 1, 2, 3 Separation** | Custom templates live in `custom_rate_templates` with dedicated slot validation (`slot_label IN ('Custom 1', 'Custom 2', 'Custom 3')`), separate from standard tiers. | **VERIFIED** |
| **D. Historical Quote Immutability** | Quotes are frozen into `quote_items` with raw text snapshots (`hotel_name_snapshot`, `season_label_snapshot`, `quoted_amount`). Changing master contracts or rate sheets does **not** mutate historical quotes. | **VERIFIED** |
| **E. Version Preservation** | `version_number` tracking on rate sheets and contracts ensures prior versions remain intact and queryable. | **VERIFIED** |

---

## 4. Permissions & Access Control Audit

1. **Admin Capabilities:**
   - Evaluated via `public.is_admin()`. Admins have full read/write/delete capabilities across rate sheets, contracts, and custom templates.
2. **Staff Role Enforcement:**
   - Staff without `CAN_MANAGE_RATES` permission key:
     - `SELECT`: Granted (can view rates to prepare proposals for agencies).
     - `INSERT / UPDATE / DELETE`: Strictly **DENIED** by RLS policies `rate_sheets_insert_policy`, `rate_components_mutation_policy`, and `contracts_mutation_policy`.
   - Staff with `CAN_MANAGE_RATES`:
     - Can draft and update rate sheets, components, outputs, contracts, and custom templates.
     - **Cannot delete published rate sheets** (delete restricted to Admin + Draft only).
3. **Agency Contacts Isolation:**
   - Agency members are stored in `public.agency_members` (external directory). They do not exist in `auth.users` or `public.user_profiles` and have **zero login or API access**.
4. **Anonymous Protection:**
   - All rate and contract policies require `TO authenticated`. Anonymous requests return empty arrays or RLS policy violation errors.
5. **Secret Protection:**
   - Inspected frontend repository: No Supabase service-role key is present or committed. Only public anon keys are used client-side.

---

## 5. Database Safety & Hardening Analysis

- **SECURITY DEFINER Functions:** Verified functions `is_active_employee()`, `is_admin()`, and `can_manage_rates()` in `20261104000002_auth_and_rls.sql` have explicit `SET search_path = public, pg_temp` and revoke execution privileges from `PUBLIC`.
- **Delete Protection:** Master contracts and rate sheets use `ON DELETE RESTRICT` against parent hotels and seasons, preventing accidental cascading deletions of pricing catalogs.
- **Audit Event Triggering:** Updates to rates and quotes generate audit entries where table audit triggers are attached.

---

## 6. Audit Conclusion & Sign-Off

Both `20261105000009_rate_management_foundation.sql` and `20261105000010_contracts_and_custom_rate_templates.sql` meet enterprise security and relational standards. 

**Recommendation: GO (Awaiting administrative deployment trigger).**

