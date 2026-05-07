-- ============================================================
-- Multi-tenant base: restaurants + restaurant_members + RLS por membresía
-- Backfill datos existentes a un restaurante "Demo Luis" (id fijo).
-- Trigger auto-crea restaurante por signup futuro.
-- Aplicada en remoto 2026-05-07 via MCP apply_migration.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Tablas tenant
CREATE TABLE IF NOT EXISTS public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  setup_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.restaurants IS 'Tenant root. Cada signup crea uno via trigger on_auth_user_created_create_restaurant. setup_completed=false hasta que el cliente cierra el wizard.';

CREATE TABLE IF NOT EXISTS public.restaurant_members (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','admin','member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, restaurant_id)
);
COMMENT ON TABLE public.restaurant_members IS 'Membresia user->restaurant. role owner|admin|member. RLS de las tablas core filtra via user_restaurant_ids().';

CREATE INDEX IF NOT EXISTS restaurant_members_restaurant_idx ON public.restaurant_members(restaurant_id);

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_members ENABLE ROW LEVEL SECURITY;

-- 2. Helper SECURITY DEFINER para evitar recursion RLS al leer restaurant_members desde policies
CREATE OR REPLACE FUNCTION public.user_restaurant_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT restaurant_id FROM public.restaurant_members WHERE user_id = auth.uid()
$$;
COMMENT ON FUNCTION public.user_restaurant_ids() IS 'SECURITY DEFINER para evitar recursion RLS cuando policies de tablas core leen restaurant_members.';
REVOKE ALL ON FUNCTION public.user_restaurant_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_restaurant_ids() TO authenticated;

-- 3. Policies en tablas tenant
DROP POLICY IF EXISTS restaurants_select_own ON public.restaurants;
CREATE POLICY restaurants_select_own ON public.restaurants
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.user_restaurant_ids()));

DROP POLICY IF EXISTS restaurants_update_own ON public.restaurants;
CREATE POLICY restaurants_update_own ON public.restaurants
  FOR UPDATE TO authenticated
  USING (id IN (SELECT public.user_restaurant_ids()))
  WITH CHECK (id IN (SELECT public.user_restaurant_ids()));

DROP POLICY IF EXISTS restaurant_members_select_own ON public.restaurant_members;
CREATE POLICY restaurant_members_select_own ON public.restaurant_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR restaurant_id IN (SELECT public.user_restaurant_ids()));

-- INSERT/DELETE de restaurants y restaurant_members SOLO via trigger SECURITY DEFINER o service_role.

-- 4. Restaurante demo + membership Luis (id fijo para idempotencia)
INSERT INTO public.restaurants (id, name, owner_user_id, setup_completed)
VALUES ('11111111-1111-1111-1111-111111111111', 'Demo Luis', '13fe3619-3578-4dd5-9c4a-54c63a358eca', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.restaurant_members (user_id, restaurant_id, role)
VALUES ('13fe3619-3578-4dd5-9c4a-54c63a358eca', '11111111-1111-1111-1111-111111111111', 'owner')
ON CONFLICT DO NOTHING;

-- 5. Anadir restaurant_id a las 8 tablas core (nullable, backfill, NOT NULL)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.product_prices ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.recipe_ingredients ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;

UPDATE public.products SET restaurant_id = '11111111-1111-1111-1111-111111111111' WHERE restaurant_id IS NULL;
UPDATE public.product_prices SET restaurant_id = '11111111-1111-1111-1111-111111111111' WHERE restaurant_id IS NULL;
UPDATE public.invoices SET restaurant_id = '11111111-1111-1111-1111-111111111111' WHERE restaurant_id IS NULL;
UPDATE public.invoice_items SET restaurant_id = '11111111-1111-1111-1111-111111111111' WHERE restaurant_id IS NULL;
UPDATE public.recipes SET restaurant_id = '11111111-1111-1111-1111-111111111111' WHERE restaurant_id IS NULL;
UPDATE public.recipe_ingredients SET restaurant_id = '11111111-1111-1111-1111-111111111111' WHERE restaurant_id IS NULL;
UPDATE public.alerts SET restaurant_id = '11111111-1111-1111-1111-111111111111' WHERE restaurant_id IS NULL;
UPDATE public.subscriptions SET restaurant_id = '11111111-1111-1111-1111-111111111111' WHERE restaurant_id IS NULL;

ALTER TABLE public.products ALTER COLUMN restaurant_id SET NOT NULL;
ALTER TABLE public.product_prices ALTER COLUMN restaurant_id SET NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN restaurant_id SET NOT NULL;
ALTER TABLE public.invoice_items ALTER COLUMN restaurant_id SET NOT NULL;
ALTER TABLE public.recipes ALTER COLUMN restaurant_id SET NOT NULL;
ALTER TABLE public.recipe_ingredients ALTER COLUMN restaurant_id SET NOT NULL;
ALTER TABLE public.alerts ALTER COLUMN restaurant_id SET NOT NULL;
ALTER TABLE public.subscriptions ALTER COLUMN restaurant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS products_restaurant_idx ON public.products(restaurant_id);
CREATE INDEX IF NOT EXISTS product_prices_restaurant_idx ON public.product_prices(restaurant_id);
CREATE INDEX IF NOT EXISTS invoices_restaurant_idx ON public.invoices(restaurant_id);
CREATE INDEX IF NOT EXISTS invoice_items_restaurant_idx ON public.invoice_items(restaurant_id);
CREATE INDEX IF NOT EXISTS recipes_restaurant_idx ON public.recipes(restaurant_id);
CREATE INDEX IF NOT EXISTS recipe_ingredients_restaurant_idx ON public.recipe_ingredients(restaurant_id);
CREATE INDEX IF NOT EXISTS alerts_restaurant_idx ON public.alerts(restaurant_id);
CREATE INDEX IF NOT EXISTS subscriptions_restaurant_idx ON public.subscriptions(restaurant_id);

-- 6. Reemplazar policies de las 8 tablas core por filtrado por restaurant_id
DROP POLICY IF EXISTS subscriptions_select_own ON public.subscriptions;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY['products','product_prices','invoices','invoice_items','recipes','recipe_ingredients','alerts','subscriptions'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_tenant_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_tenant_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_tenant_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_tenant_delete', t);

    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (restaurant_id IN (SELECT public.user_restaurant_ids()))', t || '_tenant_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (restaurant_id IN (SELECT public.user_restaurant_ids()))', t || '_tenant_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (restaurant_id IN (SELECT public.user_restaurant_ids())) WITH CHECK (restaurant_id IN (SELECT public.user_restaurant_ids()))', t || '_tenant_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (restaurant_id IN (SELECT public.user_restaurant_ids()))', t || '_tenant_delete', t);
  END LOOP;
END $$;

-- 7. Trigger auto-crear restaurante en signup futuro
CREATE OR REPLACE FUNCTION public.handle_new_user_create_restaurant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_restaurant_id uuid;
  v_name text;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'restaurant_name', 'Mi restaurante');
  INSERT INTO public.restaurants (name, owner_user_id) VALUES (v_name, NEW.id) RETURNING id INTO v_restaurant_id;
  INSERT INTO public.restaurant_members (user_id, restaurant_id, role) VALUES (NEW.id, v_restaurant_id, 'owner');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created_create_restaurant ON auth.users;
CREATE TRIGGER on_auth_user_created_create_restaurant
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_create_restaurant();
