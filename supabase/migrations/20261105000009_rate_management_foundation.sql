-- ==============================================================================
-- WINDOW COMPANIES MANAGEMENT SYSTEM — DRAFT MIGRATION: RATE MANAGEMENT
-- ==============================================================================
-- Migration Name: 20261105000009_rate_management_foundation.sql
-- Description: Sets up specialized rate versioning indexes, constraints, and 
--              fine-grained RLS policies for rate tables (Tables 8, 9, 10, 11).
-- Status: DRAFT SPECIFICATION ONLY — DO NOT DEPLOY TO LIVE SUPABASE IN PHASE 6
-- ==============================================================================

-- 1. Verify existence of prerequisite composite keys from hotel_seasons
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_hotel_season_composite' 
          AND conrelid = 'public.hotel_seasons'::regclass
    ) THEN
        RAISE EXCEPTION 'Prerequisite constraint uq_hotel_season_composite missing on public.hotel_seasons';
    END IF;
END $$;

-- 2. Verify Composite FK on hotel_rate_sheets
-- (Ensures season strictly belongs to the specified hotel)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_rate_sheets_composite_season' 
          AND conrelid = 'public.hotel_rate_sheets'::regclass
    ) THEN
        ALTER TABLE public.hotel_rate_sheets
            ADD CONSTRAINT fk_rate_sheets_composite_season 
            FOREIGN KEY (season_id, hotel_id) 
            REFERENCES public.hotel_seasons(id, hotel_id) 
            ON DELETE RESTRICT;
    END IF;
END $$;

-- 3. Composite unique index for rate sheet version increments
CREATE UNIQUE INDEX IF NOT EXISTS idx_hotel_rate_sheets_version_unique 
    ON public.hotel_rate_sheets (hotel_id, season_id, version_number);

-- 4. Single active published rate sheet index per hotel/season
-- (Ensures only one rate sheet is in 'PUBLISHED' state at any given time)
CREATE UNIQUE INDEX IF NOT EXISTS idx_hotel_rate_sheets_single_published
    ON public.hotel_rate_sheets (hotel_id, season_id)
    WHERE (status = 'PUBLISHED');

-- 5. Enable Row Level Security on Rate Tables
ALTER TABLE public.hotel_rate_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_rate_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_rate_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_special_rates ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for hotel_rate_sheets
DROP POLICY IF EXISTS rate_sheets_select_policy ON public.hotel_rate_sheets;
CREATE POLICY rate_sheets_select_policy ON public.hotel_rate_sheets
    FOR SELECT TO authenticated
    USING (public.is_active_employee());

DROP POLICY IF EXISTS rate_sheets_insert_policy ON public.hotel_rate_sheets;
CREATE POLICY rate_sheets_insert_policy ON public.hotel_rate_sheets
    FOR INSERT TO authenticated
    WITH CHECK (public.can_manage_rates());

DROP POLICY IF EXISTS rate_sheets_update_policy ON public.hotel_rate_sheets;
CREATE POLICY rate_sheets_update_policy ON public.hotel_rate_sheets
    FOR UPDATE TO authenticated
    USING (public.can_manage_rates() AND status != 'ARCHIVED');

DROP POLICY IF EXISTS rate_sheets_delete_policy ON public.hotel_rate_sheets;
CREATE POLICY rate_sheets_delete_policy ON public.hotel_rate_sheets
    FOR DELETE TO authenticated
    USING (public.is_admin() AND status = 'DRAFT');

-- 7. RLS Policies for hotel_rate_components
DROP POLICY IF EXISTS rate_components_select_policy ON public.hotel_rate_components;
CREATE POLICY rate_components_select_policy ON public.hotel_rate_components
    FOR SELECT TO authenticated
    USING (public.is_active_employee());

DROP POLICY IF EXISTS rate_components_mutation_policy ON public.hotel_rate_components;
CREATE POLICY rate_components_mutation_policy ON public.hotel_rate_components
    FOR ALL TO authenticated
    USING (public.can_manage_rates())
    WITH CHECK (public.can_manage_rates());

-- 8. RLS Policies for hotel_rate_outputs
DROP POLICY IF EXISTS rate_outputs_select_policy ON public.hotel_rate_outputs;
CREATE POLICY rate_outputs_select_policy ON public.hotel_rate_outputs
    FOR SELECT TO authenticated
    USING (public.is_active_employee());

DROP POLICY IF EXISTS rate_outputs_mutation_policy ON public.hotel_rate_outputs;
CREATE POLICY rate_outputs_mutation_policy ON public.hotel_rate_outputs
    FOR ALL TO authenticated
    USING (public.can_manage_rates())
    WITH CHECK (public.can_manage_rates());

-- 9. RLS Policies for agency_special_rates
DROP POLICY IF EXISTS special_rates_select_policy ON public.agency_special_rates;
CREATE POLICY special_rates_select_policy ON public.agency_special_rates
    FOR SELECT TO authenticated
    USING (public.is_active_employee());

DROP POLICY IF EXISTS special_rates_insert_policy ON public.agency_special_rates;
CREATE POLICY special_rates_insert_policy ON public.agency_special_rates
    FOR INSERT TO authenticated
    WITH CHECK (public.is_active_employee());

DROP POLICY IF EXISTS special_rates_update_policy ON public.agency_special_rates;
CREATE POLICY special_rates_update_policy ON public.agency_special_rates
    FOR UPDATE TO authenticated
    USING (public.is_active_employee())
    WITH CHECK (public.is_active_employee());

DROP POLICY IF EXISTS special_rates_delete_policy ON public.agency_special_rates;
CREATE POLICY special_rates_delete_policy ON public.agency_special_rates
    FOR DELETE TO authenticated
    USING (public.is_admin());

