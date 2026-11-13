-- ==============================================================================
-- WINDOW COMPANIES CRM — EXCEL BULK IMPORT AUDIT LOGGING & HISTORY
-- Migration: 20261111000015_excel_bulk_import_history.sql
-- Description:
--   Tracks batch Excel import sessions for Hotels, Hotel Seasons,
--   Travel Agencies, Markets, and Agency Members.
--   Enforces row-level security: only authenticated internal staff/admins
--   can access or record import history.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.excel_import_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL, -- 'HOTELS', 'SEASONS', 'AGENCIES', 'MARKETS', 'MEMBERS'
    file_name VARCHAR(255) NOT NULL,
    total_rows INTEGER NOT NULL DEFAULT 0,
    successful_rows INTEGER NOT NULL DEFAULT 0,
    skipped_rows INTEGER NOT NULL DEFAULT 0,
    failed_rows INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED', -- 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'PARTIAL'
    error_summary JSONB DEFAULT '[]'::jsonb,
    started_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_import_category CHECK (category IN ('HOTELS', 'SEASONS', 'AGENCIES', 'MARKETS', 'MEMBERS')),
    CONSTRAINT chk_import_status CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'FAILED', 'PARTIAL'))
);

COMMENT ON TABLE public.excel_import_history IS 'Audit history and execution summaries of Excel bulk import jobs.';

-- Indexes for audit query performance
CREATE INDEX IF NOT EXISTS idx_excel_import_category ON public.excel_import_history(category);
CREATE INDEX IF NOT EXISTS idx_excel_import_started_by ON public.excel_import_history(started_by);
CREATE INDEX IF NOT EXISTS idx_excel_import_started_at ON public.excel_import_history(started_at DESC);

-- Enable RLS
ALTER TABLE public.excel_import_history ENABLE ROW LEVEL SECURITY;

-- RLS: Authenticated users can view import history
CREATE POLICY "Authenticated users can view excel import history"
    ON public.excel_import_history
    FOR SELECT
    TO authenticated
    USING (true);

-- RLS: Authenticated staff can insert excel import records for themselves
CREATE POLICY "Authenticated users can insert excel import history"
    ON public.excel_import_history
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = started_by);

