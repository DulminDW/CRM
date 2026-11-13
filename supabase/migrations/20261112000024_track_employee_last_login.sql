-- ==============================================================================
-- WINDOW COMPANIES MANAGEMENT SYSTEM — MIGRATION 24: EMPLOYEE LAST LOGIN TRACKING
-- ==============================================================================
-- Migration Name: 20261112000024_track_employee_last_login.sql
-- Description:
--   Adds `last_login_at` to public.user_profiles and creates a secure function
--   `record_employee_login` to track when employees sign in.
-- ==============================================================================

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

COMMENT ON COLUMN public.user_profiles.last_login_at IS 'Timestamp of the employee most recent login to the CRM.';

-- Function to record employee login securely
CREATE OR REPLACE FUNCTION public.record_employee_login(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.user_profiles
  SET last_login_at = CURRENT_TIMESTAMP
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_employee_login TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_employee_login TO anon;

NOTIFY pgrst, 'reload schema';

