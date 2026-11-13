-- ==============================================================================
-- WINDOW COMPANIES MANAGEMENT SYSTEM — DRAFT MIGRATION: HOTEL RATE CONFIG & PREVIOUS HISTORY
-- ==============================================================================
-- Migration Name: 20261111000014_hotel_rate_configs_and_history.sql
-- Description: Creates hotel_rate_configs for hotel-specific formula components
--              (HB Double Base, Single Reduction, Triple Supplement, BB Reduction)
--              and enhances custom rate agency scopes and previous quote history indices.
-- Status: DRAFT SPECIFICATION ONLY — DO NOT DEPLOY TO LIVE SUPABASE IN THIS PHASE
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Table: hotel_rate_configs (Hotel-Specific Pricing & Formula Components)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hotel_rate_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE RESTRICT,
    season_id UUID NOT NULL,
    contract_id UUID REFERENCES public.hotel_contracts(id) ON DELETE SET NULL,
    rate_category VARCHAR(20) NOT NULL DEFAULT 'GREEN', -- 'RED', 'GREEN', 'YELLOW'
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    
    -- Core Components
    hb_double_base_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    single_reduction_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    single_reduction_unit VARCHAR(30) NOT NULL DEFAULT 'PER_ROOM_PER_NIGHT',
    triple_supplement_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    triple_supplement_unit VARCHAR(30) NOT NULL DEFAULT 'PER_ROOM_PER_NIGHT',
    bb_reduction_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    bb_reduction_unit VARCHAR(30) NOT NULL DEFAULT 'PER_ROOM_PER_NIGHT',
    
    -- Formula Verification State
    is_formula_verified BOOLEAN NOT NULL DEFAULT FALSE,
    calculation_rule_version VARCHAR(50) NOT NULL DEFAULT 'v1.0-manual',
    formula_source_reference VARCHAR(255),
    
    -- Visibility & Notes
    internal_notes TEXT,
    external_notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- 'DRAFT', 'ACTIVE', 'ARCHIVED'
    version_number INTEGER NOT NULL DEFAULT 1,
    
    created_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    updated_by UUID REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Composite FK ensuring season belongs to the specified hotel:
    CONSTRAINT fk_rate_configs_composite_season FOREIGN KEY (season_id, hotel_id) 
        REFERENCES public.hotel_seasons(id, hotel_id) ON DELETE RESTRICT,
    -- Prevent duplicate active configurations for the exact same (hotel, season, category) tuple:
    CONSTRAINT uq_hotel_season_category_config UNIQUE (hotel_id, season_id, rate_category, version_number),
    CONSTRAINT chk_rate_config_category CHECK (rate_category IN ('RED', 'GREEN', 'YELLOW')),
    CONSTRAINT chk_rate_config_status CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
    CONSTRAINT chk_rate_config_currency CHECK (char_length(currency) = 3),
    CONSTRAINT chk_rate_config_base CHECK (hb_double_base_rate >= 0),
    CONSTRAINT chk_rate_config_single_red CHECK (single_reduction_amount >= 0),
    CONSTRAINT chk_rate_config_triple_supp CHECK (triple_supplement_amount >= 0),
    CONSTRAINT chk_rate_config_bb_red CHECK (bb_reduction_amount >= 0)
);

COMMENT ON TABLE public.hotel_rate_configs IS 'Hotel-specific pricing formula components (HB Base, Single Red, Triple Supp, BB Red) linked to hotel, season, and Red/Green/Yellow tiers.';

-- ------------------------------------------------------------------------------
-- 2. Schema Enhancements on quotes: Plain-text Email, Device Handoff & Confirmation Audit
-- ------------------------------------------------------------------------------
ALTER TABLE public.quotes 
    ADD COLUMN IF NOT EXISTS email_body_text TEXT,
    ADD COLUMN IF NOT EXISTS opened_in_app_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS confirmation_notes TEXT;

-- Update constraint on quotes email_status to support client-assisted email handoff statuses
DO $$
BEGIN
    ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS chk_quote_email_status;
    ALTER TABLE public.quotes ADD CONSTRAINT chk_quote_email_status 
        CHECK (email_status IN ('NOT_SENT', 'QUEUED', 'PARTIALLY_SENT', 'SENT', 'FAILED', 'OPENED_IN_EMAIL_APP', 'USER_CONFIRMED_SENT'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

COMMENT ON COLUMN public.quotes.email_body_text IS 'Plain-text snapshot of dispatched quote email alongside HTML body.';
COMMENT ON COLUMN public.quotes.opened_in_app_at IS 'Timestamp when the client mailto / email handler link was triggered.';
COMMENT ON COLUMN public.quotes.confirmed_by IS 'Staff user profile ID who confirmed manual sending in their email client.';
COMMENT ON COLUMN public.quotes.confirmed_at IS 'Timestamp when the staff user confirmed the email was sent.';
COMMENT ON COLUMN public.quotes.confirmation_notes IS 'Optional staff notes recorded during send confirmation or not-sent status.';

-- ------------------------------------------------------------------------------
-- 3. Query Performance Indexes
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_hotel_rate_configs_lookup 
    ON public.hotel_rate_configs (hotel_id, season_id, rate_category, status);

CREATE INDEX IF NOT EXISTS idx_quotes_agency_member_history 
    ON public.quotes (agency_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 4. Row Level Security Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.hotel_rate_configs ENABLE ROW LEVEL SECURITY;

-- Read policy: All active employees can view rate configurations
DROP POLICY IF EXISTS hotel_rate_configs_select ON public.hotel_rate_configs;
CREATE POLICY hotel_rate_configs_select ON public.hotel_rate_configs
    FOR SELECT TO authenticated 
    USING (public.is_active_employee());

-- Mutation policy: Only employees with can_manage_rates() or ADMIN role can mutate
DROP POLICY IF EXISTS hotel_rate_configs_mutate ON public.hotel_rate_configs;
CREATE POLICY hotel_rate_configs_mutate ON public.hotel_rate_configs
    FOR ALL TO authenticated 
    USING (public.can_manage_rates()) 
    WITH CHECK (public.can_manage_rates());

