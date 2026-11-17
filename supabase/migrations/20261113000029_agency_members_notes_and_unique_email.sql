-- Migration 29: Add notes column and case-insensitive unique email index to agency_members
-- Enforces:
-- 1. Optional confidential notes for contact person.
-- 2. Case-insensitive unique email index on LOWER(TRIM(email)) per agency.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'agency_members' AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.agency_members ADD COLUMN notes TEXT DEFAULT NULL;
  END IF;
END $$;

-- Enforce case-insensitive email uniqueness per agency
CREATE UNIQUE INDEX IF NOT EXISTS uq_agency_member_email_case_insensitive 
ON public.agency_members (agency_id, LOWER(TRIM(email)));

COMMENT ON COLUMN public.agency_members.notes IS 'Internal confidential notes regarding this contact person';

