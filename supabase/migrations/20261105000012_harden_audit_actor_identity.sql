-- ==============================================================================
-- WINDOW COMPANIES MANAGEMENT SYSTEM — DRAFT MIGRATION: HARDEN AUDIT ACTOR IDENTITY
-- ==============================================================================
-- Migration Name: 20261105000012_harden_audit_actor_identity.sql
-- Description: Hardens audit_logs and rate_calculation_setups against actor/creator
--              spoofing. Derives actor identity from auth.uid() at database level,
--              protects created_by immutability on UPDATE, and guards trigger integrity.
-- Status: DRAFT SPECIFICATION ONLY — DO NOT DEPLOY TO LIVE SUPABASE IN THIS PHASE
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Function: enforce_audit_actor_identity()
-- ------------------------------------------------------------------------------
-- Trigger function executed BEFORE INSERT on public.audit_logs.
-- Derives actor_id strictly from auth.uid() for authenticated users.
-- Prevents clients from spoofing another staff member or admin in actor_id.
-- Safely permits internal system triggers (where auth.uid() is null but actor_id is valid).
CREATE OR REPLACE FUNCTION public.enforce_audit_actor_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_session_uid UUID := auth.uid();
  v_is_active BOOLEAN;
BEGIN
  -- Case A: Standard client PostgREST/authenticated session insert
  IF v_session_uid IS NOT NULL THEN
    -- Verify that the session user exists and is an active employee
    SELECT is_active INTO v_is_active
    FROM public.user_profiles
    WHERE id = v_session_uid;

    IF v_is_active IS NOT TRUE THEN
      RAISE EXCEPTION 'Audit insertion rejected: authenticated actor is inactive or missing.'
        USING ERRCODE = '42501';
    END IF;

    -- HARDENED DERIVATION: Disregard any client-supplied actor_id and bind to authenticated user
    NEW.actor_id := v_session_uid;

  -- Case B: Internal system trigger execution (e.g. auth trigger, migration bootstrap)
  -- In this case, auth.uid() may be NULL (system context), but actor_id MUST reference a valid profile
  ELSE
    IF NEW.actor_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = NEW.actor_id) THEN
        RAISE EXCEPTION 'Audit insertion rejected: system-supplied actor_id does not exist.'
          USING ERRCODE = '23503';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_audit_actor_identity() IS
  'BEFORE INSERT trigger enforcing authenticated actor_id derivation from auth.uid(), preventing actor spoofing.';

-- ------------------------------------------------------------------------------
-- 2. Trigger on audit_logs
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_enforce_audit_actor ON public.audit_logs;
CREATE TRIGGER trg_enforce_audit_actor
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_audit_actor_identity();

-- ------------------------------------------------------------------------------
-- 3. Harden audit_logs INSERT Policy
-- ------------------------------------------------------------------------------
-- Ensure only active employees or system triggers can insert audit logs
DROP POLICY IF EXISTS audit_logs_insert_system ON public.audit_logs;
CREATE POLICY audit_logs_insert_hardened ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Authenticated actor must match session uid or be an active employee
    auth.uid() IS NOT NULL AND public.is_active_employee()
  );

-- ------------------------------------------------------------------------------
-- 4. Function: enforce_rate_setup_creator_identity()
-- ------------------------------------------------------------------------------
-- Trigger function executed BEFORE INSERT OR UPDATE on public.rate_calculation_setups.
-- 1. On INSERT: Binds created_by strictly to auth.uid().
-- 2. On UPDATE: Prohibits changing created_by, ensuring original authorship is immutable.
CREATE OR REPLACE FUNCTION public.enforce_rate_setup_creator_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_session_uid UUID := auth.uid();
BEGIN
  -- Gated: session must have rate management rights
  IF NOT public.can_manage_rates() THEN
    RAISE EXCEPTION 'Rate calculation setup modification denied: insufficient permissions.'
      USING ERRCODE = '42501';
  END IF;

  -- INSERT: Enforce that created_by is strictly the authenticated session user
  IF TG_OP = 'INSERT' THEN
    IF v_session_uid IS NOT NULL THEN
      NEW.created_by := v_session_uid;
    END IF;

  -- UPDATE: Make created_by immutable (cannot transfer ownership or spoof creator on update)
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'Security violation: created_by identity on rate_calculation_setups is immutable.'
        USING ERRCODE = '42501';
    END IF;
    -- Bump updated_at automatically
    NEW.updated_at := CURRENT_TIMESTAMP;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_rate_setup_creator_identity() IS
  'Trigger enforcing creator_by derivation from auth.uid() on INSERT and immutability on UPDATE.';

-- ------------------------------------------------------------------------------
-- 5. Trigger on rate_calculation_setups
-- ------------------------------------------------------------------------------
-- Applies to rate_calculation_setups once table is created (from migration 000011)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'rate_calculation_setups'
  ) THEN
    DROP TRIGGER IF EXISTS trg_enforce_rate_setup_creator ON public.rate_calculation_setups;
    CREATE TRIGGER trg_enforce_rate_setup_creator
      BEFORE INSERT OR UPDATE ON public.rate_calculation_setups
      FOR EACH ROW
      EXECUTE FUNCTION public.enforce_rate_setup_creator_identity();
  END IF;
END $$;

