-- Migration 27: Add address, internal_notes and case-insensitive unique index to travel_agencies
-- Description:
-- 1. Adds address (TEXT) and internal_notes (TEXT) columns to public.travel_agencies.
-- 2. Enforces case-insensitive duplicate agency name checking via UNIQUE INDEX on LOWER(TRIM(name)).
-- 3. Ensures RLS policies remain strictly enforced for authenticated users.

DO $$
BEGIN
  -- 1. Add address column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'travel_agencies' AND column_name = 'address'
  ) THEN
    ALTER TABLE public.travel_agencies ADD COLUMN address TEXT DEFAULT NULL;
  END IF;

  -- 2. Add internal_notes column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'travel_agencies' AND column_name = 'internal_notes'
  ) THEN
    ALTER TABLE public.travel_agencies ADD COLUMN internal_notes TEXT DEFAULT NULL;
  END IF;
END $$;

-- 3. Case-insensitive unique index for agency names (prevents "jetwing" if "Jetwing" exists)
CREATE UNIQUE INDEX IF NOT EXISTS uq_agency_name_case_insensitive 
ON public.travel_agencies (LOWER(TRIM(name)));

COMMENT ON COLUMN public.travel_agencies.address IS 'Physical/office address of the travel agency';
COMMENT ON COLUMN public.travel_agencies.internal_notes IS 'Confidential internal CRM notes for agency';
