-- Migration 28: Add case-insensitive unique index on agency_markets (agency_id, LOWER(TRIM(market_name)))
-- Enforces:
-- 1. No duplicate markets under the same agency, case-insensitively.
-- 2. Agency -> Market relationship strictly preserved.

CREATE UNIQUE INDEX IF NOT EXISTS uq_agency_market_case_insensitive 
ON public.agency_markets (agency_id, LOWER(TRIM(market_name)));

COMMENT ON INDEX uq_agency_market_case_insensitive IS 'Prevents duplicate market names under the same travel agency regardless of casing';

