-- ==============================================================================
-- WINDOW COMPANIES MANAGEMENT SYSTEM — MIGRATION 17: ADD DEPARTMENT TO USER PROFILES
-- ==============================================================================
-- Migration Name: 20261111000017_add_department_to_user_profiles.sql
-- Description:
--   Adds the 'department' column to public.user_profiles to support organizational
--   grouping (e.g., 'OPERATIONS', 'SALES & MARKETING', 'CONTRACTING', 'MANAGEMENT')
--   across Employee Directory, Daily Tasks, and Internal Team Chat.
-- ==============================================================================

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'OPERATIONS';

COMMENT ON COLUMN public.user_profiles.department IS 'Employee department/division for task assignment and organizational scoping.';

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

