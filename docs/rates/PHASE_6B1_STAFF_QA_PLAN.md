# PHASE 6B-1 — STAFF QA TEST ACCOUNT PREPARATION PLAN
**Window Companies Management System — Multi-Role Security & QA Plan**  
**Document Code:** `PHASE_6B1_STAFF_QA_PLAN.md`  
**Date:** November 05, 2026  
**Status:** READY FOR OWNER PROVISIONING (DO NOT CREATE UNILATERALLY)  

---

## 1. Context & Security Boundaries

In Phase 5 and Phase 6, comprehensive quality assurance and security testing was executed using the authenticated **Admin account** (`techwindow@gmail.com`). 

To test non-administrative user workflows—verifying that regular Staff members can browse hotel rates, inspect contracts, and dispatch quotes, but are **strictly prevented by Row Level Security from mutating or deleting master contracts and rate sheets**—a dedicated test Staff account is required.

> [!CAUTION]
> **COMPLIANCE DIRECTIVE:**  
> The agent must **never** create accounts unilaterally, request passwords, or modify Supabase Auth public signup settings. Account creation must follow the owner-approved workflow outlined below.

---

## 2. Recommended Owner-Approved Provisioning Workflow

The system contains an automated trigger `on_auth_user_created_admin` in `20261104000007_fix_admin_trigger.sql` that provisions `ADMIN` roles exclusively for `techwindow@gmail.com`. All other accounts created in `auth.users` default to the standard `STAFF` role in `public.user_profiles` with **zero initial permission keys**.

### Step-by-Step Provisioning Guide for Project Owner:

1. **Access Supabase Dashboard:**  
   Navigate to: `https://supabase.com/dashboard/project/fvxtnitlsbzmcuphefmv/auth/users`.
2. **Invite / Add Test User:**  
   - Click **"Add user"** &rarr; **"Create user"**.
   - **Email:** `staff_qa@windowcompanies.com` (or project owner preferred test email).
   - **Password:** Generate a strong temporary password.
   - **Auto Confirm Email:** Checked (`true`).
3. **Automatic Profile Generation:**  
   - Upon creation in `auth.users`, the trigger automatically creates a row in `public.user_profiles`:
     - `role = 'STAFF'`
     - `is_active = TRUE`
   - **Crucial Security Check:** The user will **NOT** have `CAN_MANAGE_RATES` in `public.user_permissions`, making them an ideal candidate for least-privilege testing.

---

## 3. Test Cases to Execute Once Provisioned

| Test Case ID | Role Under Test | Action / Endpoint | Expected Outcome | RLS Policy Enforcing Rule |
| :---: | :--- | :--- | :--- | :--- |
| **STF-01** | Staff (No Manage Rates) | View Partner Hotels (`/hotels`) | **ALLOWED** (Read catalog) | `hotels_select` (`is_active_employee()`) |
| **STF-02** | Staff (No Manage Rates) | View Hotel Contracts (`/rates`) | **ALLOWED** (Read contracts) | `contracts_select_policy` (`is_active_employee()`) |
| **STF-03** | Staff (No Manage Rates) | Create / Edit Master Contract | **DENIED** (403 Forbidden) | `contracts_mutation_policy` (`can_manage_rates()`) |
| **STF-04** | Staff (No Manage Rates) | Create / Edit Custom Template | **DENIED** (403 Forbidden) | `custom_templates_mutation_policy` (`can_manage_rates()`) |
| **STF-05** | Staff (No Manage Rates) | Create / Edit Hotel Rate Sheet | **DENIED** (403 Forbidden) | `rate_sheets_insert_policy` (`can_manage_rates()`) |
| **STF-06** | Staff (No Manage Rates) | Dispatch Quote to Agency (`/share-rates`) | **ALLOWED** (Send quote) | `quotes_insert` (`is_active_employee()`) |
| **STF-07** | Staff (No Manage Rates) | Delete Historical Quote Snapshot | **DENIED** (403 Forbidden) | `quotes_delete` (`is_admin()`) |

---

## 4. Current Status
- **Plan Status:** **DOCUMENTED & PREPARED**.
- **Execution Status:** **BLOCKED (Awaiting Owner Provisioning of `staff_qa@windowcompanies.com`)**.

