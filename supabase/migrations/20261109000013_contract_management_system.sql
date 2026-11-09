-- ==============================================================================
-- WINDOW COMPANIES MANAGEMENT SYSTEM — DRAFT MIGRATION: CONTRACT MANAGEMENT ENHANCEMENT
-- ==============================================================================
-- Migration Name: 20261109000013_contract_management_system.sql
-- Description: Extends hotel_contracts with multi-season associations, structured
--              conditions, document attachments, and immutability version snapshots.
-- Status: DRAFT SPECIFICATION ONLY — DO NOT DEPLOY TO LIVE SUPABASE IN THIS PHASE
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Table: hotel_contract_seasons (Many-to-Many Contract to Seasons)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hotel_contract_seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.hotel_contracts(id) ON DELETE CASCADE,
    hotel_id UUID NOT NULL,
    season_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Composite FK ensures the season strictly belongs to the contract's hotel
    CONSTRAINT fk_contract_seasons_composite FOREIGN KEY (season_id, hotel_id) 
        REFERENCES public.hotel_seasons(id, hotel_id) ON DELETE RESTRICT,
    CONSTRAINT uq_contract_season UNIQUE (contract_id, season_id)
);

COMMENT ON TABLE public.hotel_contract_seasons IS 'Associates master contracts with one or more operational hotel seasons.';

-- ------------------------------------------------------------------------------
-- 2. Table: hotel_contract_conditions (Structured Commercial Conditions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hotel_contract_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.hotel_contracts(id) ON DELETE CASCADE,
    condition_title VARCHAR(255) NOT NULL,
    condition_description TEXT NOT NULL,
    condition_category VARCHAR(50) NOT NULL DEFAULT 'GENERAL', -- 'CHECK_IN_OUT', 'CANCELLATION', 'CHILD_POLICY', 'PAYMENT', 'GALA_DINNER', 'GENERAL'
    is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
    is_internal_only BOOLEAN NOT NULL DEFAULT FALSE, -- Internal notes NEVER sent to travel agency clients
    display_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_condition_category CHECK (
        condition_category IN ('CHECK_IN_OUT', 'CANCELLATION', 'CHILD_POLICY', 'PAYMENT', 'GALA_DINNER', 'GENERAL', 'SUPPLEMENT')
    )
);

COMMENT ON TABLE public.hotel_contract_conditions IS 'Structured legal and commercial terms attached to hotel contracts with external sharing flags.';

-- ------------------------------------------------------------------------------
-- 3. Table: hotel_contract_documents (Uploaded Contract Documents)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hotel_contract_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.hotel_contracts(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    version_number INTEGER NOT NULL DEFAULT 1,
    uploaded_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.hotel_contract_documents IS 'Original contract documents (PDF/Word) stored in private Supabase Storage.';

-- ------------------------------------------------------------------------------
-- 4. Table: hotel_contract_versions (Immutable Version Snapshots)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hotel_contract_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.hotel_contracts(id) ON DELETE RESTRICT,
    version_number INTEGER NOT NULL,
    version_label VARCHAR(100) NOT NULL,
    terms_snapshot TEXT,
    conditions_snapshot JSONB,
    effective_from DATE NOT NULL,
    effective_to DATE NOT NULL,
    change_summary TEXT,
    published_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_contract_version_num UNIQUE (contract_id, version_number)
);

COMMENT ON TABLE public.hotel_contract_versions IS 'Immutable snapshots of contract versions guaranteeing historical quote integrity.';

-- ------------------------------------------------------------------------------
-- 5. Row Level Security Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.hotel_contract_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_contract_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_contract_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_contract_versions ENABLE ROW LEVEL SECURITY;

-- Read policies: Active employees can view
CREATE POLICY contract_seasons_select ON public.hotel_contract_seasons
    FOR SELECT TO authenticated USING (public.is_active_employee());

CREATE POLICY contract_conditions_select ON public.hotel_contract_conditions
    FOR SELECT TO authenticated USING (public.is_active_employee());

CREATE POLICY contract_documents_select ON public.hotel_contract_documents
    FOR SELECT TO authenticated USING (public.is_active_employee());

CREATE POLICY contract_versions_select ON public.hotel_contract_versions
    FOR SELECT TO authenticated USING (public.is_active_employee());

-- Mutation policies: Gated by can_manage_rates()
CREATE POLICY contract_seasons_mutate ON public.hotel_contract_seasons
    FOR ALL TO authenticated USING (public.can_manage_rates()) WITH CHECK (public.can_manage_rates());

CREATE POLICY contract_conditions_mutate ON public.hotel_contract_conditions
    FOR ALL TO authenticated USING (public.can_manage_rates()) WITH CHECK (public.can_manage_rates());

CREATE POLICY contract_documents_mutate ON public.hotel_contract_documents
    FOR ALL TO authenticated USING (public.can_manage_rates()) WITH CHECK (public.can_manage_rates());

CREATE POLICY contract_versions_mutate ON public.hotel_contract_versions
    FOR ALL TO authenticated USING (public.can_manage_rates()) WITH CHECK (public.can_manage_rates());

-- ------------------------------------------------------------------------------
-- 6. Storage Bucket & Storage Object RLS Policies (Draft Specification)
-- ------------------------------------------------------------------------------
-- Bucket ID: 'hotel-contracts' (Private bucket for signed PDFs, amendments, rate sheets)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'hotel-contracts',
    'hotel-contracts',
    FALSE,
    26214400, -- 25 MB max limit
    ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO UPDATE SET
    public = FALSE,
    file_size_limit = 26214400,
    allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

-- Storage Object RLS: Download/Read strictly for active authenticated employees
DROP POLICY IF EXISTS "contract_documents_storage_select" ON storage.objects;
CREATE POLICY "contract_documents_storage_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'hotel-contracts'
        AND public.is_active_employee()
    );

-- Storage Object RLS: Upload/Insert restricted to authorized rate managers
DROP POLICY IF EXISTS "contract_documents_storage_insert" ON storage.objects;
CREATE POLICY "contract_documents_storage_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'hotel-contracts'
        AND public.can_manage_rates()
    );

-- Storage Object RLS: Delete restricted to ADMIN role only
DROP POLICY IF EXISTS "contract_documents_storage_delete" ON storage.objects;
CREATE POLICY "contract_documents_storage_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'hotel-contracts'
        AND EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'ADMIN' AND is_active = TRUE
        )
    );


