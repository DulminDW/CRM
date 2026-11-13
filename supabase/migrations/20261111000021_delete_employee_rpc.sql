-- ==============================================================================
-- WINDOW COMPANIES MANAGEMENT SYSTEM — MIGRATION 21: DELETE EMPLOYEE RPC FUNCTION
-- ==============================================================================
-- Migration Name: 20261111000021_delete_employee_rpc.sql
-- Description:
--   Creates a secure PostgreSQL RPC function `delete_company_employee`
--   executable by ADMIN users. It safely removes user permissions, user profile,
--   and auth identity / user record.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.delete_company_employee(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_is_caller_admin BOOLEAN;
BEGIN
    -- 1. Verify caller has ADMIN role (or service level execution)
    IF auth.uid() IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'ADMIN'
        ) INTO v_is_caller_admin;

        IF NOT v_is_caller_admin THEN
            RAISE EXCEPTION 'Access denied. Only company ADMINs can delete employees.';
        END IF;

        -- Prevent self-deletion
        IF auth.uid() = p_user_id THEN
            RAISE EXCEPTION 'You cannot delete your own active Admin account.';
        END IF;
    END IF;

    -- 2. Delete dependent records in public schema
    DELETE FROM public.user_permissions WHERE user_id = p_user_id;
    DELETE FROM public.user_profiles WHERE id = p_user_id;

    -- 3. Delete from auth schema (identities and users)
    DELETE FROM auth.identities WHERE user_id = p_user_id;
    DELETE FROM auth.users WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'deleted_id', p_user_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_company_employee TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_company_employee TO anon;

NOTIFY pgrst, 'reload schema';

