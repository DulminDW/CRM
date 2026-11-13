# WINDOW COMPANIES MANAGEMENT SYSTEM — RATE DATABASE SECURITY & RLS DESIGN

**Date:** November 05, 2026  
**Auditor:** Senior Security Architect  
**Scope:** Row Level Security (RLS) policies for Rate Management tables  

---

## 1. Security Invariants

1. **Internal Visibility Only:**
   - Under no circumstances should rate components, internal color tiers (Red/Green/Yellow), or cost margins be exposed through unauthenticated APIs or client-side leakage.
2. **Permission Gated Mutations:**
   - Viewing rates: Permitted for all active internal company employees (`is_active_employee() = true`).
   - Modifying rates: Permitted only for users with the `ADMIN` role or possessing the granular `CAN_MANAGE_RATES` permission (`can_manage_rates() = true`).
3. **Published Rate Protection:**
   - Database trigger or RLS policy prevents updating or deleting rows in `hotel_rate_sheets` where `status = 'PUBLISHED'`, enforcing version increments instead.
4. **Special Rates Creation:**
   - Sales staff may create `agency_special_rates` for negotiated deals without requiring prior admin approval, but deletions remain restricted to Admins.

---

## 2. Policy Matrix

| Table | Operation | Policy Name | Permitted Roles / Conditions |
|---|---|---|---|
| `hotel_rate_sheets` | SELECT | `rate_sheets_select_policy` | `public.is_active_employee()` |
| `hotel_rate_sheets` | INSERT | `rate_sheets_insert_policy` | `public.can_manage_rates()` |
| `hotel_rate_sheets` | UPDATE | `rate_sheets_update_policy` | `public.can_manage_rates() AND status != 'PUBLISHED'` |
| `hotel_rate_sheets` | DELETE | `rate_sheets_delete_policy` | `public.is_admin() AND status = 'DRAFT'` |
| `hotel_rate_components` | SELECT | `rate_components_select_policy` | `public.is_active_employee()` |
| `hotel_rate_components` | ALL | `rate_components_mutation_policy` | `public.can_manage_rates()` |
| `hotel_rate_outputs` | SELECT | `rate_outputs_select_policy` | `public.is_active_employee()` |
| `hotel_rate_outputs` | ALL | `rate_outputs_mutation_policy` | `public.can_manage_rates()` |
| `agency_special_rates` | SELECT | `special_rates_select_policy` | `public.is_active_employee()` |
| `agency_special_rates` | INSERT / UPDATE | `special_rates_write_policy` | `public.is_active_employee()` |
| `agency_special_rates` | DELETE | `special_rates_delete_policy` | `public.is_admin()` |

