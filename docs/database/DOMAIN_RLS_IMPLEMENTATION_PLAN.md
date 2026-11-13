# WINDOW COMPANIES CRM — DOMAIN RLS IMPLEMENTATION PLAN

**Document Version:** 1.0.0  
**Date:** November 04, 2026  
**Status:** DRAFT SPECIFICATION (AWAITING REVIEW BEFORE DEPLOYMENT)  
**Target:** WINDOW COMPANIES CRM (`fvxtnitlsbzmcuphefmv`)  

---

## 1. Architectural Principles & Security Boundaries

1. **Default-Deny:** Every domain table must execute `ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;`.
2. **Employee Authentication:** Anonymous (`anon`) role has zero access to any CRM domain table.
3. **Active Status Verification:** Only active employees (`public.is_active_employee() = true`) can read or write data. Deactivated employees are instantly denied at the database level.
4. **Role Differentiation:**
   - **ADMIN:** Unrestricted administrative oversight across all domain models.
   - **STAFF:** Read and operational access to CRM records (agencies, markets, quotes, communications).
   - **RATES RESTRICTION:** Rate sheets, base pricing components, and special rates write actions are strictly restricted to users satisfying `public.can_manage_rates()`.
5. **Ownership & Collaboration:**
   - Quotes and Sales Activities track `created_by` / `assigned_to`.
   - Team chat access is scoped to memberships in `chat_group_members`.

---

## 2. Table-by-Table Policy Specification (24 Domain Tables)

### Module 2: Travel Agencies, Markets & Members (3 Tables)
1. **`public.travel_agencies`**
   - SELECT: `is_active_employee()`
   - INSERT: `is_active_employee()`
   - UPDATE: `is_active_employee()`
   - DELETE: `is_admin()`
2. **`public.agency_markets`**
   - SELECT: `is_active_employee()`
   - INSERT: `is_active_employee()`
   - UPDATE: `is_active_employee()`
   - DELETE: `is_admin()`
3. **`public.agency_members`**
   - SELECT: `is_active_employee()`
   - INSERT: `is_active_employee()`
   - UPDATE: `is_active_employee()`
   - DELETE: `is_admin()`

### Module 3: Hotels & Seasons (2 Tables)
4. **`public.hotels`**
   - SELECT: `is_active_employee()`
   - INSERT / UPDATE / DELETE: `is_admin()` (Hotel properties are fixed master entities)
5. **`public.hotel_seasons`**
   - SELECT: `is_active_employee()`
   - INSERT / UPDATE / DELETE: `can_manage_rates()`

### Module 4: Hotel Rate Sheets & Outputs (4 Tables)
6. **`public.hotel_rate_sheets`**
   - SELECT: `is_active_employee()`
   - INSERT / UPDATE / DELETE: `can_manage_rates()`
7. **`public.hotel_rate_components`**
   - SELECT: `is_active_employee()`
   - INSERT / UPDATE / DELETE: `can_manage_rates()`
8. **`public.hotel_rate_outputs`**
   - SELECT: `is_active_employee()`
   - INSERT / UPDATE / DELETE: `can_manage_rates()`
9. **`public.agency_special_rates`**
   - SELECT: `is_active_employee()`
   - INSERT / UPDATE / DELETE: `can_manage_rates()`

### Module 5: Quotations & Recipients (4 Tables)
10. **`public.quotes`**
    - SELECT: `is_active_employee()`
    - INSERT: `is_active_employee()` (WITH CHECK: `created_by = auth.uid()`)
    - UPDATE: `is_admin() OR (is_active_employee() AND created_by = auth.uid())`
    - DELETE: `is_admin()`
11. **`public.quote_recipients`**
    - SELECT: `is_active_employee()`
    - INSERT / UPDATE: `is_active_employee()`
    - DELETE: `is_admin()`
12. **`public.quote_items`**
    - SELECT: `is_active_employee()`
    - INSERT / UPDATE: `is_active_employee()`
    - DELETE: `is_admin()`
13. **`public.quote_email_attempts`**
    - SELECT: `is_active_employee()`
    - INSERT: `is_active_employee()`
    - UPDATE / DELETE: `is_admin()`

### Module 6: Sales Team & Distribution (2 Tables)
14. **`public.sales_team_memberships`**
    - SELECT: `is_active_employee()`
    - INSERT / UPDATE / DELETE: `is_admin()`
15. **`public.notifications`**
    - SELECT: `is_active_employee() AND user_id = auth.uid()`
    - INSERT: `is_active_employee()`
    - UPDATE: `user_id = auth.uid()` (e.g. marking read)
    - DELETE: `user_id = auth.uid() OR is_admin()`

### Module 7: Sales Activities & Notes (2 Tables)
16. **`public.sales_activities`**
    - SELECT: `is_active_employee()`
    - INSERT: `is_active_employee() AND logged_by = auth.uid()`
    - UPDATE: `is_admin() OR (is_active_employee() AND logged_by = auth.uid())`
    - DELETE: `is_admin()`
17. **`public.sales_activity_attachments`**
    - SELECT: `is_active_employee()`
    - INSERT: `is_active_employee()`
    - DELETE: `is_admin()`

### Module 8: Internal Team Chat (6 Tables)
18. **`public.chat_groups`**
    - SELECT: `is_admin() OR EXISTS (SELECT 1 FROM public.chat_group_members WHERE group_id = id AND user_id = auth.uid())`
    - INSERT: `is_admin() OR EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND permission_key = 'CAN_CREATE_CHAT_GROUPS')`
    - UPDATE: `is_admin() OR created_by = auth.uid()`
    - DELETE: `is_admin()`
19. **`public.chat_group_members`**
    - SELECT: Scoped to members of group or admin
    - INSERT / DELETE: Admin or group creator
20. **`public.chat_messages`**
    - SELECT: Scoped to group members
    - INSERT: Group member AND `sender_id = auth.uid()`
    - UPDATE: Sender only (edit message) or admin
    - DELETE: Sender only or admin
21. **`public.chat_message_attachments`**
    - SELECT: Scoped to group members
    - INSERT: Message sender
    - DELETE: Message sender or admin
22. **`public.chat_message_mentions`**
    - SELECT: Scoped to group members
    - INSERT: Message sender
23. **`public.chat_read_receipts`**
    - SELECT: Scoped to group members
    - INSERT / UPDATE: `user_id = auth.uid()`

### Module 9: Audit Trail (1 Table)
24. **`public.audit_logs`**
    - SELECT: `is_admin()` (Staff cannot read audit trails)
    - INSERT: `is_active_employee() OR auth.uid() IS NOT NULL`
    - UPDATE / DELETE: FORBIDDEN (Append-only immutable audit trail)

---

## 3. Deployment Safety Protocol

- This specification will be packaged as `20261104000006_domain_rls_policies.sql` during Phase 3 module implementation.
- Zero changes are applied immediately to avoid disrupting in-progress schema validation.

