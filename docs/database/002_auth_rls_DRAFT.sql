-- ==============================================================================
-- WINDOW COMPANIES CRM — PHASE 2B ROW LEVEL SECURITY (RLS) DRAFT POLICIES
-- ==============================================================================
-- Document Version: 2.0.0 (PHASE 2B PREPARATION DRAFT — DO NOT EXECUTE AUTOMATICALLY)
-- Status Date: November 04, 2026
-- Classification: Internal Confidential — Security Specification & Draft SQL
-- Target Database: Supabase PostgreSQL (Window Companies CRM)
--
-- IMPORTANT NOTICES & STRICT STOP BOUNDARIES:
-- 1. THIS SCRIPT IS A DRAFT FOR REVIEW ONLY. DO NOT EXECUTE AGAINST THE LIVE DATABASE.
-- 2. LIVE RLS MUST NOT BE ACTIVATED UNTIL REVIEWED AND APPROVED BY THE PROJECT OWNER.
-- 3. REQUIRES PRIOR EXECUTION OF docs/database/001_initial_schema_DRAFT.sql (26 TABLES).
-- 4. ALL POLICIES ENFORCE DEFAULT-DENY FOR UNAUTHENTICATED USERS.
-- 5. STAFF CANNOT PROMOTE THEMSELVES TO ADMIN.
-- ==============================================================================

-- ==============================================================================
-- SECTION 1: HARDENED SECURITY DEFINER HELPER FUNCTIONS
-- ==============================================================================

-- Restrict function execution from default public schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Helper 1: is_active_employee()
-- Verifies whether auth.uid() belongs to an active internal employee.
CREATE OR REPLACE FUNCTION public.is_active_employee()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT CASE 
    WHEN auth.uid() IS NULL THEN FALSE
    ELSE EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_active = TRUE
    )
  END;
$$;

-- Helper 2: is_admin()
-- Verifies whether auth.uid() is an active Administrator.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT CASE 
    WHEN auth.uid() IS NULL THEN FALSE
    ELSE EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'ADMIN' AND is_active = TRUE
    )
  END;
$$;

-- Helper 3: can_manage_rates()
-- Verifies whether auth.uid() is Admin OR an active Staff member with CAN_MANAGE_RATES.
CREATE OR REPLACE FUNCTION public.can_manage_rates()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT CASE 
    WHEN auth.uid() IS NULL THEN FALSE
    ELSE (
      public.is_admin() OR EXISTS (
        SELECT 1 
        FROM public.user_permissions p
        JOIN public.user_profiles u ON u.id = p.user_id
        WHERE p.user_id = auth.uid() 
          AND p.permission_key = 'CAN_MANAGE_RATES'
          AND u.is_active = TRUE
      )
    )
  END;
$$;

-- Restrict execution to authenticated users only
REVOKE EXECUTE ON FUNCTION public.is_active_employee() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_manage_rates() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_active_employee() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_rates() TO authenticated;

-- ==============================================================================
-- SECTION 2: ENABLE ROW LEVEL SECURITY ACROSS ALL PUBLIC TABLES
-- ==============================================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_rate_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_rate_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_rate_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_special_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_email_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_activity_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- SECTION 3: CORE AUTH & PERMISSION POLICIES (MODULE 1)
-- ==============================================================================

-- 3.1 Table: user_profiles
-- READ: Active employees can read employee profiles (needed for mentions, chat, and displays).
CREATE POLICY user_profiles_select_active_employees
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_active_employee());

-- INSERT: Only Admin can provision internal employee profiles.
CREATE POLICY user_profiles_insert_admin_only
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- UPDATE: Employees can update their own full_name, but CANNOT alter role or is_active.
-- Only Admin can update roles, status, and other employees.
CREATE POLICY user_profiles_update_policy
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin() OR id = auth.uid())
  WITH CHECK (
    public.is_admin() OR (
      id = auth.uid() AND
      role = (SELECT role FROM public.user_profiles WHERE id = auth.uid()) AND
      is_active = (SELECT is_active FROM public.user_profiles WHERE id = auth.uid())
    )
  );

-- DELETE: Only Admin can remove user profiles (constrained by ON DELETE RESTRICT).
CREATE POLICY user_profiles_delete_admin_only
  ON public.user_profiles
  FOR DELETE
  TO authenticated
  USING (public.is_admin());


-- 3.2 Table: user_permissions
-- READ: Active employees can view assigned permissions.
CREATE POLICY user_permissions_select_active_employees
  ON public.user_permissions
  FOR SELECT
  TO authenticated
  USING (public.is_active_employee());

-- WRITE (INSERT, UPDATE, DELETE): Strictly ADMIN ONLY.
-- Staff can NEVER grant or modify permissions for themselves or others.
CREATE POLICY user_permissions_insert_admin_only
  ON public.user_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY user_permissions_update_admin_only
  ON public.user_permissions
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY user_permissions_delete_admin_only
  ON public.user_permissions
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ==============================================================================
-- SECTION 4: RATE MANAGEMENT & SPECIAL RATES POLICIES (MODULE 4)
-- ==============================================================================

-- 4.1 Table: hotel_rate_sheets
-- READ: All active employees can read rate sheets to calculate quotes.
CREATE POLICY rate_sheets_select_active_employees
  ON public.hotel_rate_sheets
  FOR SELECT
  TO authenticated
  USING (public.is_active_employee());

-- WRITE: Only Admins or Staff with CAN_MANAGE_RATES can create or modify rate sheets.
CREATE POLICY rate_sheets_write_rate_managers
  ON public.hotel_rate_sheets
  FOR ALL
  TO authenticated
  USING (public.can_manage_rates())
  WITH CHECK (public.can_manage_rates());

-- 4.2 Table: agency_special_rates (Slots 1, 2, 3)
-- READ: All active employees can view special rates to prepare accurate quotes.
CREATE POLICY special_rates_select_active_employees
  ON public.agency_special_rates
  FOR SELECT
  TO authenticated
  USING (public.is_active_employee());

-- WRITE: Only Admins or Staff with CAN_MANAGE_RATES can create or edit special rates.
CREATE POLICY special_rates_write_rate_managers
  ON public.agency_special_rates
  FOR ALL
  TO authenticated
  USING (public.can_manage_rates())
  WITH CHECK (public.can_manage_rates());

-- ==============================================================================
-- SECTION 5: AUDIT LOGS IMMUTABILITY (MODULE 9)
-- ==============================================================================

-- All active employees can insert audit logs for trace events.
CREATE POLICY audit_logs_insert_active_employees
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_employee() AND (user_id IS NULL OR user_id = auth.uid()));

-- Only Admin can review audit logs.
CREATE POLICY audit_logs_select_admin_only
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- NO UPDATE OR DELETE ALLOWED (Append-only security log).

