-- Index foreign keys flagged by Supabase advisor.
-- Idempotent and safe to run more than once.

CREATE INDEX IF NOT EXISTS alerts_product_id_idx
  ON public.alerts(product_id);

CREATE INDEX IF NOT EXISTS alerts_recipe_id_idx
  ON public.alerts(recipe_id);

CREATE INDEX IF NOT EXISTS recipe_ingredients_product_id_idx
  ON public.recipe_ingredients(product_id);

CREATE INDEX IF NOT EXISTS restaurants_owner_user_id_idx
  ON public.restaurants(owner_user_id);
