-- ==============================================================================
-- WINDOW COMPANIES MANAGEMENT SYSTEM — MIGRATION 18: PROVISION EMPLOYEE RPC FUNCTION
-- ==============================================================================
-- Migration Name: 20261111000018_provision_employee_rpc.sql
-- Description:
--   Creates a secure PostgreSQL RPC function `provision_company_employee`
--   executable by ADMIN users. It creates the authentication user in auth.users
--   and the associated profile in public.user_profiles atomically, satisfying
--   the foreign key constraint user_profiles.id -> auth.users.id.
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
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_password TEXT;
    v_encrypted_pw TEXT;
    v_is_caller_admin BOOLEAN;
    v_now TIMESTAMPTZ := CURRENT_TIMESTAMP;
BEGIN
    -- 1. Verify caller has ADMIN role (or is initial setup)
    SELECT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'ADMIN'
    ) INTO v_is_caller_admin;

    -- If there are existing profiles, require admin check
    IF EXISTS (SELECT 1 FROM public.user_profiles) AND NOT v_is_caller_admin THEN
        RAISE EXCEPTION 'Access denied. Only company ADMINs can provision employees.';
    END IF;

    -- 2. Validate input parameters
    p_email := lower(trim(p_email));
    p_full_name := trim(p_full_name);

    IF p_email IS NULL OR p_email = '' THEN
        RAISE EXCEPTION 'Email is required.';
    END IF;

    IF p_full_name IS NULL OR p_full_name = '' THEN
        RAISE EXCEPTION 'Full name is required.';
    END IF;

    -- 3. Check if user already exists in auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = p_email;

    IF v_user_id IS NOT NULL THEN
        -- Auth user exists, update/insert user_profiles
        INSERT INTO public.user_profiles (id, full_name, role, department, is_active, updated_at)
        VALUES (v_user_id, p_full_name, p_role, p_department, TRUE, v_now)
        ON CONFLICT (id) DO UPDATE
        SET full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            department = EXCLUDED.department,
            is_active = TRUE,
            updated_at = v_now;
    ELSE
        -- 4. Create new user in auth.users
        v_user_id := gen_random_uuid();
        v_password := COALESCE(p_temporary_password, 'WindowPass2026!');
        v_encrypted_pw := crypt(v_password, gen_salt('bf'));

        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
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
            v_now, -- Auto-confirmed so employee can sign in immediately
            jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
            jsonb_build_object('full_name', p_full_name, 'department', p_department, 'role', p_role),
            v_now,
            v_now
        );

        -- Insert auth identity for password provider
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            v_user_id,
            jsonb_build_object('sub', v_user_id::text, 'email', p_email),
            'email',
            v_now,
            v_now,
            v_now
        );

        -- Insert profile
        INSERT INTO public.user_profiles (id, full_name, role, department, is_active, created_at, updated_at)
        VALUES (v_user_id, p_full_name, p_role, p_department, TRUE, v_now, v_now);
    END IF;

    -- 5. Manage granular rate permission
    IF p_can_manage_rates THEN
        INSERT INTO public.user_permissions (user_id, permission_key, granted_by)
        VALUES (v_user_id, 'CAN_MANAGE_RATES', COALESCE(auth.uid(), v_user_id))
        ON CONFLICT (user_id, permission_key) DO NOTHING;
    ELSE
        DELETE FROM public.user_permissions
        WHERE user_id = v_user_id AND permission_key = 'CAN_MANAGE_RATES';
    END IF;

    -- 6. Return created profile summary
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

GRANT EXECUTE ON FUNCTION public.provision_company_employee TO authenticated;
GRANT EXECUTE ON FUNCTION public.provision_company_employee TO anon;

NOTIFY pgrst, 'reload schema';

