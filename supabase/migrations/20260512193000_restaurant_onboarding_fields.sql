-- Extra setup fields for the first-run restaurant wizard.
-- Nullable by design: existing restaurants keep working and users can skip setup.

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS business_type text,
  ADD COLUMN IF NOT EXISTS target_food_cost_percentage numeric DEFAULT 35,
  ADD COLUMN IF NOT EXISTS onboarding_goal text;

COMMENT ON COLUMN public.restaurants.business_type IS 'Restaurant profile selected in setup wizard.';
COMMENT ON COLUMN public.restaurants.target_food_cost_percentage IS 'Default target food cost percentage selected in setup wizard.';
COMMENT ON COLUMN public.restaurants.onboarding_goal IS 'First action selected in setup wizard: invoice, recipe, products, dashboard.';
