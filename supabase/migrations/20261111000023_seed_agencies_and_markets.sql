-- ==============================================================================
-- WINDOW COMPANIES MANAGEMENT SYSTEM — MIGRATION 23: SEED AGENCIES, MARKETS & CONTACTS
-- ==============================================================================
-- Migration Name: 20261111000023_seed_agencies_and_markets.sql
-- Description:
--   Seeds top authentic Sri Lankan & International Travel Agencies, their Regional
--   Market Desks, and primary Contact Members into the CRM database.
-- ==============================================================================

DO $$
DECLARE
    -- Agency UUIDs
    v_jetwing_id UUID := gen_random_uuid();
    v_aitken_id UUID := gen_random_uuid();
    v_walkoffs_id UUID := gen_random_uuid();
    v_hayleys_id UUID := gen_random_uuid();
    v_reddot_id UUID := gen_random_uuid();

    -- Market UUIDs for Jetwing
    v_jw_uk_id UUID := gen_random_uuid();
    v_jw_dach_id UUID := gen_random_uuid();
    v_jw_india_id UUID := gen_random_uuid();

    -- Market UUIDs for Aitken Spence
    v_as_uk_id UUID := gen_random_uuid();
    v_as_gcc_id UUID := gen_random_uuid();
    v_as_cis_id UUID := gen_random_uuid();

    -- Market UUIDs for Walkers Tours
    v_wt_europe_id UUID := gen_random_uuid();
    v_wt_australia_id UUID := gen_random_uuid();

    -- Market UUIDs for Hayleys Travels
    v_ht_global_id UUID := gen_random_uuid();

    -- Market UUIDs for Red Dot Tours
    v_rd_uk_id UUID := gen_random_uuid();

BEGIN
    -- 1. Insert Travel Agencies
    INSERT INTO public.travel_agencies (id, name, code, country, city, phone, email, status)
    VALUES
      (v_jetwing_id, 'Jetwing Travels', 'JET', 'Sri Lanka', 'Colombo', '+94 11 234 5700', 'inquiries@jetwingtravels.com', 'ACTIVE'),
      (v_aitken_id, 'Aitken Spence Travels', 'AST', 'Sri Lanka', 'Colombo', '+94 11 230 8308', 'info@aitkenspence.lk', 'ACTIVE'),
      (v_walkoffs_id, 'Walkers Tours (John Keells)', 'WKL', 'Sri Lanka', 'Colombo', '+94 11 230 6306', 'info@walkerstours.com', 'ACTIVE'),
      (v_hayleys_id, 'Hayleys Travels', 'HAY', 'Sri Lanka', 'Colombo', '+94 11 268 0000', 'travels@hayleys.com', 'ACTIVE'),
      (v_reddot_id, 'Red Dot Tours', 'RDT', 'United Kingdom / Sri Lanka', 'London / Colombo', '+44 20 7183 6371', 'info@reddottours.com', 'ACTIVE')
    ON CONFLICT (name) DO NOTHING;

    -- Retrieve IDs if they already existed
    SELECT id INTO v_jetwing_id FROM public.travel_agencies WHERE name = 'Jetwing Travels';
    SELECT id INTO v_aitken_id FROM public.travel_agencies WHERE name = 'Aitken Spence Travels';
    SELECT id INTO v_walkoffs_id FROM public.travel_agencies WHERE name = 'Walkers Tours (John Keells)';
    SELECT id INTO v_hayleys_id FROM public.travel_agencies WHERE name = 'Hayleys Travels';
    SELECT id INTO v_reddot_id FROM public.travel_agencies WHERE name = 'Red Dot Tours';

    -- 2. Insert Agency Markets
    -- Jetwing Markets
    INSERT INTO public.agency_markets (id, agency_id, market_name, description)
    VALUES
      (v_jw_uk_id, v_jetwing_id, 'UK & Ireland Market', 'United Kingdom, Ireland and English speaking Europe outbound desk.')
    ON CONFLICT (agency_id, market_name) DO NOTHING;

    INSERT INTO public.agency_markets (id, agency_id, market_name, description)
    VALUES
      (v_jw_dach_id, v_jetwing_id, 'DACH Market (Germany, Austria, Switzerland)', 'German-speaking European tour operators and FTI partnerships.')
    ON CONFLICT (agency_id, market_name) DO NOTHING;

    INSERT INTO public.agency_markets (id, agency_id, market_name, description)
    VALUES
      (v_jw_india_id, v_jetwing_id, 'India & Subcontinent Market', 'Direct leisure and MICE accounts from Mumbai, Delhi, and Bangalore.')
    ON CONFLICT (agency_id, market_name) DO NOTHING;

    -- Aitken Spence Markets
    INSERT INTO public.agency_markets (id, agency_id, market_name, description)
    VALUES
      (v_as_uk_id, v_aitken_id, 'UK & Western Europe Market', 'Charter and luxury inbound packages from London and Manchester.')
    ON CONFLICT (agency_id, market_name) DO NOTHING;

    INSERT INTO public.agency_markets (id, agency_id, market_name, description)
    VALUES
      (v_as_gcc_id, v_aitken_id, 'GCC & Middle East Market', 'UAE, Saudi Arabia, Qatar luxury inbound and family villas.')
    ON CONFLICT (agency_id, market_name) DO NOTHING;

    INSERT INTO public.agency_markets (id, agency_id, market_name, description)
    VALUES
      (v_as_cis_id, v_aitken_id, 'CIS & Russian Market', 'Direct flight packages and charter traffic from Moscow and Almaty.')
    ON CONFLICT (agency_id, market_name) DO NOTHING;

    -- Walkers Tours Markets
    INSERT INTO public.agency_markets (id, agency_id, market_name, description)
    VALUES
      (v_wt_europe_id, v_walkoffs_id, 'Western & Central Europe', 'Traditional cultural round-trip operators and high-end FIT.')
    ON CONFLICT (agency_id, market_name) DO NOTHING;

    INSERT INTO public.agency_markets (id, agency_id, market_name, description)
    VALUES
      (v_wt_australia_id, v_walkoffs_id, 'Australia & New Zealand', 'Oceania market targeting eco-tourism, wildlife, and tea country.')
    ON CONFLICT (agency_id, market_name) DO NOTHING;

    -- Hayleys Travels Markets
    INSERT INTO public.agency_markets (id, agency_id, market_name, description)
    VALUES
      (v_ht_global_id, v_hayleys_id, 'Corporate & Global Inbound', 'Global corporate accounts, groups, and incentives.')
    ON CONFLICT (agency_id, market_name) DO NOTHING;

    -- Red Dot Tours Markets
    INSERT INTO public.agency_markets (id, agency_id, market_name, description)
    VALUES
      (v_rd_uk_id, v_reddot_id, 'UK Tailor-made Direct', 'High-end bespoke itineraries and boutique property bookings.')
    ON CONFLICT (agency_id, market_name) DO NOTHING;

    -- Retrieve generated or existing market IDs
    SELECT id INTO v_jw_uk_id FROM public.agency_markets WHERE agency_id = v_jetwing_id AND market_name = 'UK & Ireland Market';
    SELECT id INTO v_jw_dach_id FROM public.agency_markets WHERE agency_id = v_jetwing_id AND market_name = 'DACH Market (Germany, Austria, Switzerland)';
    SELECT id INTO v_jw_india_id FROM public.agency_markets WHERE agency_id = v_jetwing_id AND market_name = 'India & Subcontinent Market';

    SELECT id INTO v_as_uk_id FROM public.agency_markets WHERE agency_id = v_aitken_id AND market_name = 'UK & Western Europe Market';
    SELECT id INTO v_as_gcc_id FROM public.agency_markets WHERE agency_id = v_aitken_id AND market_name = 'GCC & Middle East Market';

    SELECT id INTO v_wt_europe_id FROM public.agency_markets WHERE agency_id = v_walkoffs_id AND market_name = 'Western & Central Europe';
    SELECT id INTO v_rd_uk_id FROM public.agency_markets WHERE agency_id = v_reddot_id AND market_name = 'UK Tailor-made Direct';

    -- 3. Insert Agency Members (Contacts)
    -- Jetwing Contacts
    IF v_jw_uk_id IS NOT NULL THEN
      INSERT INTO public.agency_members (agency_id, market_id, full_name, email, phone, position, member_code, status)
      VALUES
        (v_jetwing_id, v_jw_uk_id, 'Sarith Gunawardena', 'sarith.g@jetwingtravels.com', '+94 77 123 4567', 'Senior Manager - UK Contracting', 'JET-UK-01', 'ACTIVE'),
        (v_jetwing_id, v_jw_uk_id, 'Eleanor Davies', 'eleanor.d@jetwingtravels.com', '+44 20 7946 0912', 'UK Inbound Specialist', 'JET-UK-02', 'ACTIVE');
    END IF;

    IF v_jw_dach_id IS NOT NULL THEN
      INSERT INTO public.agency_members (agency_id, market_id, full_name, email, phone, position, member_code, status)
      VALUES
        (v_jetwing_id, v_jw_dach_id, 'Hans Schmidt', 'hans.s@jetwingtravels.com', '+49 89 2018 7654', 'DACH Regional Director', 'JET-DA-01', 'ACTIVE');
    END IF;

    -- Aitken Spence Contacts
    IF v_as_uk_id IS NOT NULL THEN
      INSERT INTO public.agency_members (agency_id, market_id, full_name, email, phone, position, member_code, status)
      VALUES
        (v_aitken_id, v_as_uk_id, 'Janaka Perera', 'janaka.p@aitkenspence.lk', '+94 77 345 6789', 'Head of Contracting - Europe', 'AST-EU-01', 'ACTIVE');
    END IF;

    IF v_as_gcc_id IS NOT NULL THEN
      INSERT INTO public.agency_members (agency_id, market_id, full_name, email, phone, position, member_code, status)
      VALUES
        (v_aitken_id, v_as_gcc_id, 'Tariq Al-Mansoor', 'tariq.m@aitkenspence.lk', '+971 4 398 7654', 'Middle East Market Lead', 'AST-GC-01', 'ACTIVE');
    END IF;

    -- Walkers Tours Contact
    IF v_wt_europe_id IS NOT NULL THEN
      INSERT INTO public.agency_members (agency_id, market_id, full_name, email, phone, position, member_code, status)
      VALUES
        (v_walkoffs_id, v_wt_europe_id, 'Priya Senanayake', 'priya.s@walkerstours.com', '+94 71 890 1234', 'Contracting Executive', 'WKL-EU-01', 'ACTIVE');
    END IF;

    -- Red Dot Tours Contact
    IF v_rd_uk_id IS NOT NULL THEN
      INSERT INTO public.agency_members (agency_id, market_id, full_name, email, phone, position, member_code, status)
      VALUES
        (v_reddot_id, v_rd_uk_id, 'Oliver Martin', 'oliver@reddottours.com', '+44 20 7183 6372', 'Head of Product & Contracting', 'RDT-UK-01', 'ACTIVE');
    END IF;

END $$;

NOTIFY pgrst, 'reload schema';

