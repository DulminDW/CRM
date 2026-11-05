-- ==============================================================================
-- WINDOW COMPANIES MANAGEMENT SYSTEM — DRAFT MIGRATION: CONTRACTS & CUSTOM TEMPLATES
-- ==============================================================================
-- Migration Name: 20261105000010_contracts_and_custom_rate_templates.sql
-- Description: Creates hotel_contracts and custom_rate_templates tables with
--              composite foreign keys, version tracking, and RLS policies.
-- Status: DRAFT SPECIFICATION ONLY — DO NOT DEPLOY TO LIVE SUPABASE IN THIS PHASE
-- ==============================================================================

-- 1. Table: hotel_contracts
-- Represents master partner hotel contracts tied to specific properties and seasons.
CREATE TABLE IF NOT EXISTS public.hotel_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL,
    season_id UUID,
    contract_reference VARCHAR(100) NOT NULL,
    contract_name VARCHAR(255) NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    terms_and_conditions TEXT,
    document_storage_path VARCHAR(500),
    version_number INTEGER NOT NULL DEFAULT 1,
    created_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_contracts_hotel FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE RESTRICT,
    -- Composite FK ensuring season belongs to the specified hotel if season_id is provided:
    CONSTRAINT fk_contracts_composite_season FOREIGN KEY (season_id, hotel_id) REFERENCES public.hotel_seasons(id, hotel_id) ON DELETE RESTRICT,
    CONSTRAINT uq_contract_reference UNIQUE (contract_reference),
    CONSTRAINT chk_contract_dates CHECK (valid_to >= valid_from),
    CONSTRAINT chk_contract_status CHECK (status IN ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED')),
    CONSTRAINT chk_contract_currency CHECK (char_length(currency) = 3)
);

COMMENT ON TABLE public.hotel_contracts IS 'Master legal and commercial contracts established with partner hotels.';

-- 2. Table: custom_rate_templates
-- Represents reusable custom rate configurations (Custom 1, Custom 2, Custom 3).
CREATE TABLE IF NOT EXISTS public.custom_rate_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE RESTRICT,
    season_id UUID,
    slot_label VARCHAR(20) NOT NULL, -- 'Custom 1', 'Custom 2', 'Custom 3'
    template_name VARCHAR(255) NOT NULL,
    rate_amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    room_night_condition INTEGER,    -- e.g. 1500 room nights minimum commitment
    date_condition_from DATE,
    date_condition_to DATE,
    special_notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Composite FK ensuring season belongs to the specified hotel if season_id is provided:
    CONSTRAINT fk_custom_templates_composite_season FOREIGN KEY (season_id, hotel_id) REFERENCES public.hotel_seasons(id, hotel_id) ON DELETE RESTRICT,
    CONSTRAINT chk_custom_rate_slot CHECK (slot_label IN ('Custom 1', 'Custom 2', 'Custom 3')),
    CONSTRAINT chk_custom_rate_amount CHECK (rate_amount >= 0),
    CONSTRAINT chk_custom_rate_currency CHECK (char_length(currency) = 3),
    CONSTRAINT chk_custom_rate_dates CHECK (date_condition_to IS NULL OR date_condition_from IS NULL OR date_condition_to >= date_condition_from)
);

COMMENT ON TABLE public.custom_rate_templates IS 'Reusable negotiated custom rate templates (Custom 1, 2, 3) for quick quote insertion.';

-- 3. Row Level Security Policies
ALTER TABLE public.hotel_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_rate_templates ENABLE ROW LEVEL SECURITY;

-- Contracts RLS
DROP POLICY IF EXISTS contracts_select_policy ON public.hotel_contracts;
CREATE POLICY contracts_select_policy ON public.hotel_contracts
    FOR SELECT TO authenticated
    USING (public.is_active_employee());

DROP POLICY IF EXISTS contracts_mutation_policy ON public.hotel_contracts;
CREATE POLICY contracts_mutation_policy ON public.hotel_contracts
    FOR ALL TO authenticated
    USING (public.can_manage_rates())
    WITH CHECK (public.can_manage_rates());

-- Custom Templates RLS
DROP POLICY IF EXISTS custom_templates_select_policy ON public.custom_rate_templates;
CREATE POLICY custom_templates_select_policy ON public.custom_rate_templates
    FOR SELECT TO authenticated
    USING (public.is_active_employee());

DROP POLICY IF EXISTS custom_templates_mutation_policy ON public.custom_rate_templates;
CREATE POLICY custom_templates_mutation_policy ON public.custom_rate_templates
    FOR ALL TO authenticated
    USING (public.can_manage_rates())
    WITH CHECK (public.can_manage_rates());

