-- =============================================
-- MONITOR TABLES - EscandallosV2
-- =============================================

-- 1. app_events
CREATE TABLE IF NOT EXISTS public.app_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  route text,
  source text DEFAULT 'escandallos_app',
  metadata jsonb DEFAULT '{}'::jsonb,
  app_version text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_events_restaurant
  ON public.app_events (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_events_user
  ON public.app_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_events_name
  ON public.app_events (event_name, created_at DESC);

ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_app_events"
  ON public.app_events FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "users_insert_own_app_events"
  ON public.app_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 2. app_errors
CREATE TABLE IF NOT EXISTS public.app_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  severity text NOT NULL DEFAULT 'error',
  error_type text,
  message text NOT NULL,
  stack text,
  route text,
  endpoint text,
  metadata jsonb DEFAULT '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_errors_created
  ON public.app_errors (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_errors_restaurant
  ON public.app_errors (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_errors_severity
  ON public.app_errors (severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_errors_resolved
  ON public.app_errors (resolved_at);

ALTER TABLE public.app_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_app_errors"
  ON public.app_errors FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "users_insert_own_app_errors"
  ON public.app_errors FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 3. support_tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  subject text NOT NULL,
  message text NOT NULL,
  route text,
  metadata jsonb DEFAULT '{}'::jsonb,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_restaurant
  ON public.support_tickets (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status
  ON public.support_tickets (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user
  ON public.support_tickets (user_id, created_at DESC);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_support_tickets"
  ON public.support_tickets FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "users_own_tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users_insert_own_ticket"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 4. support_messages
CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_role text NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket
  ON public.support_messages (ticket_id, created_at ASC);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_support_messages"
  ON public.support_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "users_see_own_ticket_messages"
  ON public.support_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "users_insert_own_ticket_message"
  ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (
    author_role = 'customer' AND
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

-- 5. app_health_checks
CREATE TABLE IF NOT EXISTS public.app_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  status text NOT NULL,
  latency_ms integer,
  message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  checked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_health_service
  ON public.app_health_checks (service_name, checked_at DESC);

ALTER TABLE public.app_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_health"
  ON public.app_health_checks FOR ALL TO service_role USING (true) WITH CHECK (true);
