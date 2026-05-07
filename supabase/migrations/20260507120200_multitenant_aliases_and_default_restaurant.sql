-- ============================================================
-- 1) supplier_aliases con restaurant_id desde el inicio
-- 2) Trigger BEFORE INSERT generico que rellena restaurant_id
--    desde auth.uid() si llega NULL (asume 1 user = 1 restaurant)
-- Aplicada en remoto 2026-05-07 via MCP apply_migration.
-- ============================================================

-- 1. supplier_aliases (no existia)
CREATE TABLE IF NOT EXISTS public.supplier_aliases (
  alias text NOT NULL,
  canonical text NOT NULL,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (restaurant_id, alias)
);
CREATE INDEX IF NOT EXISTS supplier_aliases_restaurant_idx ON public.supplier_aliases(restaurant_id);
ALTER TABLE public.supplier_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS supplier_aliases_tenant_select ON public.supplier_aliases;
DROP POLICY IF EXISTS supplier_aliases_tenant_insert ON public.supplier_aliases;
DROP POLICY IF EXISTS supplier_aliases_tenant_update ON public.supplier_aliases;
DROP POLICY IF EXISTS supplier_aliases_tenant_delete ON public.supplier_aliases;
CREATE POLICY supplier_aliases_tenant_select ON public.supplier_aliases FOR SELECT TO authenticated USING (restaurant_id IN (SELECT public.user_restaurant_ids()));
CREATE POLICY supplier_aliases_tenant_insert ON public.supplier_aliases FOR INSERT TO authenticated WITH CHECK (restaurant_id IN (SELECT public.user_restaurant_ids()));
CREATE POLICY supplier_aliases_tenant_update ON public.supplier_aliases FOR UPDATE TO authenticated USING (restaurant_id IN (SELECT public.user_restaurant_ids())) WITH CHECK (restaurant_id IN (SELECT public.user_restaurant_ids()));
CREATE POLICY supplier_aliases_tenant_delete ON public.supplier_aliases FOR DELETE TO authenticated USING (restaurant_id IN (SELECT public.user_restaurant_ids()));

-- 2. Helper SECURITY DEFINER: primer restaurante del usuario actual (1:1 hoy)
CREATE OR REPLACE FUNCTION public.current_user_restaurant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT restaurant_id FROM public.restaurant_members WHERE user_id = auth.uid() LIMIT 1
$$;
COMMENT ON FUNCTION public.current_user_restaurant_id() IS 'Devuelve el primer restaurant_id del user actual. Usado por el trigger BEFORE INSERT para rellenar la columna si llega NULL.';
REVOKE EXECUTE ON FUNCTION public.current_user_restaurant_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_restaurant_id() TO authenticated;

-- 3. Trigger BEFORE INSERT generico
CREATE OR REPLACE FUNCTION public.fill_restaurant_id_default()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.restaurant_id IS NULL THEN
    NEW.restaurant_id := public.current_user_restaurant_id();
  END IF;
  RETURN NEW;
END $$;
COMMENT ON FUNCTION public.fill_restaurant_id_default() IS 'BEFORE INSERT: rellena restaurant_id desde el membership del user actual si viene NULL. Para INSERTs desde service_role (sin auth.uid), restaurant_id debe pasarse explicito.';

-- 4. Crear el trigger en las 9 tablas (8 core + supplier_aliases)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['products','product_prices','invoices','invoice_items','recipes','recipe_ingredients','alerts','subscriptions','supplier_aliases'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS fill_restaurant_id ON public.%I', t);
    EXECUTE format('CREATE TRIGGER fill_restaurant_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fill_restaurant_id_default()', t);
  END LOOP;
END $$;
