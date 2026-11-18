-- ==============================================================================
-- WINDOW COMPANIES MANAGEMENT SYSTEM — MIGRATION 32: ENHANCE DELETE EMPLOYEE RPC
-- ==============================================================================
-- Description:
--   Updates `delete_company_employee` to cascade-delete or reassign dependent records
--   such as sales_activities, agency_visits, tasks, and audit references so that
--   deleting a test employee never triggers FK constraint violations.
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

    -- 2. Clean up or cascade dependent operational activity records
    -- Delete salesman visits & attachments
    DELETE FROM public.agency_visit_hotels WHERE visit_id IN (SELECT id FROM public.agency_visits WHERE salesman_id = p_user_id);
    DELETE FROM public.agency_visits WHERE salesman_id = p_user_id;

    DELETE FROM public.sales_activity_attachments WHERE activity_id IN (SELECT id FROM public.sales_activities WHERE staff_id = p_user_id);
    DELETE FROM public.sales_activities WHERE staff_id = p_user_id;

    -- Delete daily task assignments, comments, and activities
    DELETE FROM public.task_comments WHERE author_id = p_user_id OR task_id IN (SELECT id FROM public.tasks WHERE assigned_to = p_user_id OR assigned_by = p_user_id);
    DELETE FROM public.task_activities WHERE actor_id = p_user_id OR task_id IN (SELECT id FROM public.tasks WHERE assigned_to = p_user_id OR assigned_by = p_user_id);
    DELETE FROM public.tasks WHERE assigned_to = p_user_id OR assigned_by = p_user_id;

    -- Delete chat participation
    DELETE FROM public.chat_read_receipts WHERE user_id = p_user_id;
    DELETE FROM public.chat_mentions WHERE mentioned_user_id = p_user_id;
    DELETE FROM public.chat_messages WHERE sender_id = p_user_id;
    DELETE FROM public.chat_group_members WHERE user_id = p_user_id;

    -- Delete user permissions
    DELETE FROM public.user_permissions WHERE user_id = p_user_id OR granted_by = p_user_id;

    -- Reassign / nullify audit and history logs to avoid FK block
    UPDATE public.audit_logs SET actor_id = NULL WHERE actor_id = p_user_id;
    UPDATE public.admin_activity_logs SET actor_id = NULL WHERE actor_id = p_user_id;

    -- 3. Delete user profile
    DELETE FROM public.user_profiles WHERE id = p_user_id;

    -- 4. Delete auth credentials
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
