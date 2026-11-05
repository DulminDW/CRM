-- ==============================================================================
-- WINDOW COMPANIES CRM — REVISED SEASON DATE VALIDATION
-- Migration: 20261104000008_strict_season_dates.sql
-- Enforces that date_to must be strictly later than date_from (date_to > date_from).
-- ==============================================================================

ALTER TABLE public.hotel_seasons
  DROP CONSTRAINT IF EXISTS chk_season_dates;

ALTER TABLE public.hotel_seasons
  ADD CONSTRAINT chk_season_dates CHECK (date_to > date_from);

COMMENT ON CONSTRAINT chk_season_dates ON public.hotel_seasons 
  IS 'Enforces that season end date (date_to) is strictly later than start date (date_from).';

