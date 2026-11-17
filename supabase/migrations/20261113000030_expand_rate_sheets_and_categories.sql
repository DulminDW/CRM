-- Migration 30: Expand hotel_rate_configs to support 4 Rate Sheets (HOTEL_CONTRACT, RED, GREEN, YELLOW)
-- and Dynamic Matrix (Room / Meal plans: Single, Double, Triple, Quad x BB, HB, FB, etc.)

ALTER TABLE public.hotel_rate_configs DROP CONSTRAINT IF EXISTS chk_rate_config_category;

ALTER TABLE public.hotel_rate_configs ADD CONSTRAINT chk_rate_config_category 
CHECK (rate_category IN ('HOTEL_CONTRACT', 'CONTRACT', 'RED', 'GREEN', 'YELLOW', 'CUSTOM'));

ALTER TABLE public.hotel_rate_configs ADD COLUMN IF NOT EXISTS room_type VARCHAR(100) DEFAULT 'Deluxe Room';
ALTER TABLE public.hotel_rate_configs ADD COLUMN IF NOT EXISTS rate_matrix JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.hotel_rate_configs ADD COLUMN IF NOT EXISTS supplements JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.hotel_rate_configs ADD COLUMN IF NOT EXISTS tax_details TEXT DEFAULT NULL;
ALTER TABLE public.hotel_rate_configs ADD COLUMN IF NOT EXISTS conditions TEXT DEFAULT NULL;
ALTER TABLE public.hotel_rate_configs ADD COLUMN IF NOT EXISTS document_url TEXT DEFAULT NULL;

COMMENT ON COLUMN public.hotel_rate_configs.rate_matrix IS 'Dynamic room occupancy and meal plan grid (Single, Double, Triple, Quad vs BB, HB, FB)';
COMMENT ON COLUMN public.hotel_rate_configs.supplements IS 'Single reduction, triple supplement, child rates, extra bed supplements';

