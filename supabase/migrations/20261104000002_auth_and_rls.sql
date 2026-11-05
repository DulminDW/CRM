-- WINDOW COMPANIES CRM — PHASE 2B AUTH & RLS POLICIES
-- Depends on: 20261104000001_initial_schema.sql

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. ENUMS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('ADMIN', 'STAFF');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'permission_key') THEN
    CREATE TYPE public.permission_key AS ENUM (
      'CAN_MANAGE_RATES',
      'CAN_MANAGE_USERS',
      'CAN_CREATE_CHAT_GROUPS'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rate_tier') THEN
    CREATE TYPE public.rate_tier AS ENUM ('RED', 'GREEN', 'YELLOW');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quote_status') THEN
    CREATE TYPE public.quote_status AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_group_type') THEN
    CREATE TYPE public.chat_group_type AS ENUM ('DIRECT', 'TEAM', 'BROADCAST');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sales_activity_type') THEN
    CREATE TYPE public.sales_activity_type AS ENUM ('NOTE', 'CALL', 'MEETING', 'VOICE_NOTE');
  END IF;
END$$;


-- 4. HARDENED SECURITY DEFINER HELPER FUNCTIONS
-- ------------------------------------------------------------------------------

-- Restrict function execution from default public schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

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

REVOKE EXECUTE ON FUNCTION public.is_active_employee() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_manage_rates() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_active_employee() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_rates() TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. ENABLE ROW LEVEL SECURITY (RLS) ON AUTH TABLES
-- ------------------------------------------------------------------------------
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- user_profiles Policies
DROP POLICY IF EXISTS user_profiles_select_active_employees ON public.user_profiles;
CREATE POLICY user_profiles_select_active_employees
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_active_employee());

DROP POLICY IF EXISTS user_profiles_insert_admin_only ON public.user_profiles;
CREATE POLICY user_profiles_insert_admin_only
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS user_profiles_update_policy ON public.user_profiles;
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

DROP POLICY IF EXISTS user_profiles_delete_admin_only ON public.user_profiles;
CREATE POLICY user_profiles_delete_admin_only
  ON public.user_profiles
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- user_permissions Policies
DROP POLICY IF EXISTS user_permissions_select_active_employees ON public.user_permissions;
CREATE POLICY user_permissions_select_active_employees
  ON public.user_permissions
  FOR SELECT
  TO authenticated
  USING (public.is_active_employee());

DROP POLICY IF EXISTS user_permissions_insert_admin_only ON public.user_permissions;
CREATE POLICY user_permissions_insert_admin_only
  ON public.user_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS user_permissions_update_admin_only ON public.user_permissions;
CREATE POLICY user_permissions_update_admin_only
  ON public.user_permissions
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS user_permissions_delete_admin_only ON public.user_permissions;
CREATE POLICY user_permissions_delete_admin_only
  ON public.user_permissions
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

