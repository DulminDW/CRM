-- ==============================================================================
-- WINDOW COMPANIES CRM — MIGRATION: 20261116000031_agency_visits_and_discussions.sql
-- Description: Tracking field salesman agency visits, discussions, hotel pitches,
--              follow-ups, and linking discussions directly to hotels.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.agency_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salesman_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    agency_id UUID NOT NULL REFERENCES public.travel_agencies(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.agency_members(id) ON DELETE SET NULL,
    contact_person_name VARCHAR(255),
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    visit_time TIME DEFAULT CURRENT_TIME,
    discussion_notes TEXT NOT NULL,
    follow_up_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.agency_visit_hotels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES public.agency_visits(id) ON DELETE CASCADE,
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    notes VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_visit_hotel UNIQUE (visit_id, hotel_id)
);

CREATE INDEX IF NOT EXISTS idx_agency_visits_salesman ON public.agency_visits(salesman_id);
CREATE INDEX IF NOT EXISTS idx_agency_visits_agency ON public.agency_visits(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_visits_date ON public.agency_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_agency_visit_hotels_hotel ON public.agency_visit_hotels(hotel_id);

-- Enable RLS
ALTER TABLE public.agency_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_visit_hotels ENABLE ROW LEVEL SECURITY;

-- Policies for agency_visits
DROP POLICY IF EXISTS "Authenticated users can view agency visits" ON public.agency_visits;
CREATE POLICY "Authenticated users can view agency visits"
    ON public.agency_visits FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can create agency visits" ON public.agency_visits;
CREATE POLICY "Authenticated users can create agency visits"
    ON public.agency_visits FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = salesman_id OR EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'ADMIN'
    ));

DROP POLICY IF EXISTS "Salesman or Admin can update their visits" ON public.agency_visits;
CREATE POLICY "Salesman or Admin can update their visits"
    ON public.agency_visits FOR UPDATE
    TO authenticated
    USING (auth.uid() = salesman_id OR EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'ADMIN'
    ));

DROP POLICY IF EXISTS "Admin can delete visits" ON public.agency_visits;
CREATE POLICY "Admin can delete visits"
    ON public.agency_visits FOR DELETE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'ADMIN'
    ));

-- Policies for agency_visit_hotels
DROP POLICY IF EXISTS "Authenticated users can view visit hotels" ON public.agency_visit_hotels;
CREATE POLICY "Authenticated users can view visit hotels"
    ON public.agency_visit_hotels FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert visit hotels" ON public.agency_visit_hotels;
CREATE POLICY "Authenticated users can insert visit hotels"
    ON public.agency_visit_hotels FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete visit hotels" ON public.agency_visit_hotels;
CREATE POLICY "Authenticated users can delete visit hotels"
    ON public.agency_visit_hotels FOR DELETE
    TO authenticated
    USING (true);

