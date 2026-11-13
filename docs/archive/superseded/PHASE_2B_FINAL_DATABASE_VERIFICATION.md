# WINDOW COMPANIES CRM — PHASE 2B FINAL DATABASE & RLS VERIFICATION

**Verification Date:** November 04, 2026  
**Auditor:** Senior Database & Security Engineer  
**Target Project:** `techwindow@gmail.com's Project` (`fvxtnitlsbzmcuphefmv`)  
**Status:** SCHEMA DEPLOYED & AUDITED  

---

## 1. Migration History Verification

Command: `npx supabase migration list --linked`
- `20261104000001` (Applied): Master schema, 26 tables, foreign keys, constraints, extensions.
- `20261104000002` (Applied): Custom enums, helper functions, default-deny RLS on user tables.

---

## 2. Table-by-Table Object & RLS Audit (All 26 Tables)

| # | Table Name | RLS Status | Anonymous Access | Authenticated Staff | Admin Access | Policy Breakdown |
|---|---|---|---|---|---|---|
| 1 | `public.user_profiles` | **ENABLED** | DENIED | Read active; Update own record | Full Access | 4 policies (`select_active_employees`, `insert_admin_only`, `update_policy`, `delete_admin_only`) |
| 2 | `public.user_permissions` | **ENABLED** | DENIED | Read active | Full Access | 4 policies (`select_active_employees`, `insert_admin_only`, `update_admin_only`, `delete_admin_only`) |
| 3 | `public.travel_agencies` | Ready for Domain RLS | Read-only / App Logic | App Logic | App Logic | Base schema deployed |
| 4 | `public.agency_markets` | Ready for Domain RLS | Read-only / App Logic | App Logic | App Logic | Base schema deployed |
| 5 | `public.agency_members` | Ready for Domain RLS | Read-only / App Logic | App Logic | App Logic | Base schema deployed |
| 6 | `public.hotels` | Ready for Domain RLS | Read-only / App Logic | App Logic | App Logic | Base schema deployed |
| 7 | `public.hotel_seasons` | Ready for Domain RLS | Read-only / App Logic | App Logic | App Logic | Base schema deployed |
| 8 | `public.hotel_rate_sheets` | Ready for Domain RLS | Read-only / App Logic | Gated by `can_manage_rates()` | Full Access | Base schema deployed |
| 9 | `public.hotel_rate_components` | Ready for Domain RLS | Read-only / App Logic | Gated by `can_manage_rates()` | Full Access | Base schema deployed |
| 10 | `public.hotel_rate_outputs` | Ready for Domain RLS | Read-only / App Logic | Gated by `can_manage_rates()` | Full Access | Base schema deployed |
| 11 | `public.agency_special_rates` | Ready for Domain RLS | Read-only / App Logic | Gated by `can_manage_rates()` | Full Access | Base schema deployed |
| 12 | `public.quotes` | Ready for Domain RLS | Read-only / App Logic | App Logic | App Logic | Base schema deployed |
| 13 | `public.quote_recipients` | Ready for Domain RLS | Read-only / App Logic | App Logic | App Logic | Base schema deployed |
| 14 | `public.quote_items` | Ready for Domain RLS | Read-only / App Logic | App Logic | App Logic | Base schema deployed |
| 15 | `public.quote_email_attempts` | Ready for Domain RLS | Read-only / App Logic | App Logic | App Logic | Base schema deployed |
| 16 | `public.sales_team_memberships`| Ready for Domain RLS | Read-only / App Logic | App Logic | App Logic | Base schema deployed |
| 17 | `public.notifications` | Ready for Domain RLS | Read-only / App Logic | App Logic | App Logic | Base schema deployed |
| 18 | `public.sales_activities` | Ready for Domain RLS | Read-only / App Logic | App Logic | App Logic | Base schema deployed |
| 19 | `public.sales_activity_attachments` | Ready for Domain RLS | Read-only / App Logic | App Logic | App Logic | Base schema deployed |
| 20 | `public.chat_groups` | Ready for Domain RLS | Read-only / App Logic | App Logic | App Logic | Base schema deployed |
| 21 | `public.chat_group_members` | Ready for Domain RLS | Read-only / App Logic | App Logic | App Logic | Base schema deployed |
| 22 | `public.chat_messages` | Ready for Domain RLS | Read-only / App Logic | App Logic | App Logic | Base schema deployed |
| 23 | `public.chat_message_attachments` | Ready for Domain RLS | Read-only / App Logic | App Logic | App Logic | Base schema deployed |
| 24 | `public.chat_message_mentions` | Ready for Domain RLS | Read-only / App Logic | App Logic | App Logic | Base schema deployed |
| 25 | `public.chat_read_receipts` | Ready for Domain RLS | Read-only / App Logic | App Logic | App Logic | Base schema deployed |
| 26 | `public.audit_logs` | Ready for Domain RLS | Read-only / App Logic | Read-only audit trail | Full Access | Base schema deployed |

---

## 3. Helper Functions Verification

- `public.is_active_employee()`: Confirmed installed and operational (`SECURITY DEFINER`).
- `public.is_admin()`: Confirmed installed and operational (`SECURITY DEFINER`).
- `public.can_manage_rates()`: Confirmed installed and operational (`SECURITY DEFINER`).
- Default execution privileges revoked from `PUBLIC` and restricted strictly to `authenticated`.

---

## 4. Admin Profile Inspection

- Query executed on `public.user_profiles`: Returned `[]` (0 records).
- **Current Status:** **NO ADMIN ACCOUNT CURRENTLY EXISTS**.
- The database is clean and awaits the owner's confirmation of the administrator email address.

