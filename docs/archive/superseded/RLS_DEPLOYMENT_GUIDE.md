# WINDOW COMPANIES CRM — RLS DEPLOYMENT GUIDE

**Document Version:** 1.0.0  
**Date:** November 04, 2026  
**Target:** Supabase PostgreSQL Database  

---

## 1. Migration Deployment Sequence

Deploy the database schemas and Row Level Security policies in strict sequence:

### Sequence Order:
1. **Full Domain Schema:** `docs/database/001_initial_schema_DRAFT.sql`
   - Provisions all 26 application tables (Agencies, Markets, Contacts, Hotels, Rates, Quotes, Chats, Audit Logs).
2. **Consolidated Auth & RLS Policies:** `docs/database/003_phase2b_auth_and_schema.sql` (or `docs/database/002_auth_rls_DRAFT.sql`)
   - Enforces `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
   - Installs hardened `SECURITY DEFINER` functions (`is_active_employee()`, `is_admin()`, `can_manage_rates()`).
   - Activates default-deny policies for `user_profiles` and `user_permissions`.
3. **Admin Bootstrap:** Execute `docs/project/ADMIN_BOOTSTRAP_GUIDE.md`.

---

## 2. Deployment Instructions via Supabase SQL Editor

1. Open your **Supabase Dashboard**: `https://supabase.com/dashboard/project/<your-project-id>`
2. Click **SQL Editor** from the left navigation panel.
3. Click **New query**.
4. Copy the entire contents of [`docs/database/001_initial_schema_DRAFT.sql`](file:///c:/Users/Nethshan%20Dulmin/Desktop/CRM/docs/database/001_initial_schema_DRAFT.sql).
5. Paste into the SQL editor and click **Run**. Verify `Success. No rows returned`.
6. Click **New query**.
7. Copy the entire contents of [`docs/database/003_phase2b_auth_and_schema.sql`](file:///c:/Users/Nethshan%20Dulmin/Desktop/CRM/docs/database/003_phase2b_auth_and_schema.sql).
8. Paste and click **Run**. Verify `Success. No rows returned`.
9. Verify under **Table Editor** that `user_profiles` and `user_permissions` have the RLS shield icon enabled.

