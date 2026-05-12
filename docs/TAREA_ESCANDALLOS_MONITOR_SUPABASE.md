# TAREA: EscandallosV2 Monitor — Migración Supabase + Helpers App
> Plan para Codex. Lee `CLAUDE.md` en la raíz del repo COMPLETO antes de tocar código.
> Fecha: 2026-05-12 | Autor: Luis (LumoTech)
> **Ejecutar ANTES que `TAREA_ESCANDALLOS_MONITOR.md` del monorepo (Centro Control depende de estas tablas).**

---

## Objetivo

1. Crear las tablas de monitorización en **Supabase LumoTech** (`alevfitmkzzgtmnihtkf`).
2. Añadir helpers `trackEvent` / `trackError` / `createTicket` en EscandallosAppV2.
3. Instrumentar los 8 puntos de alto valor de la app.
4. Añadir formulario de soporte en la pantalla de perfil/settings.

---

## MCP disponible

Usar `mcp__supabase-lumotech__*` para aplicar migraciones y verificar tablas.
- `mcp__supabase-lumotech__list_tables` → verificar estado actual
- `mcp__supabase-lumotech__apply_migration` → aplicar SQL
- `mcp__supabase-lumotech__execute_sql` → verificar post-migración

---

## FASE 1 — Migración Supabase (≈15K tokens)

### MT1.1 — Verificar tablas existentes

Antes de aplicar nada, listar tablas con `mcp__supabase-lumotech__list_tables`.
Verificar que NO existen ya: `app_events`, `app_errors`, `support_tickets`,
`support_messages`, `app_health_checks`.

Si alguna existe parcialmente, NO la dropar. Adaptar la migración con `IF NOT EXISTS`.

### MT1.2 — Aplicar migración

Crear archivo `supabase/migrations/20260512000000_monitor_tables.sql` y aplicar:

```sql
-- =============================================
-- MONITOR TABLES — EscandallosV2
-- =============================================

-- 1. app_events
CREATE TABLE IF NOT EXISTS public.app_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name    text NOT NULL,
  route         text,
  source        text DEFAULT 'escandallos_app',
  metadata      jsonb DEFAULT '{}'::jsonb,
  app_version   text,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_events_restaurant
  ON public.app_events (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_events_user
  ON public.app_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_events_name
  ON public.app_events (event_name, created_at DESC);

ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden insertar sus propios eventos (via service_role desde helpers)
-- Centro Control lee todo via service_role
-- Sin policy de SELECT para anon/authenticated → solo service_role puede leer
CREATE POLICY "service_role_all_app_events"
  ON public.app_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Los propios usuarios pueden insertar sus eventos
CREATE POLICY "users_insert_own_app_events"
  ON public.app_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());


-- 2. app_errors
CREATE TABLE IF NOT EXISTS public.app_errors (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  severity      text NOT NULL DEFAULT 'error',  -- 'critical' | 'error' | 'warning'
  error_type    text,
  message       text NOT NULL,
  stack         text,
  route         text,
  endpoint      text,
  metadata      jsonb DEFAULT '{}'::jsonb,
  resolved_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
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
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'open',      -- open | in_progress | waiting_customer | resolved | closed
  priority      text NOT NULL DEFAULT 'normal',    -- low | normal | high | urgent
  subject       text NOT NULL,
  message       text NOT NULL,
  route         text,
  metadata      jsonb DEFAULT '{}'::jsonb,
  assigned_to   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
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

-- Usuarios ven sus propios tickets
CREATE POLICY "users_own_tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users_insert_own_ticket"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());


-- 4. support_messages
CREATE TABLE IF NOT EXISTS public.support_messages (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id      uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_role    text NOT NULL,   -- 'customer' | 'admin' | 'system'
  message        text NOT NULL,
  metadata       jsonb DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
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
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,   -- supabase | vercel_api | stripe_webhook | ocr_ai | storage
  status       text NOT NULL,   -- ok | degraded | down
  latency_ms   integer,
  message      text,
  metadata     jsonb DEFAULT '{}'::jsonb,
  checked_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_health_service
  ON public.app_health_checks (service_name, checked_at DESC);

ALTER TABLE public.app_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_health"
  ON public.app_health_checks FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### MT1.3 — Verificar post-migración

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('app_events','app_errors','support_tickets','support_messages','app_health_checks');
-- Debe devolver 5 filas
```

---

## FASE 2 — Helpers de telemetría (≈20K tokens)

**Repo:** EscandallosAppV2 (Next.js en `/Users/luis/Developer/EscandallosAppV2`)

### MT2.1 — `src/utils/telemetry/trackEvent.ts`

**Requisitos:**
- Nunca bloquear la UX — fire & forget con `.catch(() => {})`.
- No guardar datos sensibles (IBAN, tokens, JWT, facturas completas).
- Solo llamar desde CLIENT side (tiene acceso al `supabaseClient` del usuario autenticado).
- Incluir `restaurant_id` automáticamente desde el contexto de sesión.

```ts
// src/utils/telemetry/trackEvent.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export type TrackableEvent =
  | 'user_logged_in'
  | 'setup_started'
  | 'setup_completed'
  | 'invoice_upload_started'
  | 'invoice_upload_completed'
  | 'invoice_upload_failed'
  | 'ocr_started'
  | 'ocr_completed'
  | 'ocr_failed'
  | 'product_created'
  | 'recipe_created'
  | 'recipe_cost_calculated'
  | 'alert_created'
  | 'stripe_checkout_started'
  | 'subscription_active'
  | 'subscription_failed'
  | 'support_ticket_created';

export interface TrackEventPayload {
  restaurantId?: string;
  route?: string;
  metadata?: Record<string, string | number | boolean | null>;
  appVersion?: string;
}

export function trackEvent(
  eventName: TrackableEvent,
  payload: TrackEventPayload = {}
): void {
  // Fire & forget — nunca await en el callsite
  (async () => {
    try {
      const supabase = createClientComponentClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('app_events').insert({
        user_id: user.id,
        restaurant_id: payload.restaurantId ?? null,
        event_name: eventName,
        route: payload.route ?? (typeof window !== 'undefined' ? window.location.pathname : null),
        source: 'escandallos_app',
        metadata: sanitizeMetadata(payload.metadata),
        app_version: payload.appVersion ?? null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : null,
      });
    } catch {
      // telemetría nunca rompe la app
    }
  })();
}

function sanitizeMetadata(
  meta: Record<string, string | number | boolean | null> | undefined
): Record<string, string | number | boolean | null> {
  if (!meta) return {};
  const BLOCKED_KEYS = ['iban', 'token', 'jwt', 'password', 'secret', 'key'];
  return Object.fromEntries(
    Object.entries(meta).filter(([k]) =>
      !BLOCKED_KEYS.some(b => k.toLowerCase().includes(b))
    )
  );
}
```

**IMPORTANTE:** Verificar cómo se importa el cliente Supabase en EscandallosAppV2.
Si usa `createClientComponentClient` de `@supabase/auth-helpers-nextjs` o de `@supabase/ssr`,
adaptar el import. No cambiar cómo se obtiene el cliente — seguir el patrón del repo.

### MT2.2 — `src/utils/telemetry/trackError.ts`

```ts
// src/utils/telemetry/trackError.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export type ErrorSeverity = 'critical' | 'error' | 'warning';

export interface TrackErrorPayload {
  restaurantId?: string;
  severity?: ErrorSeverity;
  errorType?: string;
  message: string;
  stack?: string;
  route?: string;
  endpoint?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export function trackError(payload: TrackErrorPayload): void {
  (async () => {
    try {
      const supabase = createClientComponentClient();
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('app_errors').insert({
        user_id: user?.id ?? null,
        restaurant_id: payload.restaurantId ?? null,
        severity: payload.severity ?? 'error',
        error_type: payload.errorType ?? null,
        message: payload.message.slice(0, 1000), // limitar tamaño
        stack: payload.stack?.slice(0, 3000) ?? null,
        route: payload.route ?? (typeof window !== 'undefined' ? window.location.pathname : null),
        endpoint: payload.endpoint ?? null,
        metadata: payload.metadata ?? {},
      });
    } catch {
      // silencioso siempre
    }
  })();
}
```

### MT2.3 — `src/utils/support/createTicket.ts`

```ts
// src/utils/support/createTicket.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export interface CreateTicketPayload {
  restaurantId: string;
  subject: string;
  message: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  includeTechContext?: boolean; // checkbox opcional del usuario
}

export interface CreateTicketResult {
  success: boolean;
  ticketId?: string;
  error?: string;
}

export async function createTicket(
  payload: CreateTicketPayload
): Promise<CreateTicketResult> {
  try {
    const supabase = createClientComponentClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return { success: false, error: 'No autenticado' };

    const techContext = payload.includeTechContext
      ? {
          route: typeof window !== 'undefined' ? window.location.pathname : null,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : null,
        }
      : {};

    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        restaurant_id: payload.restaurantId,
        user_id: user.id,
        subject: payload.subject,
        message: payload.message,
        priority: payload.priority ?? 'normal',
        route: typeof window !== 'undefined' ? window.location.pathname : null,
        metadata: techContext,
      })
      .select('id')
      .single();

    if (error) return { success: false, error: error.message };

    // Primer mensaje en el hilo
    await supabase.from('support_messages').insert({
      ticket_id: data.id,
      author_user_id: user.id,
      author_role: 'customer',
      message: payload.message,
    });

    return { success: true, ticketId: data.id };
  } catch (e) {
    return { success: false, error: 'Error inesperado' };
  }
}
```

---

## FASE 3 — Instrumentación puntos clave (≈15K tokens)

Añadir llamadas `trackEvent(...)` en estos 8 puntos. Buscar el código existente y añadir
la llamada inmediatamente **después** del evento exitoso (no antes, no si falla).

### Puntos a instrumentar

| Punto | Archivo probable | Evento |
|-------|-----------------|--------|
| Login correcto | auth callback o page de login | `user_logged_in` |
| Setup iniciado | setup wizard primer paso | `setup_started` |
| Setup completado | setup wizard último paso | `setup_completed` |
| Upload factura iniciado | componente upload | `invoice_upload_started` |
| Upload factura completado | tras upload exitoso | `invoice_upload_completed` |
| Upload factura fallido | catch del upload | `invoice_upload_failed` |
| OCR iniciado | antes de llamar API OCR | `ocr_started` |
| OCR completado | tras OCR exitoso | `ocr_completed` |
| OCR fallido | catch OCR | `ocr_failed` |

Para cada punto, la llamada es:
```ts
trackEvent('invoice_upload_completed', {
  restaurantId: currentRestaurantId,
  metadata: {
    // solo datos operativos NO sensibles
    invoice_id: invoice.id,
    // NO: IBAN, datos fiscales completos, texto crudo de la factura
  },
});
```

**Importante:** Buscar los archivos existentes en el repo antes de asumir rutas.
Usar `find` o `grep` para localizar los handlers de upload/OCR/auth.

### MT3.1 — Instrumentar login

Buscar donde se hace `supabase.auth.signInWithPassword` o el callback de auth.
Añadir `trackEvent('user_logged_in', { restaurantId: ... })` tras login exitoso.

### MT3.2 — Instrumentar upload/OCR

Buscar el componente o API route de upload de facturas.
Añadir los 3 eventos: `started`, `completed`, `failed` con try/catch claro.

### MT3.3 — Instrumentar setup

Buscar el setup wizard (probablemente `/setup/page.tsx` o similar).
Añadir `setup_started` en el primer paso y `setup_completed` cuando `setup_completed=true`.

---

## FASE 4 — Formulario de soporte in-app (≈20K tokens)

### MT4.1 — Localizar pantalla de perfil/settings

Buscar en `src/app/` la ruta de perfil o settings.
Si existe, añadir sección "Soporte" al final.
Si no existe, crear botón flotante mínimo solo en `/dashboard`.

### MT4.2 — Componente `SupportTicketForm`

```tsx
// src/components/support/SupportTicketForm.tsx
'use client';

import { useState } from 'react';
import { createTicket } from '@/utils/support/createTicket';

interface Props {
  restaurantId: string;
}

export function SupportTicketForm({ restaurantId }: Props) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [includeTech, setIncludeTech] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setLoading(true);
    const res = await createTicket({
      restaurantId,
      subject: subject.trim(),
      message: message.trim(),
      includeTechContext: includeTech,
    });
    setResult(res);
    setLoading(false);
    if (res.success) {
      setSubject('');
      setMessage('');
    }
  }

  if (result?.success) {
    return (
      <div style={{ padding: 16, background: 'rgba(0,200,100,0.08)', borderRadius: 8, border: '1px solid rgba(0,200,100,0.2)' }}>
        <p style={{ margin: 0, fontSize: 14 }}>
          ✓ Ticket enviado. Te responderemos pronto.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input
        value={subject}
        onChange={e => setSubject(e.target.value)}
        placeholder="Asunto"
        maxLength={200}
        required
        style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.04)', color: 'inherit', fontSize: 14 }}
      />
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Describe el problema..."
        rows={5}
        maxLength={2000}
        required
        style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.04)', color: 'inherit', fontSize: 14, resize: 'vertical' }}
      />
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.55)', cursor: 'pointer' }}>
        <input type="checkbox" checked={includeTech} onChange={e => setIncludeTech(e.target.checked)} />
        Incluir contexto técnico (ruta, dispositivo) para ayudar al soporte
      </label>
      {result?.error && (
        <p style={{ margin: 0, fontSize: 13, color: '#f87171' }}>{result.error}</p>
      )}
      <button
        type="submit"
        disabled={loading || !subject.trim() || !message.trim()}
        style={{
          padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500,
          background: loading ? 'rgba(255,255,255,0.05)' : 'rgba(100,180,255,0.15)',
          color: loading ? 'rgba(255,255,255,0.3)' : 'rgba(100,180,255,1)',
          border: '1px solid rgba(100,180,255,0.2)',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Enviando...' : 'Enviar ticket de soporte'}
      </button>
    </form>
  );
}
```

### MT4.3 — Integrar en perfil/settings

Añadir la sección en la pantalla de perfil:
```tsx
import { SupportTicketForm } from '@/components/support/SupportTicketForm';

// En la página de perfil, al final:
<section>
  <h3>Contactar con soporte</h3>
  <p style={{ fontSize: 13, opacity: 0.6 }}>
    ¿Algo no funciona bien? Cuéntanos el problema y te ayudamos.
  </p>
  <SupportTicketForm restaurantId={restaurantId} />
</section>
```

---

## Resumen de archivos

### Nuevos en EscandallosAppV2
```
supabase/migrations/20260512000000_monitor_tables.sql
src/utils/telemetry/trackEvent.ts
src/utils/telemetry/trackError.ts
src/utils/support/createTicket.ts
src/components/support/SupportTicketForm.tsx
```

### Modificados en EscandallosAppV2
```
src/app/(auth)/login/page.tsx (o donde esté el auth callback)   ← +trackEvent login
src/app/(app)/setup/page.tsx (o setup wizard)                   ← +trackEvent setup
[componente upload facturas]                                     ← +trackEvent upload/OCR
[página de perfil/settings]                                      ← +SupportTicketForm
```

---

## Presupuesto de tokens estimado

| Fase | Descripción | Tokens est. |
|------|-------------|-------------|
| F1   | Migración Supabase | ~15K |
| F2.1 | Helper trackEvent | ~8K |
| F2.2 | Helper trackError | ~6K |
| F2.3 | Helper createTicket | ~8K |
| F3   | Instrumentación 8 puntos | ~15K |
| F4   | Formulario soporte | ~12K |
| **TOTAL** | | **~64K** |

---

## Criterios de aceptación

- [ ] 5 tablas creadas en Supabase LumoTech con RLS activado
- [ ] `trackEvent('user_logged_in', {...})` no rompe la app si Supabase falla
- [ ] `trackError(...)` idem — completamente silencioso en error
- [ ] `createTicket(...)` devuelve `{ success: false, error: '...' }` en error, no lanza excepción
- [ ] Formulario de soporte visible en perfil — no en cada pantalla
- [ ] Al enviar ticket → fila en `support_tickets` + fila en `support_messages`
- [ ] `npx tsc --noEmit` → 0 errores en EscandallosAppV2
- [ ] No se guardan datos sensibles (IBAN, tokens, texto crudo facturas) en metadata

---

## Orden de ejecución recomendado

1. **Este repo primero** (Supabase + helpers + soporte)
2. **Luego** `TAREA_ESCANDALLOS_MONITOR.md` en el monorepo (Centro Control leerá las tablas ya existentes)

---

## Notas para Codex

- El patrón de import del cliente Supabase puede ser diferente al del snippet arriba.
  **Antes de escribir los helpers, buscar cómo se importa en los archivos existentes** (ej.
  `grep -r "createClientComponentClient\|createBrowserClient\|supabase" src/ --include="*.ts" --include="*.tsx" -l`).
  Usar exactamente el mismo patrón.
- `restaurantId` debe venir del contexto de la sesión. Buscar cómo se obtiene en otros
  componentes (probablemente del `AuthContext` o desde `restaurant_members`).
- Las tablas tienen RLS. Los helpers usan el cliente autenticado del usuario, por lo que
  las políticas `users_insert_own_*` permiten la operación. Correcto por diseño.
