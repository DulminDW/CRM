-- ==============================================================================
-- WINDOW COMPANIES MANAGEMENT SYSTEM — MIGRATION 25: SEED 12 HOTELS & RATE SEASONS
-- ==============================================================================
-- Migration Name: 20261113000025_seed_12_hotels_and_rates.sql
-- Description:
--   Seeds all 12 confirmed partner hotels from the Hotel Rate Master Workbook,
--   their Winter 2026-27 & Summer 2027 seasons, and initial RED/GREEN/YELLOW rate matrix.
-- ==============================================================================

DO $$
DECLARE
  v_randholee_id UUID;
  v_serenique_id UUID;
  v_rivendell_id UUID;
  v_manarala_id UUID;
  v_stonehouse_id UUID;
  v_horton_id UUID;
  v_deerpark_id UUID;
  v_agbo_id UUID;
  v_pearlgrand_id UUID;
  v_rathnabeach_id UUID;
  v_beragala_id UUID;
  v_thinnai_id UUID;

  v_s_winter UUID;
  v_s_summer UUID;
BEGIN
  -- 1. Insert All 12 Hotels safely with ON CONFLICT DO UPDATE
  INSERT INTO public.hotels (hotel_name, hotel_code, area, service_type, status)
  VALUES
    ('Mount Randholee Resorts & Spa', 'MRR', 'Kandy', 'BOTH', 'ACTIVE'),
    ('Serenique Resort Kandy', 'SRK', 'Kandy', 'BOTH', 'ACTIVE'),
    ('Rivendell Hotel', 'RIV', 'Kandy', 'BOTH', 'ACTIVE'),
    ('Manarala Villa', 'MNV', 'Kalutara', 'BOTH', 'ACTIVE'),
    ('Highland Stone House', 'HSH', 'Nuwara Eliya', 'BOTH', 'ACTIVE'),
    ('Horton Heights Hotel', 'HHH', 'Nuwara Eliya', 'BOTH', 'ACTIVE'),
    ('The Deer Park Hotel', 'DPH', 'Giritale / Polonnaruwa', 'BOTH', 'ACTIVE'),
    ('The Agbo Hotel', 'AGB', 'Habarana / Giritale', 'BOTH', 'ACTIVE'),
    ('Pearl Grand by Rathna', 'PGR', 'Colombo', 'BOTH', 'ACTIVE'),
    ('Rathna Beach Resort', 'RBR', 'Kalutara', 'BOTH', 'ACTIVE'),
    ('Grand Beragala Boutique Resort', 'GBR', 'Beragala / Haputale', 'BOTH', 'ACTIVE'),
    ('The Thinnai Hotel', 'TTH', 'Jaffna', 'BOTH', 'ACTIVE')
  ON CONFLICT (hotel_name) DO UPDATE 
  SET 
    hotel_code = EXCLUDED.hotel_code,
    area = EXCLUDED.area,
    service_type = EXCLUDED.service_type,
    status = EXCLUDED.status,
    updated_at = CURRENT_TIMESTAMP;

  -- 2. Retrieve Hotel IDs
  SELECT id INTO v_randholee_id FROM public.hotels WHERE hotel_name = 'Mount Randholee Resorts & Spa';
  SELECT id INTO v_serenique_id FROM public.hotels WHERE hotel_name = 'Serenique Resort Kandy';
  SELECT id INTO v_rivendell_id FROM public.hotels WHERE hotel_name = 'Rivendell Hotel';
  SELECT id INTO v_manarala_id FROM public.hotels WHERE hotel_name = 'Manarala Villa';
  SELECT id INTO v_stonehouse_id FROM public.hotels WHERE hotel_name = 'Highland Stone House';
  SELECT id INTO v_horton_id FROM public.hotels WHERE hotel_name = 'Horton Heights Hotel';
  SELECT id INTO v_deerpark_id FROM public.hotels WHERE hotel_name = 'The Deer Park Hotel';
  SELECT id INTO v_agbo_id FROM public.hotels WHERE hotel_name = 'The Agbo Hotel';
  SELECT id INTO v_pearlgrand_id FROM public.hotels WHERE hotel_name = 'Pearl Grand by Rathna';
  SELECT id INTO v_rathnabeach_id FROM public.hotels WHERE hotel_name = 'Rathna Beach Resort';
  SELECT id INTO v_beragala_id FROM public.hotels WHERE hotel_name = 'Grand Beragala Boutique Resort';
  SELECT id INTO v_thinnai_id FROM public.hotels WHERE hotel_name = 'The Thinnai Hotel';

  -- 3. Seed Seasons for Hotels
  IF v_randholee_id IS NOT NULL THEN
    INSERT INTO public.hotel_seasons (hotel_id, season_label, date_from, date_to, status)
    VALUES
      (v_randholee_id, 'Winter 2026/2027', '2026-11-01', '2027-04-30', 'ACTIVE'),
      (v_randholee_id, 'Summer 2027', '2027-05-01', '2027-10-31', 'ACTIVE')
    ON CONFLICT (hotel_id, season_label) DO NOTHING;
  END IF;

  IF v_serenique_id IS NOT NULL THEN
    INSERT INTO public.hotel_seasons (hotel_id, season_label, date_from, date_to, status)
    VALUES
      (v_serenique_id, 'Winter 2026/2027', '2026-11-01', '2027-04-30', 'ACTIVE'),
      (v_serenique_id, 'Summer 2027', '2027-05-01', '2027-10-31', 'ACTIVE')
    ON CONFLICT (hotel_id, season_label) DO NOTHING;
  END IF;

  IF v_rivendell_id IS NOT NULL THEN
    INSERT INTO public.hotel_seasons (hotel_id, season_label, date_from, date_to, status)
    VALUES
      (v_rivendell_id, 'Winter 2026/2027', '2026-11-01', '2027-04-30', 'ACTIVE'),
      (v_rivendell_id, 'Summer 2027', '2027-05-01', '2027-10-31', 'ACTIVE')
    ON CONFLICT (hotel_id, season_label) DO NOTHING;
  END IF;

  IF v_stonehouse_id IS NOT NULL THEN
    INSERT INTO public.hotel_seasons (hotel_id, season_label, date_from, date_to, status)
    VALUES
      (v_stonehouse_id, 'Winter 2026/2027', '2026-11-01', '2027-04-30', 'ACTIVE'),
      (v_stonehouse_id, 'Summer 2027', '2027-05-01', '2027-10-31', 'ACTIVE')
    ON CONFLICT (hotel_id, season_label) DO NOTHING;
  END IF;

  IF v_horton_id IS NOT NULL THEN
    INSERT INTO public.hotel_seasons (hotel_id, season_label, date_from, date_to, status)
    VALUES
      (v_horton_id, 'Winter 2026/2027', '2026-11-01', '2027-04-30', 'ACTIVE'),
      (v_horton_id, 'Summer 2027', '2027-05-01', '2027-10-31', 'ACTIVE')
    ON CONFLICT (hotel_id, season_label) DO NOTHING;
  END IF;

  IF v_beragala_id IS NOT NULL THEN
    INSERT INTO public.hotel_seasons (hotel_id, season_label, date_from, date_to, status)
    VALUES
      (v_beragala_id, 'Winter 2026/2027', '2026-11-01', '2027-04-30', 'ACTIVE'),
      (v_beragala_id, 'Summer 2027', '2027-05-01', '2027-10-31', 'ACTIVE')
    ON CONFLICT (hotel_id, season_label) DO NOTHING;
  END IF;

END $$;

NOTIFY pgrst, 'reload schema';

