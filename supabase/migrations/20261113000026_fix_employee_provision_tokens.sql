-- ==============================================================================
-- WINDOW COMPANIES MANAGEMENT SYSTEM — MIGRATION 26: FIX PROVISION EMPLOYEE SCHEMA COMPLIANCE
-- ==============================================================================
-- Migration Name: 20261113000026_fix_employee_provision_tokens.sql
-- Description:
--   Ensures new employees created via provision_company_employee have empty-string
--   tokens ('') rather than NULL in auth.users, matching Supabase Auth GoTrue 
--   Postgres schema expectations (avoiding "Database error querying schema" on login).
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.provision_company_employee(
    p_email TEXT,
    p_full_name TEXT,
    p_role TEXT DEFAULT 'STAFF',
    p_department TEXT DEFAULT 'OPERATIONS',
    p_can_manage_rates BOOLEAN DEFAULT FALSE,
    p_temporary_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_password TEXT;
    v_encrypted_pw TEXT;
    v_now TIMESTAMPTZ := CURRENT_TIMESTAMP;
BEGIN
    p_email := lower(trim(p_email));
    p_full_name := trim(p_full_name);

    IF p_email IS NULL OR p_email = '' THEN
        RAISE EXCEPTION 'Email is required.';
    END IF;

    IF p_full_name IS NULL OR p_full_name = '' THEN
        RAISE EXCEPTION 'Full name is required.';
    END IF;

    SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = p_email;

    IF v_user_id IS NOT NULL THEN
        -- If password update requested for existing employee
        IF p_temporary_password IS NOT NULL AND trim(p_temporary_password) <> '' THEN
            v_encrypted_pw := extensions.crypt(trim(p_temporary_password), extensions.gen_salt('bf', 10));
            UPDATE auth.users
            SET encrypted_password = v_encrypted_pw,
                confirmation_token = COALESCE(confirmation_token, ''),
                recovery_token = COALESCE(recovery_token, ''),
                email_change = COALESCE(email_change, ''),
                email_change_token_new = COALESCE(email_change_token_new, ''),
                phone_change = COALESCE(phone_change, ''),
                phone_change_token = COALESCE(phone_change_token, ''),
                email_change_token_current = COALESCE(email_change_token_current, ''),
                reauthentication_token = COALESCE(reauthentication_token, ''),
                updated_at = v_now
            WHERE id = v_user_id;
        ELSE
            UPDATE auth.users
            SET confirmation_token = COALESCE(confirmation_token, ''),
                recovery_token = COALESCE(recovery_token, ''),
                email_change = COALESCE(email_change, ''),
                email_change_token_new = COALESCE(email_change_token_new, ''),
                phone_change = COALESCE(phone_change, ''),
                phone_change_token = COALESCE(phone_change_token, ''),
                email_change_token_current = COALESCE(email_change_token_current, ''),
                reauthentication_token = COALESCE(reauthentication_token, ''),
                updated_at = v_now
            WHERE id = v_user_id;
        END IF;

        INSERT INTO public.user_profiles (id, full_name, role, department, is_active, updated_at)
        VALUES (v_user_id, p_full_name, p_role, p_department, TRUE, v_now)
        ON CONFLICT (id) DO UPDATE
        SET full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            department = EXCLUDED.department,
            is_active = TRUE,
            updated_at = v_now;
    ELSE
        v_user_id := gen_random_uuid();
        v_password := COALESCE(p_temporary_password, 'WindowPass2026!');
        v_encrypted_pw := extensions.crypt(v_password, extensions.gen_salt('bf', 10));

        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            confirmed_at,
            confirmation_token,
            recovery_token,
            email_change,
            email_change_token_new,
            phone_change,
            phone_change_token,
            email_change_token_current,
            reauthentication_token,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_user_id,
            'authenticated',
            'authenticated',
            p_email,
            v_encrypted_pw,
            v_now,
            v_now,
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
            jsonb_build_object('full_name', p_full_name, 'department', p_department, 'role', p_role),
            v_now,
            v_now
        );

        INSERT INTO auth.identities (
            id,
            provider_id,
            user_id,
            identity_data,
            provider,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            v_user_id::text,
            v_user_id,
            jsonb_build_object('sub', v_user_id::text, 'email', p_email, 'email_verified', true),
            'email',
            v_now,
            v_now,
            v_now
        );

        INSERT INTO public.user_profiles (id, full_name, role, department, is_active, created_at, updated_at)
        VALUES (v_user_id, p_full_name, p_role, p_department, TRUE, v_now, v_now)
        ON CONFLICT (id) DO UPDATE
        SET full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            department = EXCLUDED.department,
            is_active = TRUE,
            updated_at = v_now;
    END IF;

    IF p_can_manage_rates THEN
        INSERT INTO public.user_permissions (user_id, permission_key, granted_by)
        VALUES (v_user_id, 'CAN_MANAGE_RATES', v_user_id)
        ON CONFLICT (user_id, permission_key) DO NOTHING;
    ELSE
        DELETE FROM public.user_permissions
        WHERE user_id = v_user_id AND permission_key = 'CAN_MANAGE_RATES';
    END IF;

    RETURN jsonb_build_object(
        'id', v_user_id,
        'email', p_email,
        'full_name', p_full_name,
        'role', p_role,
        'department', p_department,
        'is_active', true
    );
END;
$$;

NOTIFY pgrst, 'reload schema';

