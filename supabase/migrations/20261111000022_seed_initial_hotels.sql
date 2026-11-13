-- ==============================================================================
-- WINDOW COMPANIES MANAGEMENT SYSTEM — MIGRATION 22: SEED PARTNER HOTELS
-- ==============================================================================
-- Migration Name: 20261111000022_seed_initial_hotels.sql
-- Description:
--   Seeds initial partner hotels into public.hotels safely.
-- ==============================================================================

INSERT INTO public.hotels (hotel_name, hotel_code, area, service_type, status)
VALUES 
  ('Mount Randholee Resorts & Spa', 'MRR', 'Kandy', 'BOTH', 'ACTIVE'),
  ('Grand Beragala Boutique Resort', 'GBR', 'Beragala / Haputale', 'BOTH', 'ACTIVE')
ON CONFLICT (hotel_name) DO UPDATE 
SET 
  hotel_code = EXCLUDED.hotel_code,
  area = EXCLUDED.area,
  service_type = EXCLUDED.service_type,
  status = EXCLUDED.status,
  updated_at = CURRENT_TIMESTAMP;

NOTIFY pgrst, 'reload schema';

