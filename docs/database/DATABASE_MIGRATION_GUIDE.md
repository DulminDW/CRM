# WINDOW COMPANIES CRM — DATABASE MIGRATION & RLS POLICY GUIDE

**Document Version:** 2.0.0  
**Classification:** Database Architecture & Migration Standard Operating Procedure  

---

## 1. Migration History & Sequential Order

The database uses transactional, sequential Supabase migrations located in `supabase/migrations/`:

1. `20261104000001_initial_schema.sql`: Master 26-table schema with extensions and foreign keys.
2. `20261104000002_auth_and_rls.sql`: Core enums, helper functions, and user profile/permission RLS policies.
3. `20261104000003_bootstrap_initial_admin.sql`: Administrative bootstrap DO block.
4. `20261104000004_admin_provisioning_trigger.sql`: Basic automated trigger.
5. `20261104000005_hardened_admin_trigger.sql`: Hardened, confirmation-aware case-insensitive provisioning trigger.
6. `20261104000006_domain_rls_policies.sql`: Comprehensive domain RLS policies across all remaining 24 tables.

---

## 2. Policy Enforcement & Function Reference

- `public.is_active_employee()`: Verifies `auth.uid()` corresponds to an active record in `user_profiles`.
- `public.is_admin()`: Verifies `auth.uid()` has `role = 'ADMIN'` and is active.
- `public.can_manage_rates()`: Verifies Admin role or active assignment of `CAN_MANAGE_RATES` permission.

