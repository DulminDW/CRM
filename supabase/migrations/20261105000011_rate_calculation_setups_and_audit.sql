-- ==============================================================================
-- WINDOW COMPANIES MANAGEMENT SYSTEM — DRAFT MIGRATION: RATE CALCULATION SETUPS & AUDIT ACTIONS
-- ==============================================================================
-- Migration Name: 20261105000011_rate_calculation_setups_and_audit.sql
-- Description: Creates user-created rate calculation setups table and extends
--              audit log action constraints to support granular rate workflow events.
-- Status: DRAFT SPECIFICATION ONLY — DO NOT DEPLOY TO LIVE SUPABASE IN THIS PHASE
-- ==============================================================================

-- 1. Table: rate_calculation_setups
-- Supports optional, user-created calculation setups (unlimited, no fixed 5-slot ceiling)
CREATE TABLE IF NOT EXISTS public.rate_calculation_setups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setup_name VARCHAR(255) NOT NULL,
    description TEXT,
    config JSONB NOT NULL,
    created_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    version_number INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT chk_setup_name_not_empty CHECK (char_length(trim(setup_name)) > 0)
);

COMMENT ON TABLE public.rate_calculation_setups IS 'User-created optional rate calculation configurations storing dynamic anchor, occupancy, and meal adjustment parameters.';

-- 2. Query Performance Indexes
CREATE INDEX IF NOT EXISTS idx_rate_calc_setups_creator ON public.rate_calculation_setups (created_by, is_archived);
CREATE INDEX IF NOT EXISTS idx_rate_calc_setups_name ON public.rate_calculation_setups (LOWER(setup_name));

-- 3. Row Level Security Policies
ALTER TABLE public.rate_calculation_setups ENABLE ROW LEVEL SECURITY;

-- Read policy: active employees can view non-archived setups
DROP POLICY IF EXISTS rate_calc_setups_select_policy ON public.rate_calculation_setups;
CREATE POLICY rate_calc_setups_select_policy ON public.rate_calculation_setups
    FOR SELECT TO authenticated
    USING (public.is_active_employee());

-- Mutation policy: staff with CAN_MANAGE_RATES or ADMIN can create, update, or archive setups
DROP POLICY IF EXISTS rate_calc_setups_mutation_policy ON public.rate_calculation_setups;
CREATE POLICY rate_calc_setups_mutation_policy ON public.rate_calculation_setups
    FOR ALL TO authenticated
    USING (public.can_manage_rates())
    WITH CHECK (public.can_manage_rates());

-- 4. Extend audit_logs check constraint to support granular rate activity logging
-- Dropping and recreating chk_audit_action constraint cleanly
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS chk_audit_action;
ALTER TABLE public.audit_logs ADD CONSTRAINT chk_audit_action CHECK (
    action IN (
        'INSERT', 'UPDATE', 'DELETE', 'PUBLISH', 'GRANT', 'REVOKE',
        'CALCULATION_SETUP_CREATED', 'CALCULATION_SETUP_UPDATED',
        'CALCULATION_SETUP_APPLIED', 'CALCULATION_SETUP_ARCHIVED',
        'RATE_CALCULATION_STARTED', 'RATE_CALCULATION_COMPLETED',
        'RATE_CELL_MANUALLY_OVERRIDDEN', 'RATE_CELL_RESET_TO_AUTO',
        'RATE_SHEET_SAVED', 'RATE_SHEET_PUBLISHED', 'RATE_SHEET_ARCHIVED'
    )
);
