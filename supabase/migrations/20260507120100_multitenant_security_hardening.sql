-- ============================================================
-- Hardening tras multitenant_base: revocar EXECUTE de funciones
-- SECURITY DEFINER expuestas via PostgREST RPC.
-- Aplicada en remoto 2026-05-07 via MCP apply_migration.
-- ============================================================

-- 1. handle_new_user_create_restaurant: solo trigger, nadie debe llamarla via RPC
REVOKE EXECUTE ON FUNCTION public.handle_new_user_create_restaurant() FROM PUBLIC, anon, authenticated;

-- 2. user_restaurant_ids: necesario para RLS policies, solo authenticated; revocar anon explicito
REVOKE EXECUTE ON FUNCTION public.user_restaurant_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_restaurant_ids() TO authenticated;

-- 3. Fix preexistente: touch_subscriptions_updated_at sin search_path
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'touch_subscriptions_updated_at' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.touch_subscriptions_updated_at() SET search_path = public, pg_temp';
  END IF;
END $$;
