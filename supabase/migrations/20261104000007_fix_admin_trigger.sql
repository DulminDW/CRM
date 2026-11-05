-- ==============================================================================
-- WINDOW COMPANIES CRM — SURGICAL FIX FOR ADMIN PROVISIONING TRIGGER
-- Migration: 20261104000007_fix_admin_trigger.sql
-- Fixes:
-- 1. Aligns audit_logs INSERT with actual schema: actor_id, target_table, target_record_id, action = 'INSERT'
-- 2. Preserves case-insensitive email match: lower(trim(email)) = 'techwindow@gmail.com'
-- 3. Preserves email confirmation requirement: email_confirmed_at IS NOT NULL
-- 4. Preserves SECURITY DEFINER and search_path = public, pg_temp
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_admin_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target_email TEXT := 'techwindow@gmail.com';
BEGIN
  -- Verify target email matches case-insensitively AND email is confirmed
  IF lower(trim(COALESCE(NEW.email, ''))) = v_target_email AND NEW.email_confirmed_at IS NOT NULL THEN
    
    -- Insert or update user profile with ADMIN role
    INSERT INTO public.user_profiles (id, full_name, role, is_active)
    VALUES (NEW.id, 'System Administrator', 'ADMIN', TRUE)
    ON CONFLICT (id) DO UPDATE
    SET role = 'ADMIN', is_active = TRUE, updated_at = CURRENT_TIMESTAMP;

    -- Grant full standard administrative permissions idempotently
    INSERT INTO public.user_permissions (user_id, permission_key, granted_by)
    VALUES 
      (NEW.id, 'CAN_MANAGE_RATES', NEW.id),
      (NEW.id, 'CAN_MANAGE_USERS', NEW.id),
      (NEW.id, 'CAN_CREATE_CHAT_GROUPS', NEW.id)
    ON CONFLICT (user_id, permission_key) DO NOTHING;

    -- Audit log the secure initialization using exact audit_logs schema:
    -- Columns: actor_id, action (must match chk_audit_action), target_table, target_record_id, new_values
    INSERT INTO public.audit_logs (actor_id, action, target_table, target_record_id, new_values)
    VALUES (
      NEW.id,
      'INSERT',
      'user_profiles',
      NEW.id,
      jsonb_build_object(
        'role', 'ADMIN', 
        'event', 'ADMIN_CONFIRMED_PROVISIONED',
        'email', NEW.email, 
        'email_confirmed_at', NEW.email_confirmed_at,
        'is_active', true
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Restrict function execution
REVOKE EXECUTE ON FUNCTION public.handle_admin_auth_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_admin_auth_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_admin_auth_user() FROM anon;

-- Ensure trigger is active for both INSERT and confirmation UPDATE
DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_confirmed_admin ON auth.users;

CREATE TRIGGER on_auth_user_confirmed_admin
  AFTER INSERT OR UPDATE OF email_confirmed_at, email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_admin_auth_user();

