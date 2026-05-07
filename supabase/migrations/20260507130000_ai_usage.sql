-- ============================================================
-- Tabla ai_usage: tracking de llamadas a Anthropic por endpoint.
-- Multi-tenant: scope al restaurante via RLS. Insert desde service_role
-- en endpoints (sin auth.uid() en serverless), por eso la columna
-- restaurant_id no se rellena con trigger; se pasa explicito desde
-- el endpoint que invoca a Anthropic.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  model text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cached_tokens integer NOT NULL DEFAULT 0,
  cost_eur numeric(10, 6) NOT NULL DEFAULT 0,
  duration_ms integer,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_restaurant_created_idx ON public.ai_usage(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_created_idx ON public.ai_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_endpoint_idx ON public.ai_usage(endpoint);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- El admin (centro de control) lee con service_role y bypasea RLS.
-- Si en el futuro queremos exponer al cliente "su consumo IA", crear policy SELECT con user_restaurant_ids().
DROP POLICY IF EXISTS ai_usage_tenant_select ON public.ai_usage;
CREATE POLICY ai_usage_tenant_select ON public.ai_usage
  FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT public.user_restaurant_ids()));

COMMENT ON TABLE public.ai_usage IS 'Snapshot por llamada a Anthropic. Insert desde endpoints serverless con restaurant_id explicito (auth.uid no esta disponible en service_role).';
