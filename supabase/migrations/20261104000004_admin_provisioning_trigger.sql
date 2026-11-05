-- WINDOW COMPANIES CRM — AUTOMATIC ADMIN PROFILE PROVISIONING TRIGGER
-- Ensures when techwindow@gmail.com signs up or is created in auth.users,
-- the user_profile with role 'ADMIN' and full permissions is immediately generated.

CREATE OR REPLACE FUNCTION public.handle_admin_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.email = 'techwindow@gmail.com' THEN
    INSERT INTO public.user_profiles (id, full_name, role, is_active)
    VALUES (NEW.id, 'System Administrator', 'ADMIN', TRUE)
    ON CONFLICT (id) DO UPDATE
    SET role = 'ADMIN', is_active = TRUE;

    INSERT INTO public.user_permissions (user_id, permission_key, granted_by)
    VALUES 
      (NEW.id, 'CAN_MANAGE_RATES', NEW.id),
      (NEW.id, 'CAN_MANAGE_USERS', NEW.id),
      (NEW.id, 'CAN_CREATE_CHAT_GROUPS', NEW.id)
    ON CONFLICT (user_id, permission_key) DO NOTHING;

    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
    VALUES (
      NEW.id,
      'ADMIN_AUTO_PROVISIONED',
      'user_profiles',
      NEW.id,
      jsonb_build_object('role', 'ADMIN', 'email', NEW.email, 'is_active', true)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_admin_auth_user();

