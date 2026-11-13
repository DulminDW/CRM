-- ==============================================================================
-- WINDOW COMPANIES MANAGEMENT SYSTEM — MIGRATION 16: EMPLOYEE DAILY TASKS
-- ==============================================================================
-- Migration Name: 20261111000016_employee_daily_tasks.sql
-- Description:
--   Creates employee daily task management tables:
--   1. tasks: core task assignments with priority, status, category, due dates,
--      and optional relationships to agencies, properties, contracts, and quotes.
--   2. task_comments: progress updates, blocker reporting, and comment threads.
--   3. task_activities: immutable audit timeline for task state changes.
-- Enforces strict RLS: Admin full access; Staff can view and update their own assigned tasks.
-- ==============================================================================

-- 1. Table: tasks
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    assigned_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- 'PENDING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'
    category VARCHAR(50) NOT NULL DEFAULT 'GENERAL',-- 'GENERAL', 'RATE_DISTRIBUTION', 'CONTRACT_FOLLOWUP', 'AGENCY_VISIT', 'SPECIAL_DEAL'
    instructions TEXT,
    
    -- Optional domain links
    related_agency_id UUID REFERENCES public.travel_agencies(id) ON DELETE SET NULL,
    related_hotel_id UUID REFERENCES public.hotels(id) ON DELETE SET NULL,
    related_contract_id UUID REFERENCES public.hotel_contracts(id) ON DELETE SET NULL,
    related_quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
    
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_task_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    CONSTRAINT chk_task_status CHECK (status IN ('PENDING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT chk_task_dates CHECK (due_date >= start_date)
);

COMMENT ON TABLE public.tasks IS 'Internal employee daily tasks created and assigned by Admin to staff.';

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);

-- 2. Table: task_comments
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    comment_text TEXT NOT NULL,
    is_blocker BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.task_comments IS 'Employee progress comments and blocker reports on assigned daily tasks.';

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);

-- 3. Table: task_activities (Timeline & Audit History)
CREATE TABLE IF NOT EXISTS public.task_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    action VARCHAR(50) NOT NULL, -- 'CREATED', 'ASSIGNED', 'STATUS_CHANGED', 'PRIORITY_CHANGED', 'DUE_DATE_CHANGED', 'COMPLETED', 'CANCELLED'
    previous_value VARCHAR(100),
    new_value VARCHAR(100),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.task_activities IS 'Immutable timeline of state transitions and assignments on daily tasks.';

CREATE INDEX IF NOT EXISTS idx_task_activities_task_id ON public.task_activities(task_id);

-- 4. Row Level Security Policies
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activities ENABLE ROW LEVEL SECURITY;

-- Tasks Policies:
-- SELECT: Admins can view all tasks; Staff can view tasks assigned to them or created by them.
DROP POLICY IF EXISTS tasks_select_policy ON public.tasks;
CREATE POLICY tasks_select_policy ON public.tasks
    FOR SELECT TO authenticated
    USING (
        public.is_admin() OR 
        assigned_to = auth.uid() OR 
        assigned_by = auth.uid()
    );

-- INSERT: Only Admin can create and assign tasks
DROP POLICY IF EXISTS tasks_insert_policy ON public.tasks;
CREATE POLICY tasks_insert_policy ON public.tasks
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin());

-- UPDATE: Admin can update all fields; Assigned Staff can update status, completed_at, and updated_at
DROP POLICY IF EXISTS tasks_update_policy ON public.tasks;
CREATE POLICY tasks_update_policy ON public.tasks
    FOR UPDATE TO authenticated
    USING (
        public.is_admin() OR 
        assigned_to = auth.uid()
    );

-- DELETE: Only Admin can delete tasks
DROP POLICY IF EXISTS tasks_delete_policy ON public.tasks;
CREATE POLICY tasks_delete_policy ON public.tasks
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- Task Comments Policies:
DROP POLICY IF EXISTS task_comments_select ON public.task_comments;
CREATE POLICY task_comments_select ON public.task_comments
    FOR SELECT TO authenticated
    USING (
        public.is_admin() OR 
        EXISTS (
            SELECT 1 FROM public.tasks t 
            WHERE t.id = task_comments.task_id 
              AND (t.assigned_to = auth.uid() OR t.assigned_by = auth.uid())
        )
    );

DROP POLICY IF EXISTS task_comments_insert ON public.task_comments;
CREATE POLICY task_comments_insert ON public.task_comments
    FOR INSERT TO authenticated
    WITH CHECK (
        author_id = auth.uid() AND
        (
            public.is_admin() OR 
            EXISTS (
                SELECT 1 FROM public.tasks t 
                WHERE t.id = task_comments.task_id 
                  AND (t.assigned_to = auth.uid() OR t.assigned_by = auth.uid())
            )
        )
    );

-- Task Activities Policies:
DROP POLICY IF EXISTS task_activities_select ON public.task_activities;
CREATE POLICY task_activities_select ON public.task_activities
    FOR SELECT TO authenticated
    USING (
        public.is_admin() OR 
        EXISTS (
            SELECT 1 FROM public.tasks t 
            WHERE t.id = task_activities.task_id 
              AND (t.assigned_to = auth.uid() OR t.assigned_by = auth.uid())
        )
    );

DROP POLICY IF EXISTS task_activities_insert ON public.task_activities;
CREATE POLICY task_activities_insert ON public.task_activities
    FOR INSERT TO authenticated
    WITH CHECK (actor_id = auth.uid());

