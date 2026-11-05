-- WINDOW COMPANIES CRM — PROVISION CONFIRMED INITIAL ADMIN
-- Targets: techwindow@gmail.com
-- Migration Version: 20261104000003_bootstrap_initial_admin.sql

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Look up the Auth user ID for the confirmed owner email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'techwindow@gmail.com'
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Upsert the employee profile with ADMIN role
    INSERT INTO public.user_profiles (id, full_name, role, is_active)
    VALUES (
      v_user_id,
      'System Administrator',
      'ADMIN',
      TRUE
    )
    ON CONFLICT (id) DO UPDATE
    SET role = 'ADMIN', is_active = TRUE, updated_at = CURRENT_TIMESTAMP;

    -- Grant full standard administrative permissions
    INSERT INTO public.user_permissions (user_id, permission_key, granted_by)
    VALUES 
      (v_user_id, 'CAN_MANAGE_RATES', v_user_id),
      (v_user_id, 'CAN_MANAGE_USERS', v_user_id),
      (v_user_id, 'CAN_CREATE_CHAT_GROUPS', v_user_id)
    ON CONFLICT (user_id, permission_key) DO NOTHING;

    -- Record in audit log
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
    VALUES (
      v_user_id,
      'ADMIN_BOOTSTRAP',
      'user_profiles',
      v_user_id,
      jsonb_build_object('role', 'ADMIN', 'email', 'techwindow@gmail.com', 'is_active', true)
    );
  END IF;
END$$;

